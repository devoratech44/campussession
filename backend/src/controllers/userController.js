// backend/src/controllers/userController.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');
const blockService = require('../services/blockService');
const userService = require('../services/userService');

const MANAGED_ROLES = cfg.roles.filter((r) => r !== 'admin');
const fullName = (u) => `${u.prenom} ${u.nom}`;

async function findManaged(id) {
  const user = await User.findByPk(id);
  if (!user) throw new ApiError(404, 'Utilisateur introuvable.');
  if (user.role === 'admin') throw new ApiError(403, 'Le compte administrateur se gère dans Paramètres.');
  return user;
}

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));

  const where = { role: { [Op.in]: MANAGED_ROLES } };
  if (MANAGED_ROLES.includes(req.query.role)) where.role = req.query.role;
  if (req.query.classeId) where.classeId = Number(req.query.classeId);
  if (req.query.bloques === 'true') where.estBloque = true;

  const search = String(req.query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    where[Op.and] = [{
      [Op.or]: [
        { prenom: { [Op.like]: like } },
        { nom: { [Op.like]: like } },
        { email: { [Op.like]: like } },
        { matricule: { [Op.like]: like } },
      ],
    }];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: userService.INCLUDES,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      items: await userService.serializeMany(rows),
      total: count,
      page,
      limit,
      pages: Math.max(1, Math.ceil(count / limit)),
    },
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const data = userService.pickFields(req.body, [...cfg.userFields.common, ...cfg.userFields[role]]);

  if (role === 'etudiant') await userService.assertStructure(data);
  if (role === 'professeur' && !data.statut) data.statut = cfg.statutsProfesseur[0];

  const user = await User.create({
    ...data,
    role,
    motDePasse: await bcrypt.hash(req.body.motDePasse, env.bcryptRounds),
    photo: req.file ? req.file.filename : env.uploads.defaultPhoto,
    estVerifie: false, // code à 6 chiffres à la première connexion
  });

  logger.success('USER', `Création ${role} : ${fullName(user)} (${user.matricule})`);
  res.status(201).json({ success: true, data: await userService.findOne(user.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  const data = userService.pickFields(req.body, [...cfg.userFields.common, ...cfg.userFields[user.role]]);

  let classeChanged = false;
  if (user.role === 'etudiant') {
    const touched = ['niveau', 'filiereId', 'classeId'].some((k) => k in data);
    if (touched) {
      await userService.assertStructure({
        niveau: data.niveau ?? user.niveau,
        filiereId: data.filiereId ?? user.filiereId,
        classeId: data.classeId ?? user.classeId,
      });
    }
    classeChanged = data.classeId !== undefined && Number(data.classeId) !== Number(user.classeId);
  }

  const oldPhoto = user.photo;
  if (req.file) data.photo = req.file.filename;
  else if (req.body.supprimerPhoto === 'true') data.photo = env.uploads.defaultPhoto;

  await user.update(data);
  if (data.photo && data.photo !== oldPhoto) userService.removePhotoFile(oldPhoto);
  if (classeChanged) await userService.detachFromOtherGroups(user.id, user.classeId);

  logger.info('USER', `Modification : ${fullName(user)} (${user.matricule})`);
  res.json({ success: true, data: await userService.findOne(user.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  await user.destroy();
  userService.removePhotoFile(user.photo);
  logger.warn('USER', `Suppression : ${fullName(user)} (${user.matricule})`);
  res.json({ success: true });
});

exports.setPassword = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  await user.update({ motDePasse: await bcrypt.hash(req.body.motDePasse, env.bcryptRounds) });
  logger.info('USER', `Nouveau mot de passe défini par l'administrateur : ${user.email}`);
  res.json({ success: true });
});

exports.block = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  if (user.estBloque) throw new ApiError(400, 'Ce compte est déjà bloqué.');
  await user.update({ estBloque: true, blocageAuto: false, motifBlocage: req.body.motif, lastSeenAt: null });
  logger.warn('BLOCK', `Blocage manuel : ${user.email} (${req.body.motif})`);
  res.json({ success: true, data: await userService.findOne(user.id) });
});

exports.unblock = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  if (!user.estBloque) throw new ApiError(400, "Ce compte n'est pas bloqué.");

  // § 3.6 : un étudiant qui dépasse encore les seuils serait rebloqué à la connexion suivante
  if (user.role === 'etudiant') {
    const counters = await blockService.getCounters(user.id);
    if (blockService.exceeds(counters)) {
      throw new ApiError(
        409,
        `Cet étudiant dépasse encore les seuils (${counters.retards} retard(s) et ${counters.absences} absence(s) non justifiés). Justifiez d'abord les absences et retards concernés, sinon le compte serait rebloqué à la connexion suivante.`,
        { code: 'THRESHOLD_EXCEEDED', ...counters }
      );
    }
  }

  await user.update({ estBloque: false, blocageAuto: false, motifBlocage: null });
  logger.success('BLOCK', `Déblocage : ${user.email}`);
  res.json({ success: true, data: await userService.findOne(user.id) });
});

// § 3.3 : remet le compte en état « code requis »
exports.forceCode = asyncHandler(async (req, res) => {
  const user = await findManaged(req.params.id);
  await user.update({
    estVerifie: false, codeHash: null, codeExpiresAt: null, codeAttempts: 0, codeSentAt: null, lastSeenAt: null,
  });
  logger.warn('AUTH', `Code de vérification forcé : ${user.email}`);
  res.json({ success: true, data: await userService.findOne(user.id) });
});