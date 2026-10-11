// backend/src/routes/userRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { uploadPhoto } = require('../middlewares/upload');
const v = require('../utils/validators');
const ctrl = require('../controllers/userController');

router.use(auth, authorize('admin'));

router.get('/', ctrl.list);
// multer d'abord : le corps est en multipart/form-data
router.post('/', uploadPhoto, v.userCreateRules, validate, ctrl.create);
router.put('/:id', uploadPhoto, v.userUpdateRules, validate, ctrl.update);
router.put('/:id/password', v.setPasswordRules, validate, ctrl.setPassword);
router.put('/:id/block', v.blockRules, validate, ctrl.block);
router.put('/:id/unblock', v.idParam, validate, ctrl.unblock);
router.put('/:id/force-code', v.idParam, validate, ctrl.forceCode);
router.delete('/:id', v.idParam, validate, ctrl.remove);

module.exports = router;