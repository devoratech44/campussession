// backend/src/services/professeurService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const time = require('../utils/timeUtils');
const { Seance, Enseignement, EmploiDuTemps } = require('../models');
const ens = require('./enseignementService');
const sessions = require('./sessionService');

const S = cfg.sessions;
const P = cfg.professeur;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const n = (v) => Number(v) || 0;
const pad = (x) => String(x).padStart(2, '0');
// Le serveur tourne en GMT (APP_TIMEZONE)
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const atMinutes = (dateStr, minutes) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes, 0, 0);
};

async function today(user, now) {
  const rows = await Seance.findAll({
    where: { dateSeance: dateKey(now) },
    attributes: sessions.SEANCE_ATTRS,
    include: [{ model: Enseignement, as: 'enseignement', required: true, where: { professeurId: user.id }, include: ens.INCLUDES }],
    order: [['heureDebut', 'ASC'], ['id', 'ASC']],
  });
  const counts = await sessions.countsFor(rows);
  return rows.map((s) => sessions.serializeSeance(s, counts[s.id]));
}

async function upcoming(user, now, todaySeances) {
  const list = await Enseignement.findAll({ where: { professeurId: user.id }, include: ens.INCLUDES });
  if (!list.length) return [];
  const byId = new Map(list.map((e) => [e.id, e]));
  const slots = await EmploiDuTemps.findAll({ where: { enseignementId: [...byId.keys()] } });
  const started = new Set(todaySeances.filter((s) => s.creneauId).map((s) => `${s.creneauId}|${s.date}`));

  const out = [];
  for (let i = 0; i < P.upcomingDays; i += 1) {
    const day = new Date(now.getTime() + i * DAY);
    const date = dateKey(day);
    const jour = ((day.getDay() + 6) % 7) + 1;
    for (const slot of slots) {
      if (slot.jour !== jour) continue;
      if (slot.dateDebut && slot.dateDebut > date) continue;
      if (slot.dateFin && slot.dateFin < date) continue;
      if (started.has(`${slot.id}|${date}`)) continue;
      const start = atMinutes(date, time.parse(slot.heureDebut));
      if (start.getTime() <= now.getTime()) continue;
      const d = ens.serialize(byId.get(slot.enseignementId));
      out.push({
        date,
        heureDebut: time.fromSql(slot.heureDebut),
        heureFin: time.fromSql(slot.heureFin),
        salle: slot.salle || d.salleParDefaut || null,
        moduleCode: d.module.code,
        moduleNom: d.module.nom,
        publicLabel: d.publicLabel,
        ouvreA: hhmm(new Date(start.getTime() - S.openBeforeMin * MIN)),
        startMs: start.getTime(),
      });
    }
  }
  out.sort((a, b) => a.startMs - b.startMs);
  return out.slice(0, P.upcomingMax).map(({ startMs, ...rest }) => ({ ...rest, debutDans: Math.round((startMs - now.getTime()) / MIN) }));
}

async function dashboard(user) {
  const now = new Date();
  const seancesDuJour = await today(user, now);

  const [k] = await q(
    `SELECT COUNT(DISTINCT e.module_id) AS modules, COUNT(*) AS assignations FROM enseignements e WHERE e.professeur_id = :uid`, { uid: user.id }
  );
  const [h] = await q(
    `SELECT COUNT(*) AS tenues, COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(s.heure_fin, s.heure_debut))), 0) / 3600 AS heures
     FROM seances s JOIN enseignements e ON e.id = s.enseignement_id WHERE e.professeur_id = :uid AND s.statut = 'fermee'`, { uid: user.id }
  );
  const [a] = await q(
    `SELECT AVG(a.appreciation) AS avis, COUNT(*) AS nb FROM avis_cours a JOIN enseignements e ON e.id = a.enseignement_id WHERE e.professeur_id = :uid`, { uid: user.id }
  );
  const [ev] = await q(
    `SELECT COUNT(*) AS evaluations FROM travaux t JOIN enseignements e ON e.id = t.enseignement_id WHERE e.professeur_id = :uid`, { uid: user.id }
  );

  const list = await Enseignement.findAll({ where: { professeurId: user.id } });
  const [co] = await q(
    `SELECT COUNT(*) AS nb FROM rendus r JOIN travaux t ON t.id = r.travail_id JOIN enseignements e ON e.id = t.enseignement_id
     WHERE e.professeur_id = :uid AND NOT EXISTS (SELECT 1 FROM notes nt WHERE nt.travail_id = r.travail_id AND nt.etudiant_id = r.etudiant_id)`,
    { uid: user.id }
  );
  const ids = new Set();
  for (const e of list) (await ens.studentIdsFor(e)).forEach((id) => ids.add(id));

  return {
    stats: {
      etudiants: ids.size, modules: n(k.modules), assignations: n(k.assignations), evaluations: n(ev.evaluations), aCorriger: n(co.nb),
      seancesTenues: n(h.tenues), heures: Math.round(Number(h.heures) * 10) / 10,
      avis: a.avis === null ? null : Math.round(Number(a.avis) * 10) / 10, nbAvis: n(a.nb),
    },
    seancesDuJour,
    aVenir: await upcoming(user, now, seancesDuJour),
  };
}

// Mes cours : chaque assignation avec ses étudiants et leur taux de présence
async function cours(user) {
  const list = await Enseignement.findAll({ where: { professeurId: user.id }, include: ens.INCLUDES, order: [['id', 'ASC']] });
  const out = [];
  for (const e of list) {
    const ids = await ens.studentIdsFor(e);
    const students = ids.length
      ? await q(
        `SELECT u.id, u.prenom, u.nom, u.matricule, u.photo, u.est_bloque AS estBloque,
                (SELECT COUNT(*) FROM presences p JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
                   WHERE p.etudiant_id = u.id AND s.enseignement_id = :eid) AS seances,
                (SELECT COUNT(*) FROM presences p JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
                   WHERE p.etudiant_id = u.id AND s.enseignement_id = :eid AND p.statut <> 'absent') AS ok,
                (SELECT COUNT(*) FROM presences p JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
                   WHERE p.etudiant_id = u.id AND s.enseignement_id = :eid AND p.statut = 'absent' AND p.justifie = 0) AS absentsNJ
         FROM users u WHERE u.id IN (:ids) AND u.role = 'etudiant' ORDER BY u.nom ASC, u.prenom ASC`,
        { eid: e.id, ids }
      )
      : [];
    const [t] = await q('SELECT COUNT(*) AS nb FROM travaux WHERE enseignement_id = :eid', { eid: e.id });
    const [sc] = await q("SELECT COUNT(*) AS nb FROM seances WHERE enseignement_id = :eid AND statut = 'fermee'", { eid: e.id });
    out.push({
      ...ens.serialize(e),
      nbSeances: n(sc.nb),
      nbEvaluations: n(t.nb),
      etudiants: students.map((r) => ({
        id: r.id, prenom: r.prenom, nom: r.nom, matricule: r.matricule, photo: r.photo, estBloque: Boolean(Number(r.estBloque)),
        seances: n(r.seances), absentsNJ: n(r.absentsNJ), taux: n(r.seances) ? Math.round((n(r.ok) / n(r.seances)) * 1000) / 10 : null,
      })),
    });
  }
  return out;
}

// Choix proposés au professeur (dépôt de documents, notes)
async function options(user) {
  const list = await Enseignement.findAll({ where: { professeurId: user.id } });
  const modules = list.length
    ? await q('SELECT DISTINCT m.id, m.code, m.nom FROM modules m WHERE m.id IN (:ids) ORDER BY m.code', { ids: [...new Set(list.map((e) => e.moduleId))] })
    : [];
  const ids = new Set();
  for (const e of list) (await ens.studentIdsFor(e)).forEach((id) => ids.add(id));
  const classes = ids.size
    ? await q('SELECT DISTINCT c.id, c.nom FROM classes c JOIN users u ON u.classe_id = c.id WHERE u.id IN (:ids) ORDER BY c.nom', { ids: [...ids] })
    : [];
  return { modules, classes, canEditNotes: cfg.professeur.canEditNotes };
}

module.exports = { dashboard, cours, options };