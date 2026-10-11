// backend/src/routes/reportRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ctrl = require('../controllers/reportController');

router.use(auth);
router.use(authorize('admin'));

router.get('/apercu', ctrl.apercu);
router.get('/presences', ctrl.presences);
router.get('/professeurs', ctrl.professeurs);

module.exports = router;