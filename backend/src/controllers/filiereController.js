// backend/src/controllers/filiereController.js
const { literal } = require('sequelize');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Filiere, Classe } = require('../models');

const OPTIONS = {
  attributes: {
    include: [[literal("(SELECT COUNT(*) FROM users u WHERE u.filiere_id = `Filiere`.`id` AND u.role = 'etudiant')"), 'nbEtudiants']],
  },
  include: [{ model: Classe, as: 'classes', attributes: ['id', 'nom'], through: { attributes: [] } }],
};

const load = (id) => Filiere.findByPk(id, OPTIONS);

exports.list = asyncHandler(async (req, res) => {
  const items = await Filiere.findAll({ ...OPTIONS, order: [['niveau', 'ASC'], ['nom', 'ASC']] });
  res.json({ success: true, data: items });
});

exports.create = asyncHandler(async (req, res) => {
  const filiere = await Filiere.create({
    nom: req.body.nom,
    niveau: req.body.niveau,
    description: req.body.description || null,
  });
  logger.success('FILIERE', `Création : ${filiere.nom}`);
  res.status(201).json({ success: true, data: await load(filiere.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const filiere = await Filiere.findByPk(req.params.id);
  if (!filiere) throw new ApiError(404, 'Filière introuvable.');
  await filiere.update({
    nom: req.body.nom,
    niveau: req.body.niveau,
    description: req.body.description || null,
  });
  logger.info('FILIERE', `Modification : ${filiere.nom}`);
  res.json({ success: true, data: await load(filiere.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  const filiere = await Filiere.findByPk(req.params.id);
  if (!filiere) throw new ApiError(404, 'Filière introuvable.');
  await filiere.destroy();
  logger.warn('FILIERE', `Suppression : ${filiere.nom}`);
  res.json({ success: true });
});