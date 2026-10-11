// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Décode un jeton et vérifie sa finalité : 'session' ou 'verify' (jeton temporaire du code)
const decode = (req, purpose) => {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Authentification requise.', { code: 'NO_TOKEN' });
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    if (payload.purpose !== purpose) throw new Error('finalité invalide');
    return payload;
  } catch {
    throw new ApiError(401, 'Session expirée ou invalide.', { code: 'INVALID_TOKEN' });
  }
};

// Session complète
const auth = asyncHandler(async (req, res, next) => {
  const payload = decode(req, 'session');
  const user = await User.findByPk(payload.id);
  if (!user) throw new ApiError(401, 'Session expirée ou invalide.', { code: 'INVALID_TOKEN' });
  if (user.estBloque) {
    throw new ApiError(403, 'Compte bloqué', { code: 'ACCOUNT_BLOCKED', motif: user.motifBlocage });
  }
  if (user.role !== 'admin' && !user.estVerifie) {
    throw new ApiError(401, 'Un nouveau code de vérification est requis.', { code: 'CODE_REQUIRED' });
  }
  req.user = user;
  next();
});

// Jeton temporaire : uniquement pour saisir ou renvoyer le code à 6 chiffres
const authTemp = asyncHandler(async (req, res, next) => {
  const payload = decode(req, 'verify');
  req.tempUserId = payload.id;
  next();
});

module.exports = { auth, authTemp };