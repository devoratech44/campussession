// backend/src/routes/notificationRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { idParam } = require('../utils/academicValidators');
const v = require('../utils/notificationValidators');
const ctrl = require('../controllers/notificationController');

const admin = authorize('admin');

router.use(auth);

// Tous les rôles : la cloche (avant les routes /:id)
router.get('/mine', ctrl.mine);
router.put('/read-all', ctrl.readAll);
router.put('/:id/read', idParam, validate, ctrl.read);

// Administrateur
router.get('/', admin, ctrl.list);
router.post('/', admin, v.create, validate, ctrl.create);
router.get('/:id', admin, idParam, validate, ctrl.get);
router.delete('/:id', admin, idParam, validate, ctrl.remove);

module.exports = router;