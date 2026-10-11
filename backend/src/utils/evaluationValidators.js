// backend/src/utils/evaluationValidators.js
const { body, param } = require('express-validator');
const cfg = require('../config/appConfig');

const common = [
  body('type').isIn(cfg.evaluations.types).withMessage('Type invalide.'),
  body('numeroTp').custom((value, { req }) => {
    if (req.body.type !== 'tp') return true;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > cfg.maxTpPerEnseignement) {
      throw new Error(`Numéro de TP : 1 à ${cfg.maxTpPerEnseignement}.`);
    }
    return true;
  }),
  body('titre').trim().isLength({ min: 2, max: 200 }).withMessage('Titre : 2 à 200 caractères.'),
  body('consignes').optional({ checkFalsy: true }).isLength({ max: 10000 }).withMessage('Consignes : 10 000 caractères maximum.'),
  body('dateLimite').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/).withMessage('Date limite invalide.'),
  body('dateTravail').optional({ checkFalsy: true }).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('Date invalide.'),
];

exports.create = [body('enseignementId').isInt({ min: 1 }).withMessage('Choisissez l’assignation.'), ...common];
exports.update = common;

exports.notes = [
  body('notes').isArray({ min: 1, max: 1000 }).withMessage('Aucune note à enregistrer.'),
  body('notes.*.etudiantId').isInt({ min: 1 }).withMessage('Étudiant invalide.'),
  body('notes.*.commentaire').optional({ nullable: true }).isLength({ max: 2000 }).withMessage('Commentaire trop long.'),
];

exports.rendu = [param('etudiantId').isInt({ min: 1 })];