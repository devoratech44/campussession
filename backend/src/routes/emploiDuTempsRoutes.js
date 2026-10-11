// backend/src/routes/emploiDuTempsRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const v = require('../utils/academicValidators');
const ctrl = require('../controllers/emploiDuTempsController');

router.use(auth);

// Consultation : professeur et étudiant (leur propre emploi du temps)
router.get('/me', authorize('professeur', 'etudiant'), ctrl.mine);

// Création et modification : administrateur uniquement
router.get('/', authorize('admin'), ctrl.list);
router.post('/', authorize('admin'), v.slotCreateRules, validate, ctrl.create);
router.put('/:id', authorize('admin'), v.slotUpdateRules, validate, ctrl.update);
router.delete('/:id', authorize('admin'), v.idParam, validate, ctrl.remove);

module.exports = router;