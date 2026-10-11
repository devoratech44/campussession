// backend/src/controllers/moduleController.js
const { literal, Op } = require('sequelize');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Module } = require('../models');

const OPTIONS = {
  attributes: {
    include: [[literal('(SELECT COUNT(*) FROM enseignements e WHERE e.module_id = `Module`.`id`)'), 'nbAssignations']],
  },
};

const toJson = (m) => {
  const data = m.toJSON();
  data.nbAssignations = Number(data.nbAssignations);
  return data;
};

const load = async (id) => toJson(await Module.findByPk(id, OPTIONS));

async function assertUniqueCode(code, exceptId) {
  const where = exceptId ? { code, id: { [Op.ne]: exceptId } } : { code };
  if (await Module.findOne({ where })) throw new ApiError(409, 'Ce code de module est déjà utilisé.');
}

exports.list = asyncHandler(async (req, res) => {
  const items = await Module.findAll({ ...OPTIONS, order: [['code', 'ASC']] });
  res.json({ success: true, data: items.map(toJson) });
});

exports.create = asyncHandler(async (req, res) => {
  await assertUniqueCode(req.body.code);
  const module = await Module.create({
    code: req.body.code,
    nom: req.body.nom,
    description: req.body.description || null,
    coefficient: req.body.coefficient,
    volumeHoraire: req.body.volumeHoraire || 0,
  });
  logger.success('MODULE', `Création : ${module.code} - ${module.nom}`);
  res.status(201).json({ success: true, data: await load(module.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const module = await Module.findByPk(req.params.id);
  if (!module) throw new ApiError(404, 'Module introuvable.');
  await assertUniqueCode(req.body.code, module.id);
  await module.update({
    code: req.body.code,
    nom: req.body.nom,
    description: req.body.description || null,
    coefficient: req.body.coefficient,
    volumeHoraire: req.body.volumeHoraire || 0,
  });
  logger.info('MODULE', `Modification : ${module.code}`);
  res.json({ success: true, data: await load(module.id) });
});

// Les assignations, séances, devoirs, notes et avis liés sont supprimés (clés étrangères)
exports.remove = asyncHandler(async (req, res) => {
  const module = await Module.findByPk(req.params.id);
  if (!module) throw new ApiError(404, 'Module introuvable.');
  await module.destroy();
  logger.warn('MODULE', `Suppression : ${module.code}`);
  res.json({ success: true });
});