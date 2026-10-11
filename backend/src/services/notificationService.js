// backend/src/services/notificationService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Notification, NotificationUser } = require('../models');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// Résout les destinataires d'une cible (étudiants pour classe/filière/groupe)
async function recipientIds({ cibleType, cibleId, role }) {
  let rows;
  switch (cibleType) {
    case 'classe':
      rows = await q("SELECT id FROM users WHERE role = 'etudiant' AND classe_id = :id", { id: cibleId });
      break;
    case 'filiere':
      rows = await q("SELECT id FROM users WHERE role = 'etudiant' AND filiere_id = :id", { id: cibleId });
      break;
    case 'groupe':
      rows = await q('SELECT etudiant_id AS id FROM groupe_etudiants WHERE groupe_id = :id', { id: cibleId });
      break;
    case 'utilisateur':
      rows = await q("SELECT id FROM users WHERE id = :id AND role IN ('etudiant','professeur')", { id: cibleId });
      break;
    default: {
      const roles = role === 'etudiant' || role === 'professeur' ? [role] : ['etudiant', 'professeur'];
      rows = await q('SELECT id FROM users WHERE role IN (:roles)', { roles });
    }
  }
  return rows.map((r) => r.id);
}

/**
 * Envoie une notification. Utilisable par le système :
 * send({ titre, message, type, userIds: [..] }) ou send({ ..., cibleType, cibleId })
 */
async function send({ titre, message, type = 'information', cibleType = 'tous', cibleId = null, role, createdBy = null, userIds }) {
  const ids = userIds ? [...new Set(userIds)] : await recipientIds({ cibleType, cibleId, role });
  if (!ids.length) throw new ApiError(400, 'Aucun destinataire pour cette cible.');

  const t = await sequelize.transaction();
  try {
    const n = await Notification.create(
      { titre, message, type, cibleType, cibleId: cibleType === 'tous' ? null : cibleId, createdBy },
      { transaction: t }
    );
    await NotificationUser.bulkCreate(ids.map((userId) => ({ notificationId: n.id, userId })), { transaction: t });
    await t.commit();
    logger.success('NOTIF', `Notification #${n.id} « ${titre} » envoyée à ${ids.length} destinataire(s) (${cibleType})`);
    return { id: n.id, destinataires: ids.length };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

const LABEL = `CASE n.cible_type
  WHEN 'classe' THEN c.nom WHEN 'filiere' THEN f.nom WHEN 'groupe' THEN g.nom
  WHEN 'utilisateur' THEN CONCAT(u.prenom, ' ', u.nom) ELSE 'Tous les utilisateurs' END`;

const JOINS = `FROM notifications n
  LEFT JOIN classes c ON n.cible_type = 'classe' AND c.id = n.cible_id
  LEFT JOIN filieres f ON n.cible_type = 'filiere' AND f.id = n.cible_id
  LEFT JOIN groupes g ON n.cible_type = 'groupe' AND g.id = n.cible_id
  LEFT JOIN users u ON n.cible_type = 'utilisateur' AND u.id = n.cible_id
  LEFT JOIN users cr ON cr.id = n.created_by`;

async function listAdmin({ type, page, limit }) {
  const where = [];
  const rep = {};
  if (type && cfg.notifications.types.includes(type)) { where.push('n.type = :type'); rep.type = type; }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [{ total }] = await q(`SELECT COUNT(*) AS total FROM notifications n ${W}`, rep);
  const rows = await q(
    `SELECT n.id, n.titre, n.message, n.type, n.cible_type AS cibleType, n.cible_id AS cibleId,
            n.created_at AS createdAt, ${LABEL} AS cibleLabel, CONCAT(cr.prenom, ' ', cr.nom) AS auteur,
            (SELECT COUNT(*) FROM notification_user nu WHERE nu.notification_id = n.id) AS total,
            (SELECT COUNT(*) FROM notification_user nu WHERE nu.notification_id = n.id AND nu.est_lue = 1) AS lues
     ${JOINS} ${W}
     ORDER BY n.created_at DESC, n.id DESC LIMIT :limit OFFSET :offset`,
    { ...rep, limit, offset: (page - 1) * limit }
  );
  return {
    items: rows.map((r) => ({ ...r, total: Number(r.total), lues: Number(r.lues) })),
    total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

async function detail(id) {
  const [n] = await q(
    `SELECT n.id, n.titre, n.message, n.type, n.cible_type AS cibleType, n.created_at AS createdAt,
            ${LABEL} AS cibleLabel, CONCAT(cr.prenom, ' ', cr.nom) AS auteur ${JOINS} WHERE n.id = :id`,
    { id }
  );
  if (!n) throw new ApiError(404, 'Notification introuvable.');
  const destinataires = await q(
    `SELECT u.id, u.prenom, u.nom, u.matricule, u.role, nu.est_lue AS estLue, nu.lue_at AS lueAt
     FROM notification_user nu JOIN users u ON u.id = nu.user_id
     WHERE nu.notification_id = :id ORDER BY nu.est_lue ASC, u.nom ASC LIMIT 500`,
    { id }
  );
  return { ...n, destinataires: destinataires.map((d) => ({ ...d, estLue: Boolean(d.estLue) })) };
}

async function remove(id) {
  const n = await Notification.findByPk(id);
  if (!n) throw new ApiError(404, 'Notification introuvable.');
  await n.destroy(); // notification_user supprimé en cascade
  logger.warn('NOTIF', `Notification #${id} supprimée`);
}

// ---------- Cloche (tous les rôles) ----------
async function mine(userId, { page, limit, nonLues }) {
  const extra = nonLues ? 'AND nu.est_lue = 0' : '';
  const [{ total }] = await q(`SELECT COUNT(*) AS total FROM notification_user nu WHERE nu.user_id = :uid ${extra}`, { uid: userId });
  const [{ unread }] = await q('SELECT COUNT(*) AS unread FROM notification_user WHERE user_id = :uid AND est_lue = 0', { uid: userId });
  const rows = await q(
    `SELECT n.id, n.titre, n.message, n.type, n.created_at AS createdAt, nu.est_lue AS estLue, nu.lue_at AS lueAt
     FROM notification_user nu JOIN notifications n ON n.id = nu.notification_id
     WHERE nu.user_id = :uid ${extra}
     ORDER BY n.created_at DESC, n.id DESC LIMIT :limit OFFSET :offset`,
    { uid: userId, limit, offset: (page - 1) * limit }
  );
  return {
    items: rows.map((r) => ({ ...r, estLue: Boolean(r.estLue) })),
    total: Number(total), unread: Number(unread), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)),
  };
}

async function markRead(userId, id) {
  await sequelize.query(
    'UPDATE notification_user SET est_lue = 1, lue_at = UTC_TIMESTAMP() WHERE user_id = :uid AND notification_id = :id AND est_lue = 0',
    { replacements: { uid: userId, id } }
  );
}

async function markAllRead(userId) {
  await sequelize.query(
    'UPDATE notification_user SET est_lue = 1, lue_at = UTC_TIMESTAMP() WHERE user_id = :uid AND est_lue = 0',
    { replacements: { uid: userId } }
  );
}

module.exports = { send, recipientIds, listAdmin, detail, remove, mine, markRead, markAllRead };