// backend/src/services/blockService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const { User } = require('../models');

const thresholds = () => ({
  retards: cfg.blocking.maxLates,
  absences: cfg.blocking.maxAbsences,
  mode: cfg.blocking.mode,
});

// Retards et absences NON justifiés d'un étudiant
async function getCounters(etudiantId) {
  const rows = await sequelize.query(
    `SELECT p.statut AS statut, COUNT(*) AS total FROM presences p JOIN seances s ON s.id = p.seance_id
     WHERE p.etudiant_id = :id AND p.justifie = 0 AND p.statut IN ('retard','absent') AND s.statut = 'fermee'
     GROUP BY p.statut`,
    { replacements: { id: etudiantId }, type: QueryTypes.SELECT }
  );
  const counters = { retards: 0, absences: 0 };
  rows.forEach((r) => {
    if (r.statut === 'retard') counters.retards = Number(r.total);
    if (r.statut === 'absent') counters.absences = Number(r.total);
  });
  return counters;
}

// Règle § 3.6 : plus de X retards OU plus de Y absences (mode modifiable)
function exceeds({ retards, absences }) {
  const tooManyLates = retards > cfg.blocking.maxLates;
  const tooManyAbsences = absences > cfg.blocking.maxAbsences;
  return cfg.blocking.mode === 'and' ? tooManyLates && tooManyAbsences : tooManyLates || tooManyAbsences;
}

// Vérifie un étudiant et le bloque automatiquement si un seuil est dépassé
async function checkStudent(user) {
  const counters = await getCounters(user.id);

  if (user.estBloque) return { blocked: true, motif: user.motifBlocage, counters };

  if (exceeds(counters)) {
    const motif = 'Seuil de retards ou d\'absences non justifiés dépassé.';
    await User.update({ estBloque: true, blocageAuto: true, motifBlocage: motif, lastSeenAt: null }, { where: { id: user.id } });
    logger.warn('BLOCK', `Blocage automatique : ${user.email} (${counters.retards} retards, ${counters.absences} absences non justifiés)`);
    return { blocked: true, motif, counters };
  }

  return { blocked: false, counters };
}

module.exports = { getCounters, exceeds, checkStudent, thresholds };