// backend/src/routes/badgeRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const ctrl = require('../controllers/badgeController');

router.use(auth);
router.get('/', ctrl.get);

module.exports = router;