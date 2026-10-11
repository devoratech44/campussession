// backend/src/routes/messagerieRoutes.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const cfg = require('../config/appConfig');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { idParam } = require('../utils/academicValidators');
const v = require('../utils/messagerieValidators');
const ctrl = require('../controllers/messagerieController');

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: cfg.messagerie.rateMax,
  max: cfg.messagerie.rateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de messages envoyés. Patientez une minute.' },
});

router.use(auth); // tous les rôles

router.get('/unread', ctrl.unread);
router.get('/contacts', ctrl.contacts);
router.get('/conversations', ctrl.list);
router.post('/conversations', v.createConv, validate, ctrl.create);
router.get('/conversations/:id/messages', idParam, validate, ctrl.messages);
router.post('/conversations/:id/messages', sendLimiter, idParam, v.send, validate, ctrl.send);
router.delete('/conversations/:id', authorize('admin'), idParam, validate, ctrl.remove);

module.exports = router;