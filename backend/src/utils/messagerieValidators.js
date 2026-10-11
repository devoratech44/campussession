// backend/src/utils/messagerieValidators.js
const { body } = require('express-validator');
const cfg = require('../config/appConfig');

exports.createConv = [
  body('type').isIn(['prive', 'groupe']).withMessage('Type invalide.'),
  body('userIds').optional().isArray({ max: cfg.messagerie.groupMax }).withMessage('Destinataires invalides.'),
  body('userIds.*').optional().isInt({ min: 1 }).withMessage('Destinataire invalide.'),
  body('titre').custom((value, { req }) => {
    if (req.body.type !== 'groupe') return true;
    const t = String(value || '').trim();
    if (t.length < 2 || t.length > 150) throw new Error('Nom du groupe : 2 à 150 caractères.');
    return true;
  }),
  body('cibleType').optional().isIn(['aucune', 'classe', 'filiere', 'groupe']).withMessage('Cible invalide.'),
  body('cibleId').custom((value, { req }) => {
    if (!req.body.cibleType || req.body.cibleType === 'aucune') return true;
    if (!Number.isInteger(Number(value)) || Number(value) < 1) throw new Error('Choisissez la cible.');
    return true;
  }),
];

exports.send = [
  body('contenu').trim().isLength({ min: 1, max: cfg.messagerie.maxLength }).withMessage(`Message : 1 à ${cfg.messagerie.maxLength} caractères.`),
];