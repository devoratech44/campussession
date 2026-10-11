// backend/src/routes/moduleRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const v = require('../utils/academicValidators');
const ctrl = require('../controllers/moduleController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
router.post('/', v.moduleRules, validate, ctrl.create);
router.put('/:id', v.idParam, v.moduleRules, validate, ctrl.update);
router.delete('/:id', v.idParam, validate, ctrl.remove);

module.exports = router;