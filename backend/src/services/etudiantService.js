// backend/src/services/etudiantService.js
const { QueryTypes, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const time = require('../utils/timeUtils');
const { Seance, Presence, Enseignement, EmploiDuTemps } = require('../models');
const ens = require('./enseignementService');
const sessions = require('./sessionService');
const evaluations = require('./evaluationService');
const travaux = require('./etudiantTravauxService');

const S = cfg.sessions;
const E = cfg.etudiant;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const n = (v) => Number(v) || 0;
const pad = (x) => String(x).padStart(2, '0');
// Le serveur tourne en GMT (APP_TIMEZONE)
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const atMinutes = (dateStr, minutes) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes, 0, 0);
};

const PRES_ATTRS = ['seanceId', 'statut', 'minutesRetard', 'scannedAt', 'methode', 'justifie', [literal('(`Presence`.`signature` IS NOT NULL)'), 'aSigne']];

const presenceOf = (p) => (p ? {
  statut: p.statut,
  minutesRetard: p.minutesRetard,
  methode: p.methode,
  pointeAt: p.scannedAt,
  justifie: Boolean(p.justifie),
  signatureFaite: Boolean(Number(p.get('aSigne'))),
} : null);

function courseItem(s, p, now) {
  const d = sessions.serializeSeance(s);
  const e = d.enseignement;
  const dejaPointe = Boolean(p?.scannedAt);
  const delaiOk = Boolean(d.scanJusqua) && now.getTime() <= new Date(d.scanJusqua).getTime();
  return {
    seanceId: d.id,
    date: d.date,
    heureDebut: d.heureDebut,
    heureFin: d.heureFin,
    salle: d.salle,
    statut: d.statut,
    signe: d.signe,
    moduleCode: e.module.code,
    moduleNom: e.module.nom,
    professeur: `${e.professeur.prenom} ${e.professeur.nom}`,
    presence: presenceOf(p),
    dejaPointe,
    peutPointer: d.statut === 'ouverte' && d.signe && delaiOk && !dejaPointe,
    delaiDepasse: d.statut === 'ouverte' && d.signe && !delaiOk && !dejaPointe,
  };
}

// Prochains cours calculés depuis l'emploi du temps (les séances futures n'existent pas encore)
async function upcoming(user, now, todaySeances) {
  const list = await Enseignement.findAll({ where: await ens.whereForStudent(user), include: ens.INCLUDES });
  if (!list.length) return [];
  const byId = new Map(list.map((e) => [e.id, e]));
  const slots = await EmploiDuTemps.findAll({ where: { enseignementId: [...byId.keys()] } });

  const started = new Set(todaySeances.filter((s) => s.statut !== 'planifiee' && s.creneauId).map((s) => `${s.creneauId}|${s.dateSeance}`));
  const out = [];
  for (let i = 0; i < E.upcomingDays; i += 1) {
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
        professeur: `${d.professeur.prenom} ${d.professeur.nom}`,
        ouvreA: hhmm(new Date(start.getTime() - S.openBeforeMin * MIN)),
        startMs: start.getTime(),
      });
    }
  }
  out.sort((a, b) => a.startMs - b.startMs);
  return out.slice(0, E.upcomingMax).map(({ startMs, ...rest }) => ({ ...rest, debutDans: Math.round((startMs - now.getTime()) / MIN) }));
}

// Page « Pointer ma présence » : en cours, à venir, terminées du jour
async function overview(user) {
  const now = new Date();
  const today = dateKey(now);
  const seances = await Seance.findAll({
    where: { dateSeance: today },
    attributes: sessions.SEANCE_ATTRS,
    include: [{ model: Enseignement, as: 'enseignement', required: true, where: await ens.whereForStudent(user), include: ens.INCLUDES }],
    order: [['heureDebut', 'ASC'], ['id', 'ASC']],
  });
  const pres = seances.length
    ? await Presence.findAll({ where: { seanceId: seances.map((s) => s.id), etudiantId: user.id }, attributes: PRES_ATTRS })
    : [];
  const byId = new Map(pres.map((p) => [p.seanceId, p]));
  const items = seances.map((s) => courseItem(s, byId.get(s.id), now));

  return {
    serverNow: now.toISOString(),
    enCours: items.filter((c) => c.statut === 'ouverte'),
    terminees: items.filter((c) => c.statut === 'fermee' || c.statut === 'annulee'),
    aVenir: await upcoming(user, now, seances),
  };
}

// Jauges de blocage : mêmes règles que le blocage automatique (séances fermées, non justifiés)
async function blocage(user) {
  const [r] = await q(
    `SELECT COALESCE(SUM(p.statut = 'retard'), 0) AS retards, COALESCE(SUM(p.statut = 'absent'), 0) AS absences
     FROM presences p JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
     WHERE p.etudiant_id = :uid AND p.justifie = 0`,
    { uid: user.id }
  );
  return {
    retards: n(r.retards),
    absences: n(r.absences),
    maxRetards: cfg.blocking.maxLates,
    maxAbsences: cfg.blocking.maxAbsences,
    mode: cfg.blocking.mode,
    estBloque: Boolean(user.estBloque),
  };
}

const PRES_FROM = `FROM presences p
  JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
  JOIN enseignements e ON e.id = s.enseignement_id
  JOIN modules m ON m.id = e.module_id
  JOIN users pr ON pr.id = e.professeur_id
  LEFT JOIN classes cl ON cl.id = e.classe_id`;

async function summary(where, rep) {
  const [r] = await q(
    `SELECT COUNT(*) AS seances, COALESCE(SUM(p.statut = 'present'), 0) AS presents, COALESCE(SUM(p.statut = 'retard'), 0) AS retards,
            COALESCE(SUM(p.statut = 'absent'), 0) AS absents, COALESCE(SUM(p.statut = 'absent' AND p.justifie = 0), 0) AS absentsNJ,
            COALESCE(SUM(p.statut = 'retard' AND p.justifie = 0), 0) AS retardsNJ
     ${PRES_FROM} WHERE ${where.join(' AND ')}`, rep
  );
  const seances = n(r.seances);
  return {
    seances, presents: n(r.presents), retards: n(r.retards), absents: n(r.absents), absentsNJ: n(r.absentsNJ), retardsNJ: n(r.retardsNJ),
    taux: seances ? Math.round(((n(r.presents) + n(r.retards)) / seances) * 1000) / 10 : null,
  };
}

// Fiche « Mes présences »
async function presences(user, f, { page, limit }) {
  const where = ['p.etudiant_id = :uid'];
  const rep = { uid: user.id };
  const add = (cond, key, value) => { where.push(cond); rep[key] = value; };
  if (asId(f.moduleId)) add('e.module_id = :moduleId', 'moduleId', asId(f.moduleId));
  if (DATE.test(f.du || '')) add('s.date_seance >= :du', 'du', f.du);
  if (DATE.test(f.au || '')) add('s.date_seance <= :au', 'au', f.au);
  const baseWhere = [...where];
  const baseRep = { ...rep };
  if (cfg.presenceStatuts.includes(f.statut)) add('p.statut = :statut', 'statut', f.statut);

  const [{ total }] = await q(`SELECT COUNT(*) AS total ${PRES_FROM} WHERE ${where.join(' AND ')}`, rep);
  const rows = await q(
    `SELECT p.seance_id AS seanceId, p.statut, p.minutes_retard AS minutesRetard, p.justifie, p.motif_justification AS motifJustification,
            p.remarque, p.methode, p.scanned_at AS scannedAt,
            DATE_FORMAT(s.date_seance, '%Y-%m-%d') AS dateSeance, TIME_FORMAT(s.heure_debut, '%H:%i') AS heureDebut,
            TIME_FORMAT(s.heure_fin, '%H:%i') AS heureFin, COALESCE(s.salle, cl.salle) AS salle,
            m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom, CONCAT(pr.prenom, ' ', pr.nom) AS professeur
     ${PRES_FROM} WHERE ${where.join(' AND ')}
     ORDER BY s.date_seance DESC, s.heure_debut DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  const modules = await q(
    `SELECT DISTINCT m.id, m.code, m.nom ${PRES_FROM} WHERE p.etudiant_id = :uid ORDER BY m.code`, { uid: user.id }
  );

  return {
    items: rows.map((r) => ({ ...r, justifie: Boolean(r.justifie) })),
    total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)),
    summary: await summary(baseWhere, baseRep),
    modules,
    blocage: await blocage(user),
  };
}

async function dashboard(user) {
  const [ov, bl, sum, notes, moy] = await Promise.all([
    overview(user),
    blocage(user),
    summary(['p.etudiant_id = :uid'], { uid: user.id }),
    q(
      `SELECT n.valeur, n.commentaire, t.titre, t.type, t.numero_tp AS numeroTp, m.code AS moduleCode, n.updated_at AS updatedAt
       FROM notes n JOIN travaux t ON t.id = n.travail_id JOIN enseignements e ON e.id = t.enseignement_id JOIN modules m ON m.id = e.module_id
       WHERE n.etudiant_id = :uid ORDER BY n.updated_at DESC LIMIT :limit`,
      { uid: user.id, limit: E.recentNotes }
    ),
    evaluations.moyennes({ etudiantId: user.id }),
  ]);
  return {
    blocage: bl,
    stats: { ...sum, moyenne: moy.items[0]?.generale ?? null },
    enCours: ov.enCours,
    terminees: ov.terminees,
    aVenir: ov.aVenir,
    notes: notes.map((r) => ({ ...r, valeur: Number(r.valeur) })),
    aRendre: await travaux.pending(user),
    dernierContenu: (await contenu(user, {}, { page: 1, limit: 1 })).items[0] || null,
  };
}

// Points abordés en séance (séances terminées de ses cours)
async function contenu(user, f, { page, limit }) {
  const where = ["s.statut = 'fermee'"];
  const rep = {};
  if (!f.toutes) where.push("s.points_abordes IS NOT NULL AND s.points_abordes <> ''");
  if (asId(f.moduleId)) { where.push('e.module_id = :moduleId'); rep.moduleId = asId(f.moduleId); }
  if (DATE.test(f.du || '')) { where.push('s.date_seance >= :du'); rep.du = f.du; }
  if (DATE.test(f.au || '')) { where.push('s.date_seance <= :au'); rep.au = f.au; }

  const scope = await Enseignement.findAll({ where: await ens.whereForStudent(user), attributes: ['id', 'moduleId'] });
  if (!scope.length) return { items: [], modules: [], total: 0, page, limit, pages: 1 };
  where.push('s.enseignement_id IN (:eids)');
  rep.eids = scope.map((e) => e.id);

  const FROM = `FROM seances s JOIN enseignements e ON e.id = s.enseignement_id JOIN modules m ON m.id = e.module_id
    JOIN users pr ON pr.id = e.professeur_id WHERE ${where.join(' AND ')}`;
  const [{ total }] = await q(`SELECT COUNT(*) AS total ${FROM}`, rep);
  const rows = await q(
    `SELECT s.id AS seanceId, DATE_FORMAT(s.date_seance, '%Y-%m-%d') AS dateSeance, TIME_FORMAT(s.heure_debut, '%H:%i') AS heureDebut,
            TIME_FORMAT(s.heure_fin, '%H:%i') AS heureFin, s.points_abordes AS pointsAbordes,
            m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom, CONCAT(pr.prenom, ' ', pr.nom) AS professeur
     ${FROM} ORDER BY s.date_seance DESC, s.heure_debut DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  const moduleIds = [...new Set(scope.map((e) => e.moduleId))];
  const modules = await q('SELECT id, code, nom FROM modules WHERE id IN (:ids) ORDER BY code', { ids: moduleIds });
  return { items: rows, modules, total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)) };
}

// Cours ouverts, signés par le professeur, que l'étudiant n'a pas encore pointés
async function openCount(user) {
  const now = new Date();
  const seances = await Seance.findAll({
    where: { dateSeance: dateKey(now), statut: 'ouverte' },
    attributes: sessions.SEANCE_ATTRS,
    include: [{ model: Enseignement, as: 'enseignement', required: true, where: await ens.whereForStudent(user), attributes: ['id'] }],
  });
  if (!seances.length) return 0;
  const pres = await Presence.findAll({ where: { seanceId: seances.map((s) => s.id), etudiantId: user.id }, attributes: ['seanceId', 'scannedAt'] });
  const done = new Set(pres.filter((p) => p.scannedAt).map((p) => p.seanceId));
  return seances.filter((s) => s.signeAt && s.scanJusqua && now.getTime() <= new Date(s.scanJusqua).getTime() && !done.has(s.id)).length;
}

module.exports = { overview, presences, dashboard, contenu, openCount };