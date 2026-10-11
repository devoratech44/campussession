// backend/src/services/evaluationService.js
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Travail, Note, User, Enseignement } = require('../models');
const ens = require('./enseignementService');
const notifications = require('./notificationService');

const E = cfg.evaluations;
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const round2 = (n) => Math.round(n * 100) / 100;
// « 2026-10-12T14:00 » saisi en GMT
const toDate = (v) => (v ? new Date(`${String(v).slice(0, 16)}:00Z`) : null);
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const TYPE_LABEL = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };

const removeFile = (dir, name) => {
  if (name) fs.unlink(path.join(dir, path.basename(name)), () => {});
};
const conflict = (err) => (err.name === 'SequelizeUniqueConstraintError'
  ? new ApiError(409, 'Ce TP existe déjà pour cette assignation.')
  : err);

// ---------- Requêtes de liste ----------
const NB_ETUDIANTS = `(CASE e.public_type
  WHEN 'classe' THEN (SELECT COUNT(*) FROM users s WHERE s.role = 'etudiant' AND s.classe_id = e.classe_id)
  WHEN 'filiere' THEN (SELECT COUNT(*) FROM users s WHERE s.role = 'etudiant' AND s.filiere_id = e.filiere_id)
  WHEN 'groupe' THEN (SELECT COUNT(*) FROM groupe_etudiants ge WHERE ge.groupe_id = e.groupe_id)
  ELSE 1 END)`;

const PUBLIC_LABEL = `(CASE e.public_type
  WHEN 'classe' THEN cl.nom WHEN 'filiere' THEN fi.nom WHEN 'groupe' THEN gr.nom
  ELSE CONCAT(et.prenom, ' ', et.nom) END)`;

const FROM = `FROM travaux t
  JOIN enseignements e ON e.id = t.enseignement_id
  JOIN modules m ON m.id = e.module_id
  JOIN users pr ON pr.id = e.professeur_id
  LEFT JOIN classes cl ON cl.id = e.classe_id
  LEFT JOIN filieres fi ON fi.id = e.filiere_id
  LEFT JOIN groupes gr ON gr.id = e.groupe_id
  LEFT JOIN users et ON et.id = e.etudiant_id`;

const COLUMNS = `t.id, t.enseignement_id AS enseignementId, t.type, t.numero_tp AS numeroTp, t.titre, t.consignes,
  DATE_FORMAT(t.date_travail, '%Y-%m-%d') AS dateTravail, DATE_FORMAT(t.date_limite, '%Y-%m-%dT%H:%i') AS dateLimite, (t.fichier IS NOT NULL) AS aFichier, t.nom_original AS nomOriginal,
  m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom, e.professeur_id AS professeurId,
  CONCAT(pr.prenom, ' ', pr.nom) AS professeur, e.public_type AS publicType, ${PUBLIC_LABEL} AS publicLabel,
  ${NB_ETUDIANTS} AS nbEtudiants,
  (SELECT COUNT(*) FROM rendus r WHERE r.travail_id = t.id) AS nbRendus,
  (SELECT COUNT(*) FROM notes n WHERE n.travail_id = t.id) AS nbNotes,
  (SELECT AVG(n.valeur) FROM notes n WHERE n.travail_id = t.id) AS moyenne`;

const shape = (r) => ({
  ...r,
  aFichier: Boolean(Number(r.aFichier)),
  nbEtudiants: Number(r.nbEtudiants),
  nbRendus: Number(r.nbRendus),
  nbNotes: Number(r.nbNotes),
  moyenne: r.moyenne === null ? null : round2(Number(r.moyenne)),
});

const classeCond = `((e.public_type = 'classe' AND e.classe_id = :classeId)
  OR (e.public_type = 'filiere' AND e.filiere_id IN (SELECT filiere_id FROM classe_filiere WHERE classe_id = :classeId))
  OR (e.public_type = 'groupe' AND e.groupe_id IN (SELECT id FROM groupes WHERE classe_id = :classeId))
  OR (e.public_type = 'etudiant' AND e.etudiant_id IN (SELECT id FROM users WHERE role = 'etudiant' AND classe_id = :classeId)))`;

const filiereCond = `((e.public_type = 'filiere' AND e.filiere_id = :filiereId)
  OR (e.public_type = 'classe' AND e.classe_id IN (SELECT classe_id FROM classe_filiere WHERE filiere_id = :filiereId))
  OR (e.public_type = 'groupe' AND e.groupe_id IN (SELECT id FROM groupes WHERE filiere_id = :filiereId))
  OR (e.public_type = 'etudiant' AND e.etudiant_id IN (SELECT id FROM users WHERE role = 'etudiant' AND filiere_id = :filiereId)))`;

async function rowById(id) {
  const [row] = await q(`SELECT ${COLUMNS} ${FROM} WHERE t.id = :id`, { id });
  if (!row) throw new ApiError(404, 'Évaluation introuvable.');
  return shape(row);
}

async function list(f, { page, limit }) {
  const where = ['1 = 1'];
  const rep = {};
  const add = (cond, key, value) => { where.push(cond); rep[key] = value; };
  if (E.types.includes(f.type)) add('t.type = :type', 'type', f.type);
  if (asId(f.moduleId)) add('e.module_id = :moduleId', 'moduleId', asId(f.moduleId));
  if (asId(f.professeurId)) add('e.professeur_id = :professeurId', 'professeurId', asId(f.professeurId));
  if (asId(f.enseignementId)) add('t.enseignement_id = :enseignementId', 'enseignementId', asId(f.enseignementId));
  if (asId(f.classeId)) add(classeCond, 'classeId', asId(f.classeId));
  if (asId(f.filiereId)) add(filiereCond, 'filiereId', asId(f.filiereId));
  if (f.q && String(f.q).trim()) add('t.titre LIKE :q', 'q', `%${String(f.q).trim()}%`);

  const [{ total }] = await q(`SELECT COUNT(*) AS total ${FROM} WHERE ${where.join(' AND ')}`, rep);
  const rows = await q(
    `SELECT ${COLUMNS} ${FROM} WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(t.date_travail, DATE(t.created_at)) DESC, t.id DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  return { items: rows.map(shape), total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)) };
}

// ---------- Détail : étudiants, rendus, notes ----------
async function detail(id) {
  const travail = await rowById(id);
  const e = await Enseignement.findByPk(travail.enseignementId);
  const ids = await ens.studentIdsFor(e);
  const students = ids.length
    ? await User.findAll({
      where: { id: ids, role: 'etudiant' },
      attributes: ['id', 'prenom', 'nom', 'matricule', 'photo'],
      order: [['nom', 'ASC'], ['prenom', 'ASC']],
    })
    : [];

  const rendus = await q(
    `SELECT etudiant_id AS etudiantId, nom_original AS nomOriginal, (fichier IS NOT NULL) AS aFichier,
            commentaire, en_retard AS enRetard, date_rendu AS dateRendu FROM rendus WHERE travail_id = :id`, { id });
  const notes = await q('SELECT etudiant_id AS etudiantId, valeur, commentaire FROM notes WHERE travail_id = :id', { id });
  const rMap = new Map(rendus.map((r) => [r.etudiantId, { ...r, aFichier: Boolean(Number(r.aFichier)), enRetard: Boolean(r.enRetard) }]));
  const nMap = new Map(notes.map((n) => [n.etudiantId, { ...n, valeur: Number(n.valeur) }]));

  return {
    travail,
    etudiants: students.map((u) => ({
      id: u.id, prenom: u.prenom, nom: u.nom, matricule: u.matricule, photo: u.photo,
      rendu: rMap.get(u.id) || null,
      note: nMap.get(u.id) || null,
    })),
  };
}

// ---------- Création, modification, suppression ----------
async function notifyNew(t, e, user) {
  if (!E.autoNotify) return;
  try {
    const ids = await ens.studentIdsFor(e);
    if (!ids.length) return;
    const [m] = await q('SELECT code, nom FROM modules WHERE id = :id', { id: e.moduleId });
    const label = t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE_LABEL[t.type];
    const date = t.dateTravail ? ` Date : ${String(t.dateTravail).split('-').reverse().join('/')}.` : '';
    await notifications.send({
      titre: `${label} : ${t.titre}`,
      message: `${m.code} · ${m.nom}\n${label} « ${t.titre} ».${date}`,
      type: t.type === 'examen' ? 'examen' : 'devoir',
      userIds: ids,
      createdBy: user.id,
    });
  } catch (err) {
    logger.warn('EVAL', `Notification non envoyée : ${err.message}`);
  }
}

async function create(body, file, user) {
  try {
    const e = await Enseignement.findByPk(body.enseignementId);
    if (!e) throw new ApiError(400, 'Assignation introuvable.');
    const t = await Travail.create({
      enseignementId: e.id,
      type: body.type,
      numeroTp: body.type === 'tp' ? Number(body.numeroTp) : null,
      titre: body.titre,
      consignes: body.consignes || null,
      dateTravail: body.dateTravail || null,
      dateLimite: toDate(body.dateLimite),
      fichier: file ? file.filename : null,
      nomOriginal: file ? file.nomOriginal : null,
      createdBy: user.id,
    });
    logger.success('EVAL', `Évaluation créée : #${t.id} ${t.type} « ${t.titre} » (assignation #${e.id}) par ${user.email}`);
    await notifyNew(t, e, user);
    return await rowById(t.id);
  } catch (err) {
    removeFile(cfg.paths.travaux, file?.filename);
    throw conflict(err);
  }
}

async function update(id, body, file, retirer) {
  try {
    const t = await Travail.findByPk(id);
    if (!t) throw new ApiError(404, 'Évaluation introuvable.');
    const old = t.fichier;
    const data = {
      type: body.type,
      numeroTp: body.type === 'tp' ? Number(body.numeroTp) : null,
      titre: body.titre,
      consignes: body.consignes || null,
      dateTravail: body.dateTravail || null,
    };
    if (file) Object.assign(data, { fichier: file.filename, nomOriginal: file.nomOriginal });
    else if (retirer) Object.assign(data, { fichier: null, nomOriginal: null });
    await t.update(data);
    if ((file || retirer) && old) removeFile(cfg.paths.travaux, old);
    logger.info('EVAL', `Évaluation modifiée : #${id}`);
    return await rowById(id);
  } catch (err) {
    removeFile(cfg.paths.travaux, file?.filename);
    throw conflict(err);
  }
}

async function remove(id) {
  const t = await Travail.findByPk(id);
  if (!t) throw new ApiError(404, 'Évaluation introuvable.');
  const rendus = await q('SELECT fichier FROM rendus WHERE travail_id = :id AND fichier IS NOT NULL', { id });
  await t.destroy(); // rendus et notes supprimés en cascade
  removeFile(cfg.paths.travaux, t.fichier);
  rendus.forEach((r) => removeFile(cfg.paths.rendus, r.fichier));
  logger.warn('EVAL', `Évaluation supprimée : #${id}`);
}

// ---------- Notes ----------
async function saveNotes(id, entries, user) {
  const t = await Travail.findByPk(id);
  if (!t) throw new ApiError(404, 'Évaluation introuvable.');
  const e = await Enseignement.findByPk(t.enseignementId);
  const members = new Set(await ens.studentIdsFor(e));
  const existing = new Map((await Note.findAll({ where: { travailId: id } })).map((n) => [n.etudiantId, n]));
  const fresh = [];
  let changed = 0;

  for (const it of entries) {
    const etudiantId = Number(it.etudiantId);
    if (!members.has(etudiantId)) throw new ApiError(400, 'Un étudiant ne fait pas partie de cette évaluation.');
    const row = existing.get(etudiantId);
    const empty = it.valeur === null || it.valeur === undefined || String(it.valeur).trim() === '';

    if (empty) {
      if (row) { await row.destroy(); changed += 1; }
      continue;
    }
    const valeur = Number(String(it.valeur).replace(',', '.'));
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > E.maxNote) {
      throw new ApiError(400, `Les notes doivent être comprises entre 0 et ${E.maxNote}.`);
    }
    const data = { valeur: round2(valeur), commentaire: it.commentaire ? String(it.commentaire).slice(0, 2000) : null, saisiPar: user.id };
    if (row) await row.update(data);
    else { await Note.create({ travailId: id, etudiantId, ...data }); fresh.push(etudiantId); }
    changed += 1;
  }

  logger.success('EVAL', `Notes enregistrées : évaluation #${id}, ${changed} modification(s), ${fresh.length} nouvelle(s) par ${user.email}`);

  if (E.autoNotify) {
    const [m] = await q('SELECT code FROM modules WHERE id = :id', { id: e.moduleId });
    for (const etudiantId of fresh) {
      try {
        await notifications.send({
          titre: 'Nouvelle note disponible',
          message: `Votre note pour « ${t.titre} » (${m.code}) est disponible.`,
          type: 'notes',
          userIds: [etudiantId],
          createdBy: user.id,
        });
      } catch (err) {
        logger.warn('EVAL', `Notification de note non envoyée (étudiant #${etudiantId}) : ${err.message}`);
      }
    }
  }
}

// ---------- Moyennes ----------
async function moyennes(f) {
  const where = ['1 = 1'];
  const rep = {};
  const add = (cond, key, value) => { where.push(cond); rep[key] = value; };
  if (asId(f.classeId)) add('u.classe_id = :classeId', 'classeId', asId(f.classeId));
  if (asId(f.filiereId)) add('u.filiere_id = :filiereId', 'filiereId', asId(f.filiereId));
  if (asId(f.moduleId)) add('m.id = :moduleId', 'moduleId', asId(f.moduleId));
  if (asId(f.etudiantId)) add('n.etudiant_id = :etudiantId', 'etudiantId', asId(f.etudiantId));
  if (asId(f.professeurId)) add('e.professeur_id = :professeurId', 'professeurId', asId(f.professeurId));

  const rows = await q(
    `SELECT n.etudiant_id AS etudiantId, n.valeur, t.type, m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom,
            m.coefficient, u.prenom AS prenom, u.nom AS nom, u.matricule, cl.nom AS classe
     FROM notes n
     JOIN travaux t ON t.id = n.travail_id
     JOIN enseignements e ON e.id = t.enseignement_id
     JOIN modules m ON m.id = e.module_id
     JOIN users u ON u.id = n.etudiant_id
     LEFT JOIN classes cl ON cl.id = u.classe_id
     WHERE ${where.join(' AND ')}`,
    rep
  );

  const modules = new Map();
  const students = new Map();
  for (const r of rows) {
    const coef = Number(r.coefficient);
    modules.set(r.moduleId, { id: r.moduleId, code: r.moduleCode, nom: r.moduleNom, coefficient: coef });
    if (!students.has(r.etudiantId)) {
      students.set(r.etudiantId, { etudiantId: r.etudiantId, prenom: r.prenom, nom: r.nom, matricule: r.matricule, classe: r.classe, acc: new Map(), nbNotes: 0 });
    }
    const s = students.get(r.etudiantId);
    const w = E.weights[r.type] ?? 1;
    const a = s.acc.get(r.moduleId) || { sum: 0, w: 0 };
    a.sum += Number(r.valeur) * w;
    a.w += w;
    s.acc.set(r.moduleId, a);
    s.nbNotes += 1;
  }

  const items = [...students.values()].map((s) => {
    const parModule = {};
    let num = 0;
    let den = 0;
    let plain = 0;
    s.acc.forEach((a, moduleId) => {
      const avg = a.sum / a.w;
      parModule[moduleId] = round2(avg);
      const coef = modules.get(moduleId).coefficient;
      num += avg * coef;
      den += coef;
      plain += avg;
    });
    const generale = den > 0 ? num / den : (s.acc.size ? plain / s.acc.size : null);
    return {
      etudiantId: s.etudiantId, prenom: s.prenom, nom: s.nom, matricule: s.matricule, classe: s.classe,
      nbNotes: s.nbNotes, parModule, generale: generale === null ? null : round2(generale),
    };
  }).sort((a, b) => (b.generale ?? -1) - (a.generale ?? -1));

  return { modules: [...modules.values()].sort((a, b) => a.code.localeCompare(b.code)), items };
}

// ---------- Fichiers ----------
async function travailFile(id) {
  const t = await Travail.findByPk(id, { attributes: ['id', 'fichier', 'nomOriginal'] });
  if (!t?.fichier) throw new ApiError(404, 'Aucun fichier joint à cette évaluation.');
  return { path: path.join(cfg.paths.travaux, path.basename(t.fichier)), name: t.nomOriginal || t.fichier };
}

async function renduFile(id, etudiantId) {
  const [r] = await q('SELECT fichier, nom_original AS nomOriginal FROM rendus WHERE travail_id = :id AND etudiant_id = :eid', { id, eid: etudiantId });
  if (!r?.fichier) throw new ApiError(404, 'Aucun fichier rendu par cet étudiant.');
  return { path: path.join(cfg.paths.rendus, path.basename(r.fichier)), name: r.nomOriginal || r.fichier };
}

module.exports = { list, detail, create, update, remove, saveNotes, moyennes, travailFile, renduFile };