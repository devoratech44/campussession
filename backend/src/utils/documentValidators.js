// backend/src/utils/documentValidators.js
const { body } = require('express-validator');
const cfg = require('../config/appConfig');

const common = [
  body('titre').trim().isLength({ min: 2, max: 200 }).withMessage('Titre : 2 à 200 caractères.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Description : 255 caractères maximum.'),
  body('type').isIn(cfg.documents.types).withMessage('Type invalide.'),
  body('moduleId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Module invalide.'),
  body('classeId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Classe invalide.'),
  body('lien').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Lien invalide (commencez par https://).'),
];

exports.create = common;
exports.update = common;
exports.archive = [body('archive').isBoolean().withMessage('Valeur invalide.')];