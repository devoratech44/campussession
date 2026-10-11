// backend/src/middlewares/requestLogger.js
const morgan = require('morgan');
const logger = require('../utils/logger');

// Journal HTTP : méthode, route, code, durée
const httpLogger = morgan(
  (tokens, req, res) =>
    `${tokens.method(req, res)} ${tokens['url'](req, res)} → ${tokens.status(req, res)} (${tokens['response-time'](req, res)} ms)`,
  { stream: { write: (msg) => logger.http('REQ', msg.trim()) } }
);

// Journal du corps des requêtes (mots de passe et codes masqués)
const bodyLogger = (req, res, next) => {
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length) {
    logger.http('BODY', `${req.method} ${req.originalUrl}`, req.body);
  }
  next();
};

module.exports = { httpLogger, bodyLogger };