// backend/src/utils/presenceValidators.js
const { body, param } = require('express-validator');
const cfg = require('../config/appConfig');
const time = require('./timeUtils');
const { idParam } = require('./academicValidators');

const S = cfg.sessions;
const etudiantParam = param('etudiantId').isInt({ min: 1 }).withMessage('Étudiant invalide.');

const signatureChain = (field = 'signature') =>
  body(field)
    .isString().withMessage('La signature est obligatoire.').bail()
    .isLength({ max: S.signatureMaxKb * 1024 }).withMessage(`La signature dépasse ${S.signatureMaxKb} Ko.`).bail()
    .matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).withMessage('Signature invalide.');

const timesCheck = body().custom((_, { req }) => {
  const a = time.parse(req.body.heureDebut);
  const b = time.parse(req.body.heureFin);
  if (a === null || b === null) throw new Error('Horaires invalides (HH:MM).');
  if (b <= a) throw new Error("L'heure de fin doit suivre l'heure de début.");
  return true;
});

const salle = body('salle').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Salle trop longue.');

const seanceCreate = [
  body('enseignementId').isInt({ min: 1 }).withMessage('Choisissez un enseignement.').toInt(),
  body('date').isISO8601({ strict: true }).withMessage('Date invalide.'),
  timesCheck,
  salle,
];
const seanceUpdate = [idParam, body('date').isISO8601({ strict: true }).withMessage('Date invalide.'), timesCheck, salle];

const ouvrir = [
  idParam,
  body('duree').optional({ values: 'falsy' }).isInt({ min: 1, max: S.reopenMaxMin }).withMessage(`Durée : 1 à ${S.reopenMaxMin} minutes.`).toInt(),
];
const annuler = [idParam, body('motif').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Motif trop long.')];
const signer = [idParam, signatureChain()];
const points = [idParam, body('pointsAbordes').optional({ values: 'falsy' }).isString().isLength({ max: 5000 }).withMessage('Texte trop long.')];

const retard = [
  idParam,
  body('etudiantId').isInt({ min: 1 }).withMessage('Étudiant invalide.').toInt(),
  body('minutes').isInt({ min: 1, max: S.retardMaxMin }).withMessage(`Retard : 1 à ${S.retardMaxMin} minutes.`).toInt(),
];

const presenceUpdate = [
  idParam,
  etudiantParam,
  body('statut').isIn(cfg.presenceStatuts).withMessage('Statut invalide.'),
  body('minutesRetard').optional({ values: 'falsy' }).isInt({ min: 0, max: S.retardMaxMin }).withMessage(`Retard : 0 à ${S.retardMaxMin} minutes.`).toInt(),
  body('justifie').optional().isBoolean().toBoolean(),
  body('motifJustification').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Motif trop long.'),
  body('remarque').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Remarque trop longue.'),
];

const seanceEtudiant = [idParam, etudiantParam];

const pointer = [
  body('token').optional().isString().isLength({ max: 100 }),
  body('code').optional().isString().isLength({ max: 20 }),
  body().custom((_, { req }) => {
    if (!req.body.token && !req.body.code) throw new Error('QR code ou code de présence requis.');
    return true;
  }),
  signatureChain(),
];

module.exports = { seanceCreate, seanceUpdate, ouvrir, annuler, signer, points, retard, presenceUpdate, seanceEtudiant, pointer };