// backend/src/services/seedService.js
const bcrypt = require('bcrypt');
const env = require('../config/env');
const logger = require('../utils/logger');
const { User } = require('../models');

// Crée l'administrateur par défaut (hash bcrypt pré-inséré) s'il n'existe pas
async function seedAdmin() {
  const exists = await User.findOne({ where: { email: env.admin.email } });
  if (exists) {
    logger.info('SEED', `Administrateur déjà présent : ${env.admin.email}`);
    return;
  }

  const motDePasse = await bcrypt.hash(env.admin.password, env.bcryptRounds);
  await User.create({
    role: 'admin',
    prenom: env.admin.prenom,
    nom: env.admin.nom,
    email: env.admin.email,
    motDePasse,
    photo: env.uploads.defaultPhoto,
    estVerifie: true,
  });
  logger.success('SEED', `Administrateur créé : ${env.admin.prenom} ${env.admin.nom} (${env.admin.email})`);
}

module.exports = { seedAdmin };