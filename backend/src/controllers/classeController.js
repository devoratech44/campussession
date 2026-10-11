// backend/src/controllers/classeController.js
const { literal } = require('sequelize');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Classe, Filiere } = require('../models');

const OPTIONS = {
  attributes: {
    include: [[literal("(SELECT COUNT(*) FROM users u WHERE u.classe_id = `Classe`.`id` AND u.role = 'etudiant')"), 'nbEtudiants']],
  },
  include: [{ model: Filiere, as: 'filieres', attributes: ['id', 'nom', 'niveau'], through: { attributes: [] } }],
};

const load = (id) => Classe.findByPk(id, OPTIONS);

async function resolveFiliereIds(raw) {
  const ids = [...new Set(raw.map(Number))];
  if ((await Filiere.count({ where: { id: ids } })) !== ids.length) {
    throw new ApiError(400, 'Une filière sélectionnée est introuvable.');
  }
  return ids;
}

exports.list = asyncHandler(async (req, res) => {
  const items = await Classe.findAll({ ...OPTIONS, order: [['nom', 'ASC']] });
  res.json({ success: true, data: items });
});

exports.create = asyncHandler(async (req, res) => {
  const ids = await resolveFiliereIds(req.body.filiereIds);
  const classe = await Classe.create({
    nom: req.body.nom,
    salle: req.body.salle || null,
    anneeAcademique: req.body.anneeAcademique || cfg.academicYear,
  });
  await classe.setFilieres(ids);
  logger.success('CLASSE', `Création : ${classe.nom}`);
  res.status(201).json({ success: true, data: await load(classe.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const classe = await Classe.findByPk(req.params.id);
  if (!classe) throw new ApiError(404, 'Classe introuvable.');
  const ids = await resolveFiliereIds(req.body.filiereIds);
  await classe.update({
    nom: req.body.nom,
    salle: req.body.salle || null,
    anneeAcademique: req.body.anneeAcademique || cfg.academicYear,
  });
  await classe.setFilieres(ids);
  logger.info('CLASSE', `Modification : ${classe.nom}`);
  res.json({ success: true, data: await load(classe.id) });
});

// § 5.1 : les étudiants sont détachés, les groupes et assignations supprimés (clés étrangères)
exports.remove = asyncHandler(async (req, res) => {
  const classe = await Classe.findByPk(req.params.id);
  if (!classe) throw new ApiError(404, 'Classe introuvable.');
  await classe.destroy();
  logger.warn('CLASSE', `Suppression : ${classe.nom}`);
  res.json({ success: true });
});