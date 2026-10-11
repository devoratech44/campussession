// backend/src/services/etudiantTravauxService.js
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Enseignement } = require('../models');
const ens = require('./enseignementService');
const evaluations = require('./evaluationService');
const documents = require('./documentService');
const notifications = require('./notificationService');

const E = cfg.evaluations;
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const dropFile = (name) => { if (name) fs.unlink(path.join(cfg.paths.rendus, path.basename(name)), () => {}); };
const TYPE_LABEL = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };

// Enseignements de l'étudiant (classe, filière, groupes, cours individuels)
async function scope(user) {
  const list = await Enseignement.findAll({ where: await ens.whereForStudent(user), attributes: ['id', 'moduleId', 'professeurId'] });
  return { ids: list.map((e) => e.id), moduleIds: [...new Set(list.map((e) => e.moduleId))] };
}

const SELECT = `SELECT t.id, t.enseignement_id AS enseignementId, t.type, t.numero_tp AS numeroTp, t.titre, t.consignes,
    DATE_FORMAT(t.date_travail, '%Y-%m-%d') AS dateTravail, DATE_FORMAT(t.date_limite, '%Y-%m-%dT%H:%i') AS dateLimite, (t.fichier IS NOT NULL) AS aFichier, t.nom_original AS nomOriginal,
    m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom, e.professeur_id AS professeurId, CONCAT(pr.prenom, ' ', pr.nom) AS professeur,
    r.id AS renduId, r.nom_original AS renduNom, (r.fichier IS NOT NULL) AS renduFichier, r.commentaire AS renduCommentaire,
    r.en_retard AS renduRetard, r.date_rendu AS renduAt, n.valeur AS note, n.commentaire AS noteCommentaire
  FROM travaux t
  JOIN enseignements e ON e.id = t.enseignement_id
  JOIN modules m ON m.id = e.module_id
  JOIN users pr ON pr.id = e.professeur_id
  LEFT JOIN rendus r ON r.travail_id = t.id AND r.etudiant_id = :uid
  LEFT JOIN notes n ON n.travail_id = t.id AND n.etudiant_id = :uid`;

function shape(r, now) {
  let deadline = null;
  if (r.dateLimite) deadline = new Date(`${r.dateLimite}:00Z`).getTime() + E.lateGraceHours * 3600 * 1000;
  else if (r.dateTravail) deadline = new Date(`${r.dateTravail}T23:59:59Z`).getTime() + E.lateGraceHours * 3600 * 1000;
  const depasse = deadline !== null && now > deadline;
  const rendable = r.type !== 'examen';
  const aNote = r.note !== null && r.note !== undefined;
  const rendu = r.renduId ? {
    nomOriginal: r.renduNom, aFichier: Boolean(Number(r.renduFichier)), commentaire: r.renduCommentaire,
    enRetard: Boolean(Number(r.renduRetard)), dateRendu: r.renduAt,
  } : null;

  let statut;
  if (aNote) statut = 'note';
  else if (rendu) statut = rendu.enRetard ? 'rendu_retard' : 'rendu';
  else if (!rendable) statut = 'examen';
  else statut = depasse ? 'en_retard' : 'a_rendre';

  return {
    id: r.id, type: r.type, numeroTp: r.numeroTp, titre: r.titre, consignes: r.consignes, dateTravail: r.dateTravail, dateLimite: r.dateLimite,
    aFichier: Boolean(Number(r.aFichier)), nomOriginal: r.nomOriginal,
    moduleId: r.moduleId, moduleCode: r.moduleCode, moduleNom: r.moduleNom, professeur: r.professeur, professeurId: r.professeurId,
    statut, depasse, rendable, peutRendre: rendable && !aNote,
    rendu, note: aNote ? { valeur: Number(r.note), commentaire: r.noteCommentaire } : null,
  };
}

async function fetchAll(user, ids, extra = '', rep = {}) {
  if (!ids.length) return [];
  const rows = await q(
    `${SELECT} WHERE t.enseignement_id IN (:ids) ${extra}
     ORDER BY COALESCE(t.date_travail, DATE(t.created_at)) DESC, t.id DESC LIMIT 300`,
    { ...rep, ids, uid: user.id }
  );
  const now = Date.now();
  return rows.map((r) => shape(r, now));
}

async function list(user, f) {
  const { ids } = await scope(user);
  const extra = [];
  const rep = {};
  if (E.types.includes(f.type)) { extra.push('AND t.type = :type'); rep.type = f.type; }
  if (asId(f.moduleId)) { extra.push('AND e.module_id = :moduleId'); rep.moduleId = asId(f.moduleId); }
  let items = await fetchAll(user, ids, extra.join(' '), rep);
  if (f.statut) items = items.filter((t) => t.statut === f.statut);

  const { moduleIds } = await scope(user);
  const modules = moduleIds.length ? await q('SELECT id, code, nom FROM modules WHERE id IN (:ids) ORDER BY code', { ids: moduleIds }) : [];
  return { items, modules };
}

async function get(user, id) {
  const { ids } = await scope(user);
  const [t] = await fetchAll(user, ids, 'AND t.id = :id', { id });
  if (!t) throw new ApiError(404, 'Évaluation introuvable.');
  return t;
}

// Devoirs et TP non rendus (tableau de bord)
async function pending(user, limit = 3) {
  const { ids } = await scope(user);
  const items = await fetchAll(user, ids);
  return items
    .filter((t) => t.statut === 'a_rendre' || t.statut === 'en_retard')
    .sort((a, b) => (a.dateTravail || '9999').localeCompare(b.dateTravail || '9999'))
    .slice(0, limit);
}

async function rendre(user, id, file, commentaire) {
  try {
    const t = await get(user, id);
    if (!t.rendable) throw new ApiError(409, 'Les examens ne se rendent pas ici.');
    if (t.note) throw new ApiError(409, 'Une note a déjà été saisie : le rendu ne peut plus être modifié.');
    const text = commentaire ? String(commentaire).trim().slice(0, 5000) : null;
    if (!file && !text && !t.rendu) throw new ApiError(400, 'Joignez un fichier ou écrivez un commentaire.');

    const [old] = await q('SELECT id, fichier FROM rendus WHERE travail_id = :id AND etudiant_id = :uid', { id, uid: user.id });
    const late = t.depasse ? 1 : 0;

    if (old) {
      await sequelize.query(
        `UPDATE rendus SET commentaire = :c, en_retard = :late, date_rendu = UTC_TIMESTAMP()${file ? ', fichier = :f, nom_original = :n' : ''} WHERE id = :rid`,
        { replacements: { c: text, late, f: file?.filename, n: file?.nomOriginal, rid: old.id } }
      );
      if (file) dropFile(old.fichier);
    } else {
      await sequelize.query(
        `INSERT INTO rendus (travail_id, etudiant_id, fichier, nom_original, commentaire, en_retard, date_rendu)
         VALUES (:id, :uid, :f, :n, :c, :late, UTC_TIMESTAMP())`,
        { replacements: { id, uid: user.id, f: file?.filename || null, n: file?.nomOriginal || null, c: text, late } }
      );
    }
    logger.success('RENDU', `${user.prenom} ${user.nom} (${user.matricule}) a rendu « ${t.titre} » (#${id})${late ? ' EN RETARD' : ''}`);

    if (E.autoNotify) {
      try {
        const label = t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE_LABEL[t.type];
        await notifications.send({
          titre: `Nouveau rendu : ${t.titre}`,
          message: `${user.prenom} ${user.nom} a rendu ${label} « ${t.titre} » (${t.moduleCode})${late ? ' en retard' : ''}.`,
          type: 'devoir',
          userIds: [t.professeurId],
          createdBy: user.id,
        });
      } catch (err) {
        logger.warn('RENDU', `Notification non envoyée : ${err.message}`);
      }
    }
    return await get(user, id);
  } catch (err) {
    dropFile(file?.filename);
    throw err;
  }
}

async function retirer(user, id) {
  const t = await get(user, id);
  if (t.note) throw new ApiError(409, 'Une note a déjà été saisie : le rendu ne peut plus être retiré.');
  const [old] = await q('SELECT id, fichier FROM rendus WHERE travail_id = :id AND etudiant_id = :uid', { id, uid: user.id });
  if (!old) throw new ApiError(404, 'Aucun rendu à retirer.');
  await sequelize.query('DELETE FROM rendus WHERE id = :rid', { replacements: { rid: old.id } });
  dropFile(old.fichier);
  logger.warn('RENDU', `Rendu retiré : ${user.matricule} (évaluation #${id})`);
  return get(user, id);
}

async function travailFile(user, id) {
  await get(user, id);
  return evaluations.travailFile(id);
}

async function renduFile(user, id) {
  await get(user, id);
  return evaluations.renduFile(id, user.id);
}

// ---------- Notes ----------
async function notes(user) {
  const moy = await evaluations.moyennes({ etudiantId: user.id });
  const me = moy.items[0] || null;
  const rows = await q(
    `SELECT n.valeur, n.commentaire, n.updated_at AS updatedAt, t.id AS travailId, t.titre, t.type, t.numero_tp AS numeroTp,
            m.id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom, m.coefficient
     FROM notes n JOIN travaux t ON t.id = n.travail_id JOIN enseignements e ON e.id = t.enseignement_id JOIN modules m ON m.id = e.module_id
     WHERE n.etudiant_id = :uid ORDER BY m.code ASC, n.updated_at DESC`,
    { uid: user.id }
  );
  const modules = new Map();
  rows.forEach((r) => {
    if (!modules.has(r.moduleId)) {
      modules.set(r.moduleId, {
        id: r.moduleId, code: r.moduleCode, nom: r.moduleNom, coefficient: Number(r.coefficient),
        moyenne: me?.parModule?.[r.moduleId] ?? null, notes: [],
      });
    }
    modules.get(r.moduleId).notes.push({
      travailId: r.travailId, titre: r.titre, type: r.type, numeroTp: r.numeroTp,
      valeur: Number(r.valeur), commentaire: r.commentaire, updatedAt: r.updatedAt,
    });
  });
  return { generale: me?.generale ?? null, nbNotes: rows.length, modules: [...modules.values()] };
}

// ---------- Documents ----------
async function docWhere(user, f = {}) {
  const { moduleIds } = await scope(user);
  const where = ['d.est_archive = 0', '(d.classe_id IS NULL OR d.classe_id = :classeId)'];
  const rep = { classeId: user.classeId || 0 };
  if (moduleIds.length) { where.push('(d.module_id IS NULL OR d.module_id IN (:mods))'); rep.mods = moduleIds; } else where.push('d.module_id IS NULL');
  if (cfg.documents.types.includes(f.type)) { where.push('d.type = :type'); rep.type = f.type; }
  if (asId(f.moduleId)) { where.push('d.module_id = :moduleId'); rep.moduleId = asId(f.moduleId); }
  if (f.q && String(f.q).trim()) { where.push('(d.titre LIKE :s OR d.description LIKE :s)'); rep.s = `%${String(f.q).trim()}%`; }
  return { where, rep, moduleIds };
}

async function docs(user, f, { page, limit }) {
  const { where, rep, moduleIds } = await docWhere(user, f);
  const FROM = `FROM documents d LEFT JOIN modules m ON m.id = d.module_id LEFT JOIN users u ON u.id = d.uploader_id WHERE ${where.join(' AND ')}`;
  const [{ total }] = await q(`SELECT COUNT(*) AS total ${FROM}`, rep);
  const rows = await q(
    `SELECT d.id, d.titre, d.description, d.type, (d.fichier IS NOT NULL) AS aFichier, d.nom_original AS nomOriginal, d.taille, d.lien,
            m.code AS moduleCode, m.nom AS moduleNom, d.created_at AS createdAt, CONCAT(u.prenom, ' ', u.nom) AS auteur
     ${FROM} ORDER BY d.created_at DESC, d.id DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  const modules = moduleIds.length ? await q('SELECT id, code, nom FROM modules WHERE id IN (:ids) ORDER BY code', { ids: moduleIds }) : [];
  return {
    items: rows.map((r) => ({ ...r, aFichier: Boolean(Number(r.aFichier)), taille: r.taille === null ? null : Number(r.taille) })),
    modules, total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

async function docFile(user, id) {
  const { where, rep } = await docWhere(user);
  const [ok] = await q(`SELECT d.id FROM documents d WHERE ${where.join(' AND ')} AND d.id = :id`, { ...rep, id });
  if (!ok) throw new ApiError(404, 'Document introuvable.');
  return documents.fileOf(id);
}

module.exports = { list, get, pending, rendre, retirer, travailFile, renduFile, notes, docs, docFile };