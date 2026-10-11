// backend/src/services/authService.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { User, Classe, Filiere } = require('../models');
const mailService = require('./mailService');
const blockService = require('./blockService');

const GENERIC_ERROR = 'Identifiant ou mot de passe incorrect.';
const DUMMY_HASH = bcrypt.hashSync('campus-session-dummy', env.bcryptRounds); // égalise le temps de réponse

const signSession = (user) =>
  jwt.sign({ id: user.id, role: user.role, purpose: 'session' }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
const signTemp = (user) =>
  jwt.sign({ id: user.id, purpose: 'verify' }, env.jwt.secret, { expiresIn: env.jwt.tempExpiresIn });

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

const blockedError = (motif) => new ApiError(403, 'Compte bloqué', { code: 'ACCOUNT_BLOCKED', motif });

// Utilisateur "public" (sans mot de passe ni code) avec sa classe et sa filière
async function loadPublicUser(id) {
  const user = await User.findByPk(id, {
    include: [
      { model: Classe, as: 'classe', attributes: ['id', 'nom', 'salle'] },
      { model: Filiere, as: 'filiere', attributes: ['id', 'nom', 'niveau'] },
    ],
  });
  if (!user) return null;
  const data = user.toJSON();
  ['codeExpiresAt', 'codeAttempts', 'codeSentAt'].forEach((k) => delete data[k]);
  return data;
}

// Règles d'identifiant : admin = email, étudiant = matricule, professeur = email ou matricule
async function findForLogin(identifiant) {
  const value = String(identifiant).trim();
  const user = await User.unscoped().findOne({
    where: { [Op.or]: [{ email: value.toLowerCase() }, { matricule: value }] },
  });
  if (!user) return { user: null };

  const viaEmail = user.email.toLowerCase() === value.toLowerCase();
  const viaMatricule = Boolean(user.matricule) && user.matricule.toLowerCase() === value.toLowerCase();
  const allowed =
    user.role === 'admin' ? viaEmail : user.role === 'etudiant' ? viaMatricule : viaEmail || viaMatricule;

  return { user: allowed ? user : null };
}

async function sendCode(user) {
  const { length, validityMinutes, resendSeconds } = cfg.verification;
  const code = String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  await User.update(
    {
      codeHash: await bcrypt.hash(code, env.bcryptRounds),
      codeExpiresAt: expiresAt,
      codeAttempts: 0,
      codeSentAt: new Date(),
    },
    { where: { id: user.id } }
  );

  await mailService.sendVerificationCode(user, code);
  return { emailMasque: maskEmail(user.email), expiresAt, resendSeconds };
}

async function login(identifiant, motDePasse) {
  const { user } = await findForLogin(identifiant);
  const passwordOk = await bcrypt.compare(motDePasse, user ? user.motDePasse : DUMMY_HASH);

  if (!user || !passwordOk) {
    logger.warn('AUTH', `Échec de connexion : "${identifiant}"`);
    throw new ApiError(401, GENERIC_ERROR);
  }

  if (user.estBloque) {
    logger.warn('AUTH', `Connexion refusée (compte bloqué) : ${user.email}`);
    throw blockedError(user.motifBlocage);
  }

  if (user.role === 'etudiant') {
    const check = await blockService.checkStudent(user);
    if (check.blocked) throw blockedError(check.motif);
  }

  // Professeur et étudiant : code à 6 chiffres tant que le compte n'est pas vérifié
  if (user.role !== 'admin' && !user.estVerifie) {
    const info = await sendCode(user);
    logger.info('AUTH', `Code de vérification requis : ${user.email}`);
    return { requiresVerification: true, tempToken: signTemp(user), ...info };
  }

  await User.update({ lastSeenAt: new Date() }, { where: { id: user.id } });
  logger.success('AUTH', `Connexion : ${user.email} (${user.role})`);
  return { token: signSession(user), user: await loadPublicUser(user.id) };
}

async function resendCode(userId) {
  const user = await User.unscoped().findByPk(userId);
  if (!user) throw new ApiError(401, 'Session expirée ou invalide.', { code: 'INVALID_TOKEN' });
  if (user.estBloque) throw blockedError(user.motifBlocage);
  if (user.estVerifie) throw new ApiError(400, 'Compte déjà vérifié. Reconnectez-vous.');

  if (user.codeSentAt) {
    const elapsed = (Date.now() - new Date(user.codeSentAt).getTime()) / 1000;
    const wait = Math.ceil(cfg.verification.resendSeconds - elapsed);
    if (wait > 0) {
      throw new ApiError(429, `Patientez ${wait} s avant de demander un nouveau code.`, { code: 'RESEND_WAIT', secondes: wait });
    }
  }
  return sendCode(user);
}

async function verifyCode(userId, code) {
  const user = await User.unscoped().findByPk(userId);
  if (!user) throw new ApiError(401, 'Session expirée ou invalide.', { code: 'INVALID_TOKEN' });
  if (user.estBloque) throw blockedError(user.motifBlocage);
  if (user.estVerifie) throw new ApiError(400, 'Compte déjà vérifié. Reconnectez-vous.');

  if (!user.codeHash || !user.codeExpiresAt) {
    throw new ApiError(400, 'Aucun code actif. Demandez un nouveau code.', { code: 'NO_CODE' });
  }
  if (new Date(user.codeExpiresAt) < new Date()) {
    throw new ApiError(400, 'Ce code a expiré. Demandez un nouveau code.', { code: 'CODE_EXPIRED' });
  }
  if (user.codeAttempts >= cfg.verification.maxAttempts) {
    throw new ApiError(429, 'Trop d\'essais. Demandez un nouveau code.', { code: 'TOO_MANY_ATTEMPTS' });
  }

  const ok = await bcrypt.compare(code, user.codeHash);
  if (!ok) {
    const attempts = user.codeAttempts + 1;
    await User.update({ codeAttempts: attempts }, { where: { id: user.id } });
    const remaining = cfg.verification.maxAttempts - attempts;
    logger.warn('AUTH', `Code incorrect : ${user.email} (${attempts}/${cfg.verification.maxAttempts})`);
    throw new ApiError(400, remaining > 0 ? `Code incorrect. ${remaining} essai(s) restant(s).` : 'Code incorrect. Demandez un nouveau code.');
  }

  await User.update(
    { estVerifie: true, codeHash: null, codeExpiresAt: null, codeAttempts: 0, codeSentAt: null, lastSeenAt: new Date() },
    { where: { id: user.id } }
  );

  if (user.role === 'etudiant') {
    const check = await blockService.checkStudent(user);
    if (check.blocked) throw blockedError(check.motif);
  }

  logger.success('AUTH', `Compte vérifié et connecté : ${user.email} (${user.role})`);
  return { token: signSession(user), user: await loadPublicUser(user.id) };
}

// Contrôle de session (appelé toutes les 30 s par le frontend)
async function getSession(user) {
  let blocage = null;
  if (user.role === 'etudiant') {
    const check = await blockService.checkStudent(user);
    if (check.blocked) throw blockedError(check.motif);
    blocage = { ...check.counters, seuils: blockService.thresholds() };
  }
  await User.update({ lastSeenAt: new Date() }, { where: { id: user.id } });
  return { user: await loadPublicUser(user.id), blocage };
}

async function logout(userId) {
  await User.update({ lastSeenAt: null }, { where: { id: userId } });
}

module.exports = { login, verifyCode, resendCode, getSession, logout, loadPublicUser };