// backend/src/routes/evaluationRoutes.js
const fs = require('fs');
const router = require('express').Router();
const { validationResult } = require('express-validator');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { uploadTravail } = require('../middlewares/upload');
const { idParam } = require('../utils/academicValidators');
const v = require('../utils/evaluationValidators');
const ctrl = require('../controllers/evaluationController');

// Si la validation échoue, le fichier déjà reçu est supprimé
const dropUploadIfInvalid = (req, res, next) => {
  if (req.file && !validationResult(req).isEmpty()) fs.unlink(req.file.path, () => {});
  next();
};

router.use(auth);
router.use(authorize('admin'));

router.get('/moyennes', ctrl.moyennes);
router.get('/', ctrl.list);
router.post('/', uploadTravail, v.create, dropUploadIfInvalid, validate, ctrl.create);

router.get('/:id', idParam, validate, ctrl.get);
router.put('/:id', uploadTravail, idParam, v.update, dropUploadIfInvalid, validate, ctrl.update);
router.delete('/:id', idParam, validate, ctrl.remove);
router.get('/:id/fichier', idParam, validate, ctrl.fichier);
router.get('/:id/rendus/:etudiantId/fichier', idParam, v.rendu, validate, ctrl.fichierRendu);
router.put('/:id/notes', idParam, v.notes, validate, ctrl.saveNotes);

module.exports = router;