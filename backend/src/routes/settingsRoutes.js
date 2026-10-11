// backend/src/routes/settingsRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { uploadPhoto } = require('../middlewares/upload');
const { profileRules, changePasswordRules } = require('../utils/validators');
const ctrl = require('../controllers/settingsController');

router.use(auth); // les trois rôles

router.get('/meta', ctrl.meta);
router.put('/profile', uploadPhoto, profileRules, validate, ctrl.updateProfile);
router.put('/password', changePasswordRules, validate, ctrl.changePassword);

module.exports = router;