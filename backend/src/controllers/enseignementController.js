// backend/src/controllers/enseignementController.js
const { Op } = require('sequelize');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { Enseignement, Module, User, Classe, Filiere, Groupe } = require('../models');
const svc = require('../services/enseignementService');

const TARGET_MODEL = { classe: Classe, filiere: Filiere, groupe: Groupe };
const WITH_COUNT = { include: [[svc.NB_ETUDIANTS, 'nbEtudiants']] };

const load = (id) => Enseignement.findByPk(id, { attributes: WITH_COUNT, include: svc.INCLUDES });

async function assertTarget(type, id) {
  const found = type === 'etudiant'
    ? await User.findOne({ where: { id, role: 'etudiant' } })
    : await TARGET_MODEL[type].findByPk(id);
  if (!found) throw new ApiError(400, 'Le public choisi est introuvable.');
}

// Une même assignation ne peut pas être créée deux fois (§ 5.3)
async function assertNotDuplicate(where, exceptId) {
  const exists = await Enseignement.findOne({ where: exceptId ? { ...where, id: { [Op.ne]: exceptId } } : where });
  if (exists) throw new ApiError(409, 'Cette assignation existe déjà (même module, professeur, public et année).');
}

async function loadProfesseur(id) {
  const prof = await User.findOne({ where: { id, role: 'professeur' } });
  if (!prof) throw new ApiError(400, 'Professeur introuvable.');
  return prof;
}

// Un professeur en congé est signalé lors des assignations (§ 4.2)
const warning = (prof) => (prof.statut === cfg.statutConge ? `${prof.prenom} ${prof.nom} est actuellement en congé.` : null);

exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.moduleId) where.moduleId = Number(req.query.moduleId);
  if (req.query.professeurId) where.professeurId = Number(req.query.professeurId);
  if (cfg.publicTypes.includes(req.query.publicType)) where.publicType = req.query.publicType;

  const items = await Enseignement.findAll({
    where,
    attributes: WITH_COUNT,
    include: svc.INCLUDES,
    order: [[{ model: Module, as: 'module' }, 'code', 'ASC'], ['id', 'ASC']],
  });
  res.json({ success: true, data: items.map(svc.serialize) });
});

// Listes pour les formulaires (assignations, filtres de l'emploi du temps)
exports.options = asyncHandler(async (req, res) => {
  const [modules, professeurs, classes, filieres, groupes] = await Promise.all([
    Module.findAll({ attributes: ['id', 'code', 'nom'], order: [['code', 'ASC']] }),
    User.findAll({ where: { role: 'professeur' }, attributes: ['id', 'prenom', 'nom', 'statut', 'specialite'], order: [['nom', 'ASC'], ['prenom', 'ASC']] }),
    Classe.findAll({ attributes: ['id', 'nom', 'salle'], order: [['nom', 'ASC']] }),
    Filiere.findAll({ attributes: ['id', 'nom', 'niveau'], order: [['nom', 'ASC']] }),
    Groupe.findAll({ attributes: ['id', 'nom', 'classeId'], order: [['nom', 'ASC']] }),
  ]);
  res.json({
    success: true,
    data: {
      modules,
      professeurs: professeurs.map((p) => ({ ...p.toJSON(), enConge: p.statut === cfg.statutConge })),
      classes,
      filieres,
      groupes,
    },
  });
});

// Recherche d'étudiants (cours individuel, filtres)
exports.lookupEtudiants = asyncHandler(async (req, res) => {
  const where = { role: 'etudiant' };
  const search = String(req.query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    where[Op.or] = [
      { prenom: { [Op.like]: like } },
      { nom: { [Op.like]: like } },
      { matricule: { [Op.like]: like } },
    ];
  }
  const items = await User.findAll({
    where,
    attributes: ['id', 'prenom', 'nom', 'matricule'],
    include: [{ model: Classe, as: 'classe', attributes: ['id', 'nom'] }],
    order: [['nom', 'ASC'], ['prenom', 'ASC']],
    limit: cfg.lookupLimit,
  });
  res.json({ success: true, data: items });
});

exports.create = asyncHandler(async (req, res) => {
  const { moduleId, professeurId, publicType, cibleId } = req.body;
  if (!(await Module.findByPk(moduleId))) throw new ApiError(400, 'Module introuvable.');
  const prof = await loadProfesseur(professeurId);
  await assertTarget(publicType, cibleId);

  const anneeAcademique = req.body.anneeAcademique || cfg.academicYear;
  const target = { [svc.TARGET_FIELD[publicType]]: cibleId };
  await assertNotDuplicate({ moduleId, professeurId, publicType, anneeAcademique, ...target });

  const created = await Enseignement.create({ moduleId, professeurId, publicType, anneeAcademique, ...target });
  logger.success('ENSEIGNEMENT', `Assignation créée : module ${moduleId} / professeur ${prof.email} / ${publicType} ${cibleId}`);
  res.status(201).json({ success: true, data: svc.serialize(await load(created.id)), avertissement: warning(prof) });
});

// Seuls le professeur et l'année peuvent changer : le public et le module sont fixes
exports.update = asyncHandler(async (req, res) => {
  const ens = await Enseignement.findByPk(req.params.id);
  if (!ens) throw new ApiError(404, 'Assignation introuvable.');
  const prof = await loadProfesseur(req.body.professeurId);

  const anneeAcademique = req.body.anneeAcademique || ens.anneeAcademique;
  await assertNotDuplicate({
    moduleId: ens.moduleId,
    professeurId: prof.id,
    publicType: ens.publicType,
    anneeAcademique,
    [svc.TARGET_FIELD[ens.publicType]]: ens[svc.TARGET_FIELD[ens.publicType]],
  }, ens.id);

  await ens.update({ professeurId: prof.id, anneeAcademique });
  logger.info('ENSEIGNEMENT', `Assignation modifiée : #${ens.id} (professeur ${prof.email})`);
  res.json({ success: true, data: svc.serialize(await load(ens.id)), avertissement: warning(prof) });
});

// Les créneaux, séances, devoirs, notes et avis liés sont supprimés (clés étrangères)
exports.remove = asyncHandler(async (req, res) => {
  const ens = await Enseignement.findByPk(req.params.id);
  if (!ens) throw new ApiError(404, 'Assignation introuvable.');
  await ens.destroy();
  logger.warn('ENSEIGNEMENT', `Assignation supprimée : #${ens.id}`);
  res.json({ success: true });
});