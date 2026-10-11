// backend/src/controllers/dashboardController.js
const { QueryTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

exports.admin = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - cfg.onlineThresholdSeconds * 1000);

  const [row] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'etudiant') AS etudiants,
       (SELECT COUNT(*) FROM users WHERE role = 'professeur') AS professeurs,
       (SELECT COUNT(*) FROM classes) AS classes,
       (SELECT COUNT(*) FROM filieres) AS filieres,
       (SELECT COUNT(*) FROM groupes) AS groupes,
       (SELECT COUNT(*) FROM modules) AS modules,
       (SELECT COUNT(*) FROM users WHERE est_bloque = 1 AND role <> 'admin') AS bloques,
       (SELECT COUNT(*) FROM users WHERE last_seen_at >= :since) AS enLigne`,
    { replacements: { since }, type: QueryTypes.SELECT }
  );
  const totaux = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));

  const [act] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM seances WHERE date_seance = UTC_DATE() AND statut <> 'annulee') AS seancesDuJour,
       (SELECT COUNT(*) FROM seances WHERE date_seance = UTC_DATE() AND statut = 'ouverte') AS seancesOuvertes,
       (SELECT COUNT(*) FROM travaux) AS evaluations,
       (SELECT COUNT(*) FROM rendus r WHERE NOT EXISTS
          (SELECT 1 FROM notes n WHERE n.travail_id = r.travail_id AND n.etudiant_id = r.etudiant_id)) AS rendusACorriger,
       (SELECT COUNT(*) FROM documents WHERE est_archive = 0) AS documents,
       (SELECT COUNT(*) FROM avis_cours) AS avis,
       (SELECT ROUND(AVG(appreciation), 1) FROM avis_cours) AS avisMoyenne,
       (SELECT COUNT(*) FROM notifications) AS notifications,
       (SELECT COUNT(*) FROM messages WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS messages7j,
       (SELECT ROUND(SUM(p.statut <> 'absent') / COUNT(*) * 100, 1)
          FROM presences p JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee') AS tauxPresence`,
    { type: QueryTypes.SELECT }
  );
  const activite = Object.fromEntries(Object.entries(act).map(([k, v]) => [k, v === null ? null : Number(v)]));

  // Étudiants à surveiller : retards et absences non justifiés
  const watch = await sequelize.query(
    `SELECT u.id, u.prenom, u.nom, u.matricule, u.photo, u.est_bloque AS estBloque, c.nom AS classe,
            SUM(p.statut = 'retard') AS retards, SUM(p.statut = 'absent') AS absences
     FROM presences p
     JOIN seances s ON s.id = p.seance_id AND s.statut = 'fermee'
     JOIN users u ON u.id = p.etudiant_id
     LEFT JOIN classes c ON c.id = u.classe_id
     WHERE p.justifie = 0 AND p.statut IN ('retard','absent')
     GROUP BY u.id, u.prenom, u.nom, u.matricule, u.photo, u.est_bloque, c.nom
     ORDER BY absences DESC, retards DESC
     LIMIT :limit`,
    { replacements: { limit: cfg.dashboard.watchLimit }, type: QueryTypes.SELECT }
  );

  const online = await User.findAll({
    where: { lastSeenAt: { [Op.gte]: since } },
    attributes: ['id', 'prenom', 'nom', 'role', 'photo'],
    order: [['lastSeenAt', 'DESC']],
    limit: cfg.dashboard.onlineLimit,
  });

  res.json({
    success: true,
    data: {
      totaux,
      activite,
      aSurveiller: watch.map((w) => ({
        ...w,
        estBloque: Boolean(w.estBloque),
        retards: Number(w.retards),
        absences: Number(w.absences),
      })),
      enLigne: online,
    },
  });
});