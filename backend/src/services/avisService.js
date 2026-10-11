// backend/src/services/avisService.js
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Enseignement } = require('../models');
const ens = require('./enseignementService');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// ---------- Étudiant ----------
async function forStudent(user) {
  const list = await Enseignement.findAll({ where: await ens.whereForStudent(user), include: ens.INCLUDES, order: [['id', 'ASC']] });
  const mine = list.length
    ? await q('SELECT enseignement_id AS eid, appreciation, commentaire FROM avis_cours WHERE etudiant_id = :uid AND enseignement_id IN (:ids)', { uid: user.id, ids: list.map((e) => e.id) })
    : [];
  const map = new Map(mine.map((r) => [r.eid, r]));
  return list.map((e) => {
    const s = ens.serialize(e);
    const a = map.get(e.id);
    return {
      id: e.id,
      moduleCode: s.module.code,
      moduleNom: s.module.nom,
      professeur: `${s.professeur.prenom} ${s.professeur.nom}`,
      avis: a ? { appreciation: a.appreciation, commentaire: a.commentaire } : null,
    };
  });
}

async function save(user, eid, { appreciation, commentaire }) {
  const ok = await Enseignement.count({ where: { [Op.and]: [{ id: eid }, await ens.whereForStudent(user)] } });
  if (!ok) throw new ApiError(403, 'Ce cours ne fait pas partie de votre emploi du temps.');
  await sequelize.query(
    `INSERT INTO avis_cours (enseignement_id, etudiant_id, appreciation, commentaire) VALUES (:eid, :uid, :a, :c)
     ON DUPLICATE KEY UPDATE appreciation = VALUES(appreciation), commentaire = VALUES(commentaire)`,
    { replacements: { eid, uid: user.id, a: Number(appreciation), c: commentaire ? String(commentaire).trim().slice(0, 2000) : null } }
  );
  logger.info('AVIS', `Avis enregistré : ${user.matricule} → enseignement #${eid} (${appreciation}/5)`);
}

// ---------- Professeur : anonyme ----------
async function forProf(user) {
  const list = await Enseignement.findAll({ where: { professeurId: user.id }, include: ens.INCLUDES, order: [['id', 'ASC']] });
  const out = [];
  for (const e of list) {
    const s = ens.serialize(e);
    const dist = await q('SELECT appreciation, COUNT(*) AS nb FROM avis_cours WHERE enseignement_id = :eid GROUP BY appreciation', { eid: e.id });
    const repartition = [1, 2, 3, 4, 5].map((n) => ({ note: n, nb: Number(dist.find((d) => d.appreciation === n)?.nb || 0) }));
    const total = repartition.reduce((a, r) => a + r.nb, 0);
    const moyenne = total ? Math.round((repartition.reduce((a, r) => a + r.note * r.nb, 0) / total) * 10) / 10 : null;
    const commentaires = await q(
      `SELECT appreciation, commentaire, updated_at AS updatedAt FROM avis_cours
       WHERE enseignement_id = :eid AND commentaire IS NOT NULL AND commentaire <> '' ORDER BY updated_at DESC LIMIT 50`, { eid: e.id }
    );
    out.push({ id: e.id, moduleCode: s.module.code, moduleNom: s.module.nom, publicLabel: s.publicLabel, total, moyenne, repartition, commentaires });
  }
  return out;
}

module.exports = { forStudent, save, forProf };