// backend/src/controllers/groupeController.js
const { literal } = require('sequelize');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Groupe, Classe, Filiere, User } = require('../models');

const BASE_INCLUDES = [
  { model: Classe, as: 'classe', attributes: ['id', 'nom'] },
  { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
];
const COUNT = [literal('(SELECT COUNT(*) FROM groupe_etudiants ge WHERE ge.groupe_id = `Groupe`.`id`)'), 'nbMembres'];
const MEMBRES = { model: User, as: 'membres', attributes: ['id', 'prenom', 'nom', 'matricule', 'photo'], through: { attributes: [] } };

const toJson = (g) => {
  const data = g.toJSON();
  data.nbMembres = Number(data.nbMembres);
  return data;
};

const load = async (id, withMembers = false) => {
  const g = await Groupe.findByPk(id, {
    attributes: { include: [COUNT] },
    include: withMembers ? [...BASE_INCLUDES, MEMBRES] : BASE_INCLUDES,
  });
  return g ? toJson(g) : null;
};

async function assertFiliere(classeId, filiereId) {
  const classe = await Classe.findByPk(classeId, { include: [{ model: Filiere, as: 'filieres', attributes: ['id'] }] });
  if (!classe) throw new ApiError(400, 'Classe introuvable.');
  if (filiereId && !classe.filieres.some((f) => f.id === Number(filiereId))) {
    throw new ApiError(400, "Cette filière n'appartient pas à la classe.");
  }
}

// Les membres doivent être des étudiants de la classe du groupe (§ 5.2)
async function resolveMembers(classeId, raw = []) {
  const ids = [...new Set(raw.map(Number))];
  if (!ids.length) return [];
  const count = await User.count({ where: { id: ids, role: 'etudiant', classeId } });
  if (count !== ids.length) throw new ApiError(400, "Un étudiant sélectionné n'appartient pas à la classe du groupe.");
  return ids;
}

exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.classeId) where.classeId = Number(req.query.classeId);
  const items = await Groupe.findAll({
    where,
    attributes: { include: [COUNT] },
    include: BASE_INCLUDES,
    order: [['nom', 'ASC']],
  });
  res.json({ success: true, data: items.map(toJson) });
});

exports.get = asyncHandler(async (req, res) => {
  const data = await load(req.params.id, true);
  if (!data) throw new ApiError(404, 'Groupe introuvable.');
  res.json({ success: true, data });
});

// Étudiants sélectionnables : ceux de la classe
exports.candidats = asyncHandler(async (req, res) => {
  const classeId = Number(req.query.classeId);
  if (!classeId) throw new ApiError(400, 'Choisissez une classe.');
  const items = await User.findAll({
    where: { role: 'etudiant', classeId },
    attributes: ['id', 'prenom', 'nom', 'matricule', 'photo'],
    order: [['nom', 'ASC'], ['prenom', 'ASC']],
  });
  res.json({ success: true, data: items });
});

exports.create = asyncHandler(async (req, res) => {
  const { classeId, nom, description, membreIds } = req.body;
  const filiereId = req.body.filiereId || null;
  await assertFiliere(classeId, filiereId);
  const ids = await resolveMembers(classeId, membreIds);

  const groupe = await Groupe.create({ nom, description: description || null, classeId, filiereId });
  await groupe.setMembres(ids);
  logger.success('GROUPE', `Création : ${groupe.nom} (${ids.length} membre(s))`);
  res.status(201).json({ success: true, data: await load(groupe.id) });
});

// La classe d'un groupe n'est pas modifiable après création (§ 5.2)
exports.update = asyncHandler(async (req, res) => {
  const groupe = await Groupe.findByPk(req.params.id);
  if (!groupe) throw new ApiError(404, 'Groupe introuvable.');
  const filiereId = req.body.filiereId || null;
  await assertFiliere(groupe.classeId, filiereId);
  const ids = await resolveMembers(groupe.classeId, req.body.membreIds);

  await groupe.update({ nom: req.body.nom, description: req.body.description || null, filiereId });
  if (req.body.membreIds !== undefined) await groupe.setMembres(ids);
  logger.info('GROUPE', `Modification : ${groupe.nom}`);
  res.json({ success: true, data: await load(groupe.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  const groupe = await Groupe.findByPk(req.params.id);
  if (!groupe) throw new ApiError(404, 'Groupe introuvable.');
  await groupe.destroy();
  logger.warn('GROUPE', `Suppression : ${groupe.nom}`);
  res.json({ success: true });
});