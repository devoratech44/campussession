// backend/src/routes/surveillanceRoutes.js
const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const authorize = require('../middlewares/role');
const ctrl = require('../controllers/surveillanceController');

router.use(auth);

// Étudiant (avant les routes /:id)
router.get('/mine', authorize('etudiant'), ctrl.mine);
router.post('/:id/entrer', authorize('etudiant'), ctrl.entrer);
router.post('/:id/event', authorize('etudiant'), ctrl.event);
router.post('/:id/terminer', authorize('etudiant'), ctrl.terminer);

// Administrateur
router.get('/', authorize('admin'), ctrl.list);
router.post('/', authorize('admin'), ctrl.create);
router.get('/:id', authorize('admin'), ctrl.detail);
router.put('/:id/activer', authorize('admin'), ctrl.activer);
router.put('/:id/terminer', authorize('admin'), ctrl.terminerAdmin);
router.put('/:id/etudiants/:eid/exclure', authorize('admin'), ctrl.exclure);

module.exports = router;