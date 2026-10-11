// backend/src/utils/validators.js
const { body, param } = require('express-validator');
const cfg = require('../config/appConfig');

// En mode "partiel" (modification), un champ n'est validé que s'il est envoyé
const when = (name, partial) => (partial ? body(name).if(body(name).exists()) : body(name));
const isStudent = body('role').equals('etudiant');
const isProf = body('role').equals('professeur');

const notFuture = (value) => {
  if (new Date(value) > new Date()) throw new Error('La date de naissance ne peut pas être dans le futur.');
  return true;
};

const idParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');

const passwordChain = (field, label = 'Le mot de passe') =>
  body(field)
    .isString().withMessage(`${label} est obligatoire.`)
    .isLength({ min: cfg.password.min, max: cfg.password.max })
    .withMessage(`${label} doit contenir entre ${cfg.password.min} et ${cfg.password.max} caractères.`)
    .matches(/[A-Za-z]/).withMessage(`${label} doit contenir au moins une lettre.`)
    .matches(/\d/).withMessage(`${label} doit contenir au moins un chiffre.`);

const identityRules = (partial) => [
  when('prenom', partial).trim().notEmpty().withMessage('Le prénom est obligatoire.').isLength({ max: 100 }).withMessage('Prénom trop long.'),
  when('nom', partial).trim().notEmpty().withMessage('Le nom est obligatoire.').isLength({ max: 100 }).withMessage('Nom trop long.'),
  when('email', partial).trim().isEmail().withMessage('Adresse email invalide.').isLength({ max: 150 }).toLowerCase(),
  when('dateNaissance', partial).isISO8601({ strict: true }).withMessage('Date de naissance invalide.').bail().custom(notFuture),
  when('lieuNaissance', partial).trim().notEmpty().withMessage('Le lieu de naissance est obligatoire.').isLength({ max: 150 }),
  when('adresse', partial).trim().notEmpty().withMessage("L'adresse est obligatoire.").isLength({ max: 255 }),
  when('genre', partial).isIn(cfg.genres).withMessage('Genre invalide.'),
  body('telephone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Téléphone trop long.'),
];

const userCreateRules = [
  body('role').isIn(cfg.roles.filter((r) => r !== 'admin')).withMessage('Rôle invalide.'),
  body('matricule').trim().notEmpty().withMessage('Le matricule est obligatoire.').isLength({ max: 50 }),
  ...identityRules(false),
  passwordChain('motDePasse'),
  body('niveau').if(isStudent).isIn(cfg.niveaux).withMessage('Niveau invalide.'),
  body('filiereId').if(isStudent).isInt({ min: 1 }).withMessage('Choisissez une filière.'),
  body('classeId').if(isStudent).isInt({ min: 1 }).withMessage('Choisissez une classe.'),
  body('etatAcademique').if(isStudent).isIn(cfg.etatsAcademiques).withMessage('État académique invalide.'),
  body('specialite').if(isProf).optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('statut').if(isProf).optional({ values: 'falsy' }).isIn(cfg.statutsProfesseur).withMessage('Statut invalide.'),
];

const userUpdateRules = [
  idParam,
  when('matricule', true).trim().notEmpty().withMessage('Le matricule est obligatoire.').isLength({ max: 50 }),
  ...identityRules(true),
  when('niveau', true).isIn(cfg.niveaux).withMessage('Niveau invalide.'),
  when('filiereId', true).isInt({ min: 1 }).withMessage('Choisissez une filière.'),
  when('classeId', true).isInt({ min: 1 }).withMessage('Choisissez une classe.'),
  when('etatAcademique', true).isIn(cfg.etatsAcademiques).withMessage('État académique invalide.'),
  body('specialite').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  when('statut', true).isIn(cfg.statutsProfesseur).withMessage('Statut invalide.'),
];

const setPasswordRules = [idParam, passwordChain('motDePasse')];

const blockRules = [
  idParam,
  body('motif').trim().notEmpty().withMessage('Indiquez le motif du blocage.').isLength({ max: 255 }).withMessage('Motif trop long (255 caractères).'),
];

const profileRules = [
  ...identityRules(true),
  body('specialite').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  when('statut', true).isIn(cfg.statutsProfesseur).withMessage('Statut invalide.'),
];

const changePasswordRules = [
  body('ancienMotDePasse').notEmpty().withMessage('Saisissez votre mot de passe actuel.'),
  passwordChain('nouveauMotDePasse', 'Le nouveau mot de passe'),
  body('confirmation').custom((value, { req }) => value === req.body.nouveauMotDePasse).withMessage('La confirmation ne correspond pas.'),
];

const classeRules = [
  body('nom').trim().notEmpty().withMessage('Le nom de la classe est obligatoire.').isLength({ max: 100 }),
  body('salle').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('anneeAcademique').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('filiereIds').isArray({ min: 1 }).withMessage('Choisissez au moins une filière.'),
  body('filiereIds.*').isInt({ min: 1 }).withMessage('Filière invalide.'),
];

const filiereRules = [
  body('nom').trim().notEmpty().withMessage('Le nom de la filière est obligatoire.').isLength({ max: 100 }),
  body('niveau').isIn(cfg.niveaux).withMessage('Niveau invalide.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
];

module.exports = {
  idParam, userCreateRules, userUpdateRules, setPasswordRules, blockRules,
  profileRules, changePasswordRules, classeRules, filiereRules,
};