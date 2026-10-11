// backend/src/services/documentService.js
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Document, Enseignement, Module, Classe } = require('../models');
const ens = require('./enseignementService');
const notifications = require('./notificationService');

const D = cfg.documents;
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const removeFile = (name) => { if (name) fs.unlink(path.join(cfg.paths.documents, path.basename(name)), () => {}); };

const FROM = `FROM documents d
  LEFT JOIN modules m ON m.id = d.module_id
  LEFT JOIN classes c ON c.id = d.classe_id
  LEFT JOIN users u ON u.id = d.uploader_id`;

const COLUMNS = `d.id, d.titre, d.description, d.type, (d.fichier IS NOT NULL) AS aFichier, d.nom_original AS nomOriginal,
  d.taille, d.lien, d.module_id AS moduleId, m.code AS moduleCode, m.nom AS moduleNom,
  d.classe_id AS classeId, c.nom AS classeNom, d.est_archive AS estArchive, d.created_at AS createdAt,
  CONCAT(u.prenom, ' ', u.nom) AS auteur`;

const shape = (r) => ({
  ...r,
  aFichier: Boolean(Number(r.aFichier)),
  taille: r.taille === null ? null : Number(r.taille),
  estArchive: Boolean(Number(r.estArchive)),
});

async function rowById(id) {
  const [row] = await q(`SELECT ${COLUMNS} ${FROM} WHERE d.id = :id`, { id });
  if (!row) throw new ApiError(404, 'Document introuvable.');
  return shape(row);
}

async function list(f, { page, limit }) {
  const where = [];
  const rep = {};
  const add = (cond, key, value) => { where.push(cond); rep[key] = value; };
  if (D.types.includes(f.type)) add('d.type = :type', 'type', f.type);
  if (asId(f.moduleId)) add('d.module_id = :moduleId', 'moduleId', asId(f.moduleId));
  if (asId(f.classeId)) add('d.classe_id = :classeId', 'classeId', asId(f.classeId));
  if (asId(f.uploaderId)) add('d.uploader_id = :uploaderId', 'uploaderId', asId(f.uploaderId));
  if (f.archive === 'true') where.push('d.est_archive = 1');
  else if (f.archive !== 'all') where.push('d.est_archive = 0');
  if (f.q && String(f.q).trim()) add('(d.titre LIKE :q OR d.description LIKE :q)', 'q', `%${String(f.q).trim()}%`);

  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [{ total }] = await q(`SELECT COUNT(*) AS total ${FROM} ${W}`, rep);
  const rows = await q(
    `SELECT ${COLUMNS} ${FROM} ${W} ORDER BY d.created_at DESC, d.id DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  return { items: rows.map(shape), total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)) };
}

async function checkTargets(moduleId, classeId) {
  if (moduleId && !(await Module.count({ where: { id: moduleId } }))) throw new ApiError(400, 'Module introuvable.');
  if (classeId && !(await Classe.count({ where: { id: classeId } }))) throw new ApiError(400, 'Classe introuvable.');
}

async function notifyNew(d, user) {
  if (!D.autoNotify) return;
  try {
    const ids = new Set();
    if (d.classeId) {
      (await q("SELECT id FROM users WHERE role = 'etudiant' AND classe_id = :id", { id: d.classeId })).forEach((r) => ids.add(r.id));
    } else if (d.moduleId) {
      const list = await Enseignement.findAll({ where: { moduleId: d.moduleId } });
      for (const e of list) (await ens.studentIdsFor(e)).forEach((id) => ids.add(id));
    }
    if (!ids.size) return;
    await notifications.send({
      titre: `Nouveau document : ${d.titre}`,
      message: `${d.description ? `${d.description}\n` : ''}Un nouveau document est disponible.`,
      type: 'information',
      userIds: [...ids],
      createdBy: user.id,
    });
  } catch (err) {
    logger.warn('DOC', `Notification non envoyée : ${err.message}`);
  }
}

async function create(body, file, user) {
  try {
    const lien = body.lien ? String(body.lien).trim() : null;
    if (!file && !lien) throw new ApiError(400, 'Joignez un fichier ou indiquez un lien.');
    const moduleId = asId(body.moduleId);
    const classeId = asId(body.classeId);
    await checkTargets(moduleId, classeId);

    const d = await Document.create({
      titre: body.titre,
      description: body.description || null,
      type: body.type,
      fichier: file ? file.filename : null,
      nomOriginal: file ? file.nomOriginal : null,
      taille: file ? file.size : null,
      lien,
      moduleId,
      classeId,
      uploaderId: user.id,
    });
    logger.success('DOC', `Document ajouté : #${d.id} « ${d.titre} » par ${user.email}`);
    await notifyNew(d, user);
    return await rowById(d.id);
  } catch (err) {
    removeFile(file?.filename);
    throw err;
  }
}

async function update(id, body, file, retirer) {
  try {
    const d = await Document.findByPk(id);
    if (!d) throw new ApiError(404, 'Document introuvable.');
    const lien = body.lien ? String(body.lien).trim() : null;
    const keepsFile = file ? true : (retirer ? false : Boolean(d.fichier));
    if (!keepsFile && !lien) throw new ApiError(400, 'Un document doit avoir un fichier ou un lien.');
    const moduleId = asId(body.moduleId);
    const classeId = asId(body.classeId);
    await checkTargets(moduleId, classeId);

    const old = d.fichier;
    const data = { titre: body.titre, description: body.description || null, type: body.type, lien, moduleId, classeId };
    if (file) Object.assign(data, { fichier: file.filename, nomOriginal: file.nomOriginal, taille: file.size });
    else if (retirer) Object.assign(data, { fichier: null, nomOriginal: null, taille: null });
    await d.update(data);
    if ((file || retirer) && old) removeFile(old);
    logger.info('DOC', `Document modifié : #${id}`);
    return await rowById(id);
  } catch (err) {
    removeFile(file?.filename);
    throw err;
  }
}

async function setArchive(id, flag) {
  const d = await Document.findByPk(id);
  if (!d) throw new ApiError(404, 'Document introuvable.');
  await d.update({ estArchive: flag });
  logger.info('DOC', `Document #${id} ${flag ? 'archivé' : 'désarchivé'}`);
  return rowById(id);
}

async function remove(id) {
  const d = await Document.findByPk(id);
  if (!d) throw new ApiError(404, 'Document introuvable.');
  await d.destroy();
  removeFile(d.fichier);
  logger.warn('DOC', `Document supprimé : #${id}`);
}

async function fileOf(id) {
  const d = await Document.findByPk(id, { attributes: ['id', 'fichier', 'nomOriginal'] });
  if (!d?.fichier) throw new ApiError(404, 'Aucun fichier joint à ce document.');
  return { path: path.join(cfg.paths.documents, path.basename(d.fichier)), name: d.nomOriginal || d.fichier };
}

module.exports = { list, create, update, setArchive, remove, fileOf };