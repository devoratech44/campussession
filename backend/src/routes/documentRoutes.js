// backend/src/routes/documentRoutes.js
const fs = require('fs');
const router = require('express').Router();
const { validationResult } = require('express-validator');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { uploadDocument } = require('../middlewares/upload');
const { idParam } = require('../utils/academicValidators');
const v = require('../utils/documentValidators');
const ctrl = require('../controllers/documentController');

// Si la validation échoue, le fichier déjà reçu est supprimé
const dropUploadIfInvalid = (req, res, next) => {
  if (req.file && !validationResult(req).isEmpty()) fs.unlink(req.file.path, () => {});
  next();
};

router.use(auth);
router.use(authorize('admin'));

router.get('/', ctrl.list);
router.post('/', uploadDocument, v.create, dropUploadIfInvalid, validate, ctrl.create);
router.put('/:id', uploadDocument, idParam, v.update, dropUploadIfInvalid, validate, ctrl.update);
router.put('/:id/archive', idParam, v.archive, validate, ctrl.archive);
router.delete('/:id', idParam, validate, ctrl.remove);
router.get('/:id/fichier', idParam, validate, ctrl.fichier);

module.exports = router;