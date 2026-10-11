// backend/src/routes/etudiantRoutes.js
const fs = require('fs');
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { uploadRendu } = require('../middlewares/upload');
const { idParam } = require('../utils/academicValidators');
const ctrl = require('../controllers/etudiantController');

// Si la validation échoue, le fichier déjà reçu est supprimé
const dropUploadIfInvalid = (req, res, next) => {
  if (req.file && !validationResult(req).isEmpty()) fs.unlink(req.file.path, () => {});
  next();
};

router.use(auth);
router.use(authorize('etudiant'));

router.get('/pointage', ctrl.pointage);
router.get('/presences', ctrl.presences);
router.get('/dashboard', ctrl.dashboard);

router.get('/contenu', ctrl.contenu);
router.get('/travaux', ctrl.travaux);
router.get('/travaux/:id', idParam, validate, ctrl.travail);
router.post('/travaux/:id/rendu', uploadRendu, idParam,
  body('commentaire').optional({ checkFalsy: true }).isLength({ max: 5000 }).withMessage('Commentaire : 5000 caractères maximum.'),
  dropUploadIfInvalid, validate, ctrl.rendre);
router.delete('/travaux/:id/rendu', idParam, validate, ctrl.retirer);
router.get('/travaux/:id/fichier', idParam, validate, ctrl.travailFichier);
router.get('/travaux/:id/rendu/fichier', idParam, validate, ctrl.renduFichier);

router.get('/notes', ctrl.notes);

router.get('/avis', ctrl.avis);
router.put('/avis/:enseignementId', param('enseignementId').isInt({ min: 1 }),
  body('appreciation').isInt({ min: 1, max: 5 }).withMessage('Appréciation : de 1 à 5.'),
  body('commentaire').optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage('Commentaire : 2000 caractères maximum.'),
  validate, ctrl.saveAvis);

router.get('/documents', ctrl.documents);
router.get('/documents/:id/fichier', idParam, validate, ctrl.documentFichier);

module.exports = router;