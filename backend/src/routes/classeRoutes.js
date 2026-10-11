// backend/src/routes/classeRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { idParam, classeRules } = require('../utils/validators');
const ctrl = require('../controllers/classeController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
router.post('/', classeRules, validate, ctrl.create);
router.put('/:id', idParam, classeRules, validate, ctrl.update);
router.delete('/:id', idParam, validate, ctrl.remove);

module.exports = router;