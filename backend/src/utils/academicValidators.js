// backend/src/utils/academicValidators.js
const { body, param } = require('express-validator');
const cfg = require('../config/appConfig');
const time = require('./timeUtils');

const idParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');
const requiredId = (field, message) => body(field).isInt({ min: 1 }).withMessage(message).toInt();

// ---------- Groupes ----------
const groupeBase = [
  body('nom').trim().notEmpty().withMessage('Le nom du groupe est obligatoire.').isLength({ max: 100 }).withMessage('Nom trop long.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Description trop longue.'),
  body('filiereId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Filière invalide.').toInt(),
  body('membreIds').optional().isArray().withMessage('Liste de membres invalide.'),
  body('membreIds.*').isInt({ min: 1 }).withMessage('Membre invalide.').toInt(),
];
const groupeCreateRules = [requiredId('classeId', 'Choisissez une classe.'), ...groupeBase];
const groupeUpdateRules = [idParam, ...groupeBase];

// ---------- Modules ----------
const moduleRules = [
  body('code').trim().notEmpty().withMessage('Le code du module est obligatoire.').isLength({ max: 30 }).withMessage('Code trop long (30 caractères).')
    .customSanitizer((value) => value.toUpperCase()),
  body('nom').trim().notEmpty().withMessage('Le nom du module est obligatoire.').isLength({ max: 150 }).withMessage('Nom trop long.'),
  body('description').optional({ values: 'falsy' }).trim(),
  body('coefficient').isFloat({ min: 0, max: 20 }).withMessage('Le coefficient doit être compris entre 0 et 20.').toFloat(),
  body('volumeHoraire').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Le volume horaire doit être un nombre positif.').toInt(),
];

// ---------- Assignations (enseignements) ----------
const assignationCreateRules = [
  requiredId('moduleId', 'Choisissez un module.'),
  requiredId('professeurId', 'Choisissez un professeur.'),
  body('publicType').isIn(cfg.publicTypes).withMessage('Type de public invalide.'),
  requiredId('cibleId', 'Choisissez le public concerné.'),
  body('anneeAcademique').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Année académique trop longue.'),
];
const assignationUpdateRules = [
  idParam,
  requiredId('professeurId', 'Choisissez un professeur.'),
  body('anneeAcademique').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Année académique trop longue.'),
];

// ---------- Emploi du temps ----------
const timeCheck = (label) => (value) => {
  if (time.parse(value) === null) throw new Error(`${label} invalide.`);
  return true;
};

const slotRules = [
  requiredId('enseignementId', 'Choisissez un enseignement.'),
  body('jour').isInt({ min: 1, max: 7 }).withMessage('Jour invalide.').toInt(),
  body('heureDebut').custom(timeCheck('Heure de début')),
  body('heureFin').custom(timeCheck('Heure de fin')),
  body().custom((_, { req }) => {
    const start = time.parse(req.body.heureDebut);
    const end = time.parse(req.body.heureFin);
    if (start === null || end === null) return true; // déjà signalé ci-dessus
    const { startMinutes, endMinutes, stepMinutes } = cfg.schedule;
    if (start < startMinutes || end > endMinutes) {
      throw new Error(`Les cours se tiennent entre ${time.label(startMinutes)} et ${time.label(endMinutes)}.`);
    }
    if ((start - startMinutes) % stepMinutes !== 0 || (end - startMinutes) % stepMinutes !== 0) {
      throw new Error(`Les horaires suivent des créneaux de ${stepMinutes} minutes.`);
    }
    if (end <= start) throw new Error("L'heure de fin doit suivre l'heure de début.");
    return true;
  }),
  body('salle').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Salle trop longue.'),
  body('dateDebut').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('Date de début invalide.'),
  body('dateFin').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('Date de fin invalide.')
    .bail()
    .custom((value, { req }) => {
      if (req.body.dateDebut && value < req.body.dateDebut) throw new Error('La date de fin précède la date de début.');
      return true;
    }),
  body('forcer').optional().isBoolean().toBoolean(),
];
const slotCreateRules = slotRules;
const slotUpdateRules = [idParam, ...slotRules];

module.exports = {
  idParam, groupeCreateRules, groupeUpdateRules, moduleRules,
  assignationCreateRules, assignationUpdateRules, slotCreateRules, slotUpdateRules,
};