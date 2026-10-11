// backend/src/routes/professeurRoutes.js
const fs = require('fs');
const router = require('express').Router();
const { validationResult } = require('express-validator');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const own = require('../middlewares/ownership');
const { uploadTravail, uploadDocument } = require('../middlewares/upload');
const { idParam } = require('../utils/academicValidators');
const ev = require('../utils/evaluationValidators');
const dv = require('../utils/documentValidators');
const ctrl = require('../controllers/professeurController');
const evalCtrl = require('../controllers/evaluationController');
const docCtrl = require('../controllers/documentController');

// Si la validation échoue, le fichier déjà reçu est supprimé
const dropUploadIfInvalid = (req, res, next) => {
  if (req.file && !validationResult(req).isEmpty()) fs.unlink(req.file.path, () => {});
  next();
};

router.use(auth);
router.use(authorize('professeur'));

router.get('/dashboard', ctrl.dashboard);
router.get('/cours', ctrl.cours);
router.get('/options', ctrl.options);
router.get('/avis', ctrl.avis);
router.get('/moyennes', ctrl.moyennes);

// Évaluations et notes (ses assignations uniquement)
router.get('/evaluations', ctrl.evaluations);
router.post('/evaluations', uploadTravail, ev.create, dropUploadIfInvalid, validate, own.enseignementInBody, evalCtrl.create);
router.get('/evaluations/:id', idParam, validate, own.travail, evalCtrl.get);
router.put('/evaluations/:id', idParam, validate, own.travail, uploadTravail, ev.update, dropUploadIfInvalid, validate, evalCtrl.update);
router.delete('/evaluations/:id', idParam, validate, own.travail, evalCtrl.remove);
router.get('/evaluations/:id/fichier', idParam, validate, own.travail, evalCtrl.fichier);
router.get('/evaluations/:id/rendus/:etudiantId/fichier', idParam, ev.rendu, validate, own.travail, evalCtrl.fichierRendu);
router.put('/evaluations/:id/notes', idParam, ev.notes, validate, own.travail, own.notesLocked, evalCtrl.saveNotes);

// Documents (les siens)
router.get('/documents', ctrl.documents);
router.post('/documents', uploadDocument, dv.create, dropUploadIfInvalid, validate, own.documentTargets, docCtrl.create);
router.put('/documents/:id', idParam, validate, own.document, uploadDocument, dv.update, dropUploadIfInvalid, validate, own.documentTargets, docCtrl.update);
router.put('/documents/:id/archive', idParam, dv.archive, validate, own.document, docCtrl.archive);
router.delete('/documents/:id', idParam, validate, own.document, docCtrl.remove);
router.get('/documents/:id/fichier', idParam, validate, own.document, docCtrl.fichier);

module.exports = router;