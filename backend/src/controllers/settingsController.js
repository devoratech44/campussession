// backend/src/controllers/settingsController.js
const bcrypt = require('bcrypt');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');
const authService = require('../services/authService');
const userService = require('../services/userService');

// Listes et règles utiles aux formulaires (aucune valeur codée en dur côté frontend)
exports.meta = (req, res) => {
  res.json({
    success: true,
    data: {
      genres: cfg.genres,
      niveaux: cfg.niveaux,
      etatsAcademiques: cfg.etatsAcademiques,
      statutsProfesseur: cfg.statutsProfesseur,
      password: cfg.password,
      academicYear: cfg.academicYear,
      blocking: cfg.blocking,
      onlineThresholdSeconds: cfg.onlineThresholdSeconds,
      maxTp: cfg.maxTpPerEnseignement,
      publicTypes: cfg.publicTypes,
      schedule: cfg.schedule,
      sessions: {
        openBeforeMin: cfg.sessions.openBeforeMin,
        closeAfterMin: cfg.sessions.closeAfterMin,
        lateGraceMin: cfg.sessions.lateGraceMin,
        reopenDefaultMin: cfg.sessions.reopenDefaultMin,
        reopenMaxMin: cfg.sessions.reopenMaxMin,
        retardMaxMin: cfg.sessions.retardMaxMin,
        codeLength: cfg.sessions.codeLength,
      },
    },
  });
};

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const data = userService.pickFields(req.body, cfg.profileFields[user.role]);

  const oldPhoto = user.photo;
  if (req.file) data.photo = req.file.filename;
  else if (req.body.supprimerPhoto === 'true') data.photo = env.uploads.defaultPhoto;

  await user.update(data);
  if (data.photo && data.photo !== oldPhoto) userService.removePhotoFile(oldPhoto);

  logger.info('SETTINGS', `Profil modifié : ${user.email} (${user.role})`);
  res.json({ success: true, data: await authService.loadPublicUser(user.id) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.unscoped().findByPk(req.user.id);
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;

  if (!(await bcrypt.compare(ancienMotDePasse, user.motDePasse))) {
    throw new ApiError(400, 'Mot de passe actuel incorrect.');
  }
  if (ancienMotDePasse === nouveauMotDePasse) {
    throw new ApiError(400, "Le nouveau mot de passe doit être différent de l'ancien.");
  }

  await user.update({ motDePasse: await bcrypt.hash(nouveauMotDePasse, env.bcryptRounds) });
  logger.info('SETTINGS', `Mot de passe modifié : ${user.email}`);
  res.json({ success: true });
});