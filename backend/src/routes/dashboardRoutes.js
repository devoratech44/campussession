// backend/src/routes/dashboardRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ctrl = require('../controllers/dashboardController');

router.get('/admin', auth, authorize('admin'), ctrl.admin);

module.exports = router;