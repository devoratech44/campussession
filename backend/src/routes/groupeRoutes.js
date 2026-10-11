// backend/src/routes/groupeRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const v = require('../utils/academicValidators');
const ctrl = require('../controllers/groupeController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
router.get('/candidats', ctrl.candidats);
router.get('/:id', v.idParam, validate, ctrl.get);
router.post('/', v.groupeCreateRules, validate, ctrl.create);
router.put('/:id', v.groupeUpdateRules, validate, ctrl.update);
router.delete('/:id', v.idParam, validate, ctrl.remove);

module.exports = router;