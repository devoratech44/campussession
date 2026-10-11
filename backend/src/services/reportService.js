// backend/src/services/reportService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const n = (v) => Number(v) || 0;
const r1 = (v) => Math.round(Number(v) * 10) / 10;
const rate = (ok, total) => (total ? r1((ok / total) * 100) : null);

// Alias attendus : u (étudiant), e (enseignement), s (séance, si dates)
function cond(f, { dates = true } = {}) {
  const where = [];
  const rep = {};
  const add = (c, key, value) => { where.push(c); rep[key] = value; };
  if (asId(f.classeId)) add('u.classe_id = :classeId', 'classeId', asId(f.classeId));
  if (asId(f.filiereId)) add('u.filiere_id = :filiereId', 'filiereId', asId(f.filiereId));
  if (asId(f.moduleId)) add('e.module_id = :moduleId', 'moduleId', asId(f.moduleId));
  if (dates && DATE.test(f.du || '')) add('s.date_seance >= :du', 'du', f.du);
  if (dates && DATE.test(f.au || '')) add('s.date_seance <= :au', 'au', f.au);
  return { where, rep, W: where.length ? `WHERE ${where.join(' AND ')}` : '' };
}

const PRES_FROM = `FROM presences p
  JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
  JOIN enseignements e ON e.id = s.enseignement_id
  JOIN modules m ON m.id = e.module_id
  JOIN users u ON u.id = p.etudiant_id`;

const NOTES_FROM = `FROM notes nt
  JOIN travaux t ON t.id = nt.travail_id
  JOIN enseignements e ON e.id = t.enseignement_id
  JOIN modules m ON m.id = e.module_id
  JOIN users u ON u.id = nt.etudiant_id`;

async function apercu(f) {
  const c = cond(f);
  const [k] = await q(
    `SELECT COUNT(*) AS total, COALESCE(SUM(p.statut = 'present'), 0) AS presents, COALESCE(SUM(p.statut = 'retard'), 0) AS retards,
            COALESCE(SUM(p.statut = 'absent'), 0) AS absents, COALESCE(SUM(p.statut = 'absent' AND p.justifie = 0), 0) AS absentsNJ,
            COALESCE(SUM(p.statut = 'retard' AND p.justifie = 0), 0) AS retardsNJ
     ${PRES_FROM} ${c.W}`, c.rep
  );

  const su = [];
  const sr = {};
  if (asId(f.classeId)) { su.push('classe_id = :classeId'); sr.classeId = asId(f.classeId); }
  if (asId(f.filiereId)) { su.push('filiere_id = :filiereId'); sr.filiereId = asId(f.filiereId); }
  const SU = su.length ? ` AND ${su.join(' AND ')}` : '';
  const [{ nbEtudiants }] = await q(`SELECT COUNT(*) AS nbEtudiants FROM users WHERE role = 'etudiant'${SU}`, sr);
  const [{ nbBloques }] = await q(`SELECT COUNT(*) AS nbBloques FROM users WHERE role = 'etudiant' AND est_bloque = 1${SU}`, sr);
  const [{ nbProfesseurs }] = await q("SELECT COUNT(*) AS nbProfesseurs FROM users WHERE role = 'professeur'");

  const sc = [];
  const ss = {};
  if (asId(f.moduleId)) { sc.push('e.module_id = :moduleId'); ss.moduleId = asId(f.moduleId); }
  if (DATE.test(f.du || '')) { sc.push('s.date_seance >= :du'); ss.du = f.du; }
  if (DATE.test(f.au || '')) { sc.push('s.date_seance <= :au'); ss.au = f.au; }
  const seances = await q(
    `SELECT s.statut, COUNT(*) AS total FROM seances s JOIN enseignements e ON e.id = s.enseignement_id
     WHERE s.statut IN ('fermee', 'annulee') ${sc.length ? `AND ${sc.join(' AND ')}` : ''} GROUP BY s.statut`, ss
  );
  const nbSeances = (st) => n(seances.find((x) => x.statut === st)?.total);

  const parModule = (await q(
    `SELECT m.id, m.code, m.nom, COUNT(*) AS total, SUM(p.statut <> 'absent') AS ok ${PRES_FROM} ${c.W}
     GROUP BY m.id, m.code, m.nom ORDER BY m.code`, c.rep
  )).map((r) => ({ id: r.id, code: r.code, nom: r.nom, total: n(r.total), taux: rate(n(r.ok), n(r.total)) }));

  const parJour = (await q(
    `SELECT DATE_FORMAT(s.date_seance, '%Y-%m-%d') AS jour, SUM(p.statut = 'present') AS presents,
            SUM(p.statut = 'retard') AS retards, SUM(p.statut = 'absent') AS absents
     ${PRES_FROM} ${c.W} GROUP BY s.date_seance ORDER BY s.date_seance DESC LIMIT :pts`,
    { ...c.rep, pts: cfg.reports.chartPoints }
  )).reverse().map((r) => ({ jour: r.jour, presents: n(r.presents), retards: n(r.retards), absents: n(r.absents) }));

  const cn = cond(f, { dates: false });
  const notesParModule = (await q(
    `SELECT m.id, m.code, m.nom, AVG(nt.valeur) AS moyenne, COUNT(*) AS nb ${NOTES_FROM} ${cn.W} GROUP BY m.id, m.code, m.nom ORDER BY m.code`, cn.rep
  )).map((r) => ({ id: r.id, code: r.code, nom: r.nom, moyenne: r1(r.moyenne), nb: n(r.nb) }));
  const [d] = await q(
    `SELECT COUNT(*) AS nb, AVG(nt.valeur) AS moyenne, COALESCE(SUM(nt.valeur < 5), 0) AS b1,
            COALESCE(SUM(nt.valeur >= 5 AND nt.valeur < 10), 0) AS b2, COALESCE(SUM(nt.valeur >= 10 AND nt.valeur < 15), 0) AS b3,
            COALESCE(SUM(nt.valeur >= 15), 0) AS b4 ${NOTES_FROM} ${cn.W}`, cn.rep
  );

  const total = n(k.total);
  return {
    kpis: {
      nbEtudiants: n(nbEtudiants), nbProfesseurs: n(nbProfesseurs), nbBloques: n(nbBloques),
      seancesTenues: nbSeances('fermee'), seancesAnnulees: nbSeances('annulee'),
      pointages: total, presents: n(k.presents), retards: n(k.retards), absents: n(k.absents),
      absentsNJ: n(k.absentsNJ), retardsNJ: n(k.retardsNJ),
      tauxPresence: rate(n(k.presents) + n(k.retards), total),
      moyenneNotes: d.nb ? r1(d.moyenne) : null, nbNotes: n(d.nb),
    },
    presenceParModule: parModule,
    presenceParJour: parJour,
    notesParModule,
    distributionNotes: [
      { tranche: '0 à 5', nb: n(d.b1) }, { tranche: '5 à 10', nb: n(d.b2) },
      { tranche: '10 à 15', nb: n(d.b3) }, { tranche: '15 à 20', nb: n(d.b4) },
    ],
  };
}

async function presences(f, { page, limit, tout }) {
  const c = cond(f);
  const size = tout ? cfg.reports.maxRows : limit;
  const offset = tout ? 0 : (page - 1) * limit;
  const [{ total }] = await q(`SELECT COUNT(DISTINCT u.id) AS total ${PRES_FROM} ${c.W}`, c.rep);
  const rows = await q(
    `SELECT u.id AS etudiantId, u.prenom, u.nom, u.matricule, cl.nom AS classe, u.est_bloque AS estBloque,
            COUNT(*) AS seances, SUM(p.statut = 'present') AS presents, SUM(p.statut = 'retard') AS retards,
            SUM(p.statut = 'absent') AS absents, SUM(p.statut = 'absent' AND p.justifie = 0) AS absentsNJ,
            SUM(p.statut = 'retard' AND p.justifie = 0) AS retardsNJ, ROUND(SUM(p.statut <> 'absent') / COUNT(*) * 100, 1) AS taux
     ${PRES_FROM} LEFT JOIN classes cl ON cl.id = u.classe_id ${c.W}
     GROUP BY u.id, u.prenom, u.nom, u.matricule, cl.nom, u.est_bloque
     ORDER BY taux ASC, u.nom ASC LIMIT :limit OFFSET :offset`,
    { ...c.rep, limit: size, offset }
  );
  return {
    items: rows.map((r) => ({
      ...r, estBloque: Boolean(Number(r.estBloque)), seances: n(r.seances), presents: n(r.presents), retards: n(r.retards),
      absents: n(r.absents), absentsNJ: n(r.absentsNJ), retardsNJ: n(r.retardsNJ), taux: r.taux === null ? null : Number(r.taux),
    })),
    total: Number(total), page: tout ? 1 : page, limit: size, pages: tout ? 1 : Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

async function professeurs(f) {
  const dates = [];
  const rep = {};
  if (DATE.test(f.du || '')) { dates.push('s.date_seance >= :du'); rep.du = f.du; }
  if (DATE.test(f.au || '')) { dates.push('s.date_seance <= :au'); rep.au = f.au; }
  const D = dates.length ? ` AND ${dates.join(' AND ')}` : '';
  const seance = (statut) => `FROM seances s JOIN enseignements e ON e.id = s.enseignement_id
    WHERE e.professeur_id = pr.id AND s.statut = '${statut}'${D}`;

  const rows = await q(
    `SELECT pr.id, pr.prenom, pr.nom, pr.specialite,
       (SELECT COUNT(*) ${seance('fermee')}) AS seancesTenues,
       (SELECT COUNT(*) ${seance('annulee')}) AS seancesAnnulees,
       (SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(s.heure_fin, s.heure_debut))), 0) / 3600 ${seance('fermee')}) AS heures,
       (SELECT COUNT(*) FROM travaux t JOIN enseignements e ON e.id = t.enseignement_id WHERE e.professeur_id = pr.id) AS evaluations,
       (SELECT COUNT(*) FROM notes nt JOIN travaux t ON t.id = nt.travail_id JOIN enseignements e ON e.id = t.enseignement_id
          WHERE e.professeur_id = pr.id) AS notesSaisies,
       (SELECT AVG(a.appreciation) FROM avis_cours a JOIN enseignements e ON e.id = a.enseignement_id WHERE e.professeur_id = pr.id) AS avis,
       (SELECT COUNT(*) FROM avis_cours a JOIN enseignements e ON e.id = a.enseignement_id WHERE e.professeur_id = pr.id) AS nbAvis
     FROM users pr WHERE pr.role = 'professeur' ORDER BY pr.nom ASC, pr.prenom ASC`, rep
  );
  return rows.map((r) => ({
    id: r.id, prenom: r.prenom, nom: r.nom, specialite: r.specialite,
    seancesTenues: n(r.seancesTenues), seancesAnnulees: n(r.seancesAnnulees), heures: r1(r.heures),
    evaluations: n(r.evaluations), notesSaisies: n(r.notesSaisies),
    avis: r.avis === null ? null : r1(r.avis), nbAvis: n(r.nbAvis),
  }));
}

module.exports = { apercu, presences, professeurs };