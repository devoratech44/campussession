// backend/src/middlewares/errorHandler.js
const fs = require('fs');
const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => next(new ApiError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';

  if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    const key = Object.keys(err.fields || {}).join(' ');
    message = key.includes('email')
      ? 'Cet email est déjà utilisé.'
      : key.includes('matricule') ? 'Ce matricule est déjà utilisé.' : 'Cette valeur existe déjà.';
  } else if (err.name === 'SequelizeValidationError') {
    status = 400;
    message = err.errors.map((e) => e.message).join(', ');
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? `La photo dépasse ${env.uploads.maxPhotoMb} Mo.`
      : `Fichier refusé : ${err.message}`;
  }

  // Supprime la photo envoyée si la requête échoue
  if (req.file) fs.unlink(req.file.path, () => {});

  if (status >= 500) logger.error('ERR', `${req.method} ${req.originalUrl} → ${err.stack || err.message}`);
  else logger.warn('ERR', `${req.method} ${req.originalUrl} → ${status} ${message}`);

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Erreur interne du serveur' : message,
    ...(err.details ? { details: err.details } : {}),
  });
};

module.exports = { notFound, errorHandler };