// backend/src/routes/authRoutes.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const validate = require('../middlewares/validate');
const { auth, authTemp } = require('../middlewares/auth');
const ctrl = require('../controllers/authController');

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMin * 60 * 1000,
  limit: env.rateLimit.max,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

const codeRegex = new RegExp(`^\\d{${cfg.verification.length}}$`);

router.post(
  '/login',
  limiter,
  [
    body('identifiant').trim().notEmpty().withMessage('Saisissez votre email ou matricule.').isLength({ max: 150 }),
    body('motDePasse').notEmpty().withMessage('Saisissez votre mot de passe.').isLength({ max: cfg.password.max }),
  ],
  validate,
  ctrl.login
);

router.post(
  '/verify',
  limiter,
  authTemp,
  [body('code').trim().matches(codeRegex).withMessage(`Le code contient ${cfg.verification.length} chiffres.`)],
  validate,
  ctrl.verify
);

router.post('/resend', limiter, authTemp, ctrl.resend);

router.get('/me', auth, ctrl.me);
router.post('/logout', auth, ctrl.logout);

module.exports = router;