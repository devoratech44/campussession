// backend/src/routes/filiereRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { idParam, filiereRules } = require('../utils/validators');
const ctrl = require('../controllers/filiereController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
router.post('/', filiereRules, validate, ctrl.create);
router.put('/:id', idParam, filiereRules, validate, ctrl.update);
router.delete('/:id', idParam, validate, ctrl.remove);

module.exports = router;