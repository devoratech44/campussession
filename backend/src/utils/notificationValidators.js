// backend/src/utils/notificationValidators.js
const { body } = require('express-validator');
const cfg = require('../config/appConfig');

exports.create = [
  body('titre').trim().isLength({ min: 2, max: 200 }).withMessage('Titre : 2 à 200 caractères.'),
  body('message').trim().isLength({ min: 2, max: 5000 }).withMessage('Message : 2 à 5000 caractères.'),
  body('type').optional().isIn(cfg.notifications.types).withMessage('Type invalide.'),
  body('cibleType').isIn(cfg.notifications.cibleTypes).withMessage('Cible invalide.'),
  body('role').optional().isIn(['tous', 'etudiant', 'professeur']).withMessage('Rôle invalide.'),
  body('cibleId').custom((value, { req }) => {
    if (req.body.cibleType === 'tous') return true;
    if (!Number.isInteger(Number(value)) || Number(value) < 1) throw new Error('Choisissez la cible.');
    return true;
  }),
];