// backend/src/routes/enseignementRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const v = require('../utils/academicValidators');
const ctrl = require('../controllers/enseignementController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
router.get('/options', ctrl.options);
router.get('/etudiants', ctrl.lookupEtudiants);
router.post('/', v.assignationCreateRules, validate, ctrl.create);
router.put('/:id', v.assignationUpdateRules, validate, ctrl.update);
router.delete('/:id', v.idParam, validate, ctrl.remove);

module.exports = router;