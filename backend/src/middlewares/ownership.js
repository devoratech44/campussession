// backend/src/middlewares/ownership.js
const fs = require('fs');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const ApiError = require('../utils/ApiError');
const { Travail, Enseignement, Document, Note } = require('../models');
const ens = require('../services/enseignementService');

const dropFile = (req) => { if (req.file) fs.unlink(req.file.path, () => {}); };

// L'évaluation appartient à une assignation du professeur connecté
exports.travail = async (req, res, next) => {
  try {
    const t = await Travail.findByPk(req.params.id, { attributes: ['id', 'enseignementId'] });
    if (!t) throw new ApiError(404, 'Évaluation introuvable.');
    const e = await Enseignement.findByPk(t.enseignementId, { attributes: ['id', 'professeurId'] });
    if (!e || e.professeurId !== req.user.id) throw new ApiError(403, "Cette évaluation n'est pas la vôtre.");
    next();
  } catch (err) { next(err); }
};

// Création : l'assignation choisie doit être la sienne
exports.enseignementInBody = async (req, res, next) => {
  try {
    const e = await Enseignement.findByPk(req.body.enseignementId, { attributes: ['id', 'professeurId'] });
    if (!e || e.professeurId !== req.user.id) throw new ApiError(403, "Cette assignation n'est pas la vôtre.");
    next();
  } catch (err) { dropFile(req); next(err); }
};

// Une note déjà saisie ne se corrige que par l'administrateur (sauf PROF_CAN_EDIT_NOTES=true)
exports.notesLocked = async (req, res, next) => {
  try {
    if (cfg.professeur.canEditNotes) return next();
    const existing = await Note.findAll({ where: { travailId: req.params.id }, attributes: ['etudiantId', 'valeur', 'commentaire'] });
    const map = new Map(existing.map((n) => [n.etudiantId, n]));
    for (const it of req.body.notes) {
      const old = map.get(Number(it.etudiantId));
      if (!old) continue;
      const empty = it.valeur === null || it.valeur === undefined || String(it.valeur).trim() === '';
      const same = !empty
        && Number(String(it.valeur).replace(',', '.')) === Number(old.valeur)
        && String(it.commentaire || '') === String(old.commentaire || '');
      if (!same) throw new ApiError(403, 'Une note déjà saisie ne peut être corrigée que par l’administrateur.');
    }
    return next();
  } catch (err) { return next(err); }
};

// Le document a été déposé par le professeur connecté
exports.document = async (req, res, next) => {
  try {
    const d = await Document.findByPk(req.params.id, { attributes: ['id', 'uploaderId'] });
    if (!d) throw new ApiError(404, 'Document introuvable.');
    if (d.uploaderId !== req.user.id) throw new ApiError(403, "Ce document n'est pas le vôtre.");
    next();
  } catch (err) { next(err); }
};

// Dépôt : un de ses modules, et une classe de ses étudiants (facultative)
exports.documentTargets = async (req, res, next) => {
  try {
    const moduleId = parseInt(req.body.moduleId, 10);
    if (!Number.isInteger(moduleId) || moduleId < 1) throw new ApiError(400, 'Choisissez un de vos modules.');
    const list = await Enseignement.findAll({ where: { professeurId: req.user.id } });
    if (!list.some((e) => e.moduleId === moduleId)) throw new ApiError(403, "Ce module ne fait pas partie de vos cours.");

    const classeId = parseInt(req.body.classeId, 10);
    if (Number.isInteger(classeId) && classeId > 0) {
      const ids = new Set();
      for (const e of list) (await ens.studentIdsFor(e)).forEach((id) => ids.add(id));
      const rows = ids.size
        ? await sequelize.query('SELECT DISTINCT classe_id AS id FROM users WHERE id IN (:ids) AND classe_id IS NOT NULL', { replacements: { ids: [...ids] }, type: QueryTypes.SELECT })
        : [];
      if (!rows.some((r) => r.id === classeId)) throw new ApiError(403, "Cette classe ne fait pas partie de vos étudiants.");
    }
    next();
  } catch (err) { dropFile(req); next(err); }
};