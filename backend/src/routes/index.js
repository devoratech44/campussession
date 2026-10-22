// backend/src/routes/index.js
const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', app: 'Campus Session', time: new Date().toISOString() });
});

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/classes', require('./classeRoutes'));
router.use('/filieres', require('./filiereRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/groupes', require('./groupeRoutes'));
router.use('/modules', require('./moduleRoutes'));
router.use('/enseignements', require('./enseignementRoutes'));
router.use('/emploi-du-temps', require('./emploiDuTempsRoutes'));
router.use('/presences', require('./presenceRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/evaluations', require('./evaluationRoutes'));
router.use('/documents', require('./documentRoutes'));
router.use('/messagerie', require('./messagerieRoutes'));
router.use('/rapports', require('./reportRoutes'));
router.use('/etudiant', require('./etudiantRoutes'));
router.use('/professeur', require('./professeurRoutes'));
router.use('/badges', require('./badgeRoutes'));
router.use('/surveillance', require('./surveillanceRoutes'));

module.exports = router;