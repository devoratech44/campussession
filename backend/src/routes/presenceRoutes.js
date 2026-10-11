// backend/src/routes/presenceRoutes.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const cfg = require('../config/appConfig');
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const validate = require('../middlewares/validate');
const { idParam } = require('../utils/academicValidators');
const v = require('../utils/presenceValidators');
const pv = require('../utils/pointageValidators');
const ctrl = require('../controllers/presenceController');

const pointageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: cfg.sessions.pointageRateMax,
  max: cfg.sessions.pointageRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives de pointage. Patientez une minute.' },
});

const admin = authorize('admin');
const staff = authorize('admin', 'professeur');
const student = authorize('etudiant');

router.use(auth);

// Administrateur et professeur
router.get('/seances', staff, ctrl.listSeances);
router.get('/seances/:id', staff, idParam, validate, ctrl.getSeance);
router.post('/seances/:id/fermer', staff, idParam, validate, ctrl.fermer);
router.post('/seances/:id/signature', staff, v.signer, validate, ctrl.signer);
router.put('/seances/:id/points', staff, v.points, validate, ctrl.points);
router.put('/seances/:id/retard', staff, v.retard, validate, ctrl.retard);
router.get('/seances/:id/signatures/professeur', staff, idParam, validate, ctrl.signatureProf);
router.get('/seances/:id/signatures/etudiants/:etudiantId', staff, v.seanceEtudiant, validate, ctrl.signatureEtudiant);

router.get('/seances/:id/qr', staff, idParam, validate, ctrl.qr);
router.post('/seances/:id/etudiants/:etudiantId/pointer', staff, v.seanceEtudiant, pv.pointerPour, validate, ctrl.pointerPour);

// Administrateur uniquement
router.post('/seances', admin, v.seanceCreate, validate, ctrl.createSeance);
router.put('/seances/:id', admin, v.seanceUpdate, validate, ctrl.updateSeance);
router.delete('/seances/:id', admin, idParam, validate, ctrl.removeSeance);
router.post('/seances/:id/ouvrir', admin, v.ouvrir, validate, ctrl.ouvrir);
router.post('/seances/:id/annuler', admin, v.annuler, validate, ctrl.annuler);
router.put('/seances/:id/etudiants/:etudiantId', admin, v.presenceUpdate, validate, ctrl.setPresence);
router.delete('/seances/:id/etudiants/:etudiantId', admin, v.seanceEtudiant, validate, ctrl.deletePresence);
router.get('/historique', admin, ctrl.historique);

// Étudiant
router.get('/pointage/courant', student, ctrl.pointageCourant);
router.post('/pointage/signature', student, pointageLimiter, pv.signatureOnly, validate, ctrl.pointageSignature);
router.get('/pointage/info', student, ctrl.pointageInfo);
router.post('/pointage', student, pointageLimiter, pv.pointer, validate, ctrl.pointer);

module.exports = router;