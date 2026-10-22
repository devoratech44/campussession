// backend/src/services/badgeService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const messagerie = require('./messagerieService');
const etudiant = require('./etudiantService');
const travaux = require('./etudiantTravauxService');
const surveillance = require('./surveillanceService');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

async function get(user) {
  const out = { messages: await messagerie.unread(user.id) };

  if (user.role === 'etudiant') {
    out.pointage = await etudiant.openCount(user);
    out.devoirs = (await travaux.pending(user, 100)).length;
    out.surveillance = await surveillance.pendingCount(user.id);
  }

  if (user.role === 'professeur') {
    const [p] = await q(
      `SELECT COUNT(*) AS nb FROM seances s JOIN enseignements e ON e.id = s.enseignement_id
       WHERE e.professeur_id = :uid AND s.statut = 'ouverte' AND s.signe_at IS NULL AND s.date_seance = UTC_DATE()`, { uid: user.id }
    );
    const [c] = await q(
      `SELECT COUNT(*) AS nb FROM rendus r JOIN travaux t ON t.id = r.travail_id JOIN enseignements e ON e.id = t.enseignement_id
       WHERE e.professeur_id = :uid AND NOT EXISTS (SELECT 1 FROM notes nt WHERE nt.travail_id = r.travail_id AND nt.etudiant_id = r.etudiant_id)`,
      { uid: user.id }
    );
    out.pointage = Number(p.nb);
    out.devoirs = Number(c.nb);
  }
  return out;
}

module.exports = { get };