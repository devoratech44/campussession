// backend/src/services/messagerieService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Conversation, ConversationParticipant, Message, Enseignement } = require('../models');
const ens = require('./enseignementService');
const notifications = require('./notificationService');

const M = cfg.messagerie;
const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const markRead = (conversationId, userId) => sequelize.query(
  'UPDATE conversation_participants SET last_read_at = UTC_TIMESTAMP() WHERE conversation_id = :c AND user_id = :u',
  { replacements: { c: conversationId, u: userId } }
);

async function assertMember(conversationId, userId) {
  const [row] = await q('SELECT 1 AS ok FROM conversation_participants WHERE conversation_id = :c AND user_id = :u', { c: conversationId, u: userId });
  if (!row) throw new ApiError(403, 'Vous ne faites pas partie de cette conversation.');
}

// Personnes que l'utilisateur a le droit de contacter (null = tout le monde)
async function allowedIds(user) {
  if (user.role === 'admin') return null;
  const set = new Set((await q("SELECT id FROM users WHERE role = 'admin'")).map((a) => a.id));
  if (user.role === 'professeur') {
    const list = await Enseignement.findAll({ where: { professeurId: user.id } });
    for (const e of list) (await ens.studentIdsFor(e)).forEach((id) => set.add(id));
  } else {
    const list = await Enseignement.findAll({ where: await ens.whereForStudent(user), attributes: ['professeurId'] });
    list.forEach((e) => set.add(e.professeurId));
  }
  set.delete(user.id);
  return [...set];
}

async function contacts(user, search) {
  const ids = await allowedIds(user);
  if (ids && !ids.length) return [];
  const where = ['u.id <> :me'];
  const rep = { me: user.id, limit: cfg.lookupLimit };
  if (ids) { where.push('u.id IN (:ids)'); rep.ids = ids; }
  if (search && String(search).trim()) {
    where.push("(u.prenom LIKE :s OR u.nom LIKE :s OR u.matricule LIKE :s OR CONCAT(u.prenom, ' ', u.nom) LIKE :s)");
    rep.s = `%${String(search).trim()}%`;
  }
  return q(
    `SELECT u.id, u.prenom, u.nom, u.role, u.matricule, u.photo FROM users u
     WHERE ${where.join(' AND ')} ORDER BY u.nom ASC, u.prenom ASC LIMIT :limit`, rep
  );
}

async function listConversations(user) {
  const rows = await q(
    `SELECT c.id, c.type, c.titre, c.created_at AS createdAt,
       (SELECT m.contenu FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernier,
       (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernierAt,
       (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernierPar,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND (m.sender_id IS NULL OR m.sender_id <> :uid)
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)) AS nonLus
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = :uid
     ORDER BY COALESCE((SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id), c.created_at) DESC, c.id DESC`,
    { uid: user.id }
  );
  if (!rows.length) return [];

  const people = await q(
    `SELECT cp.conversation_id AS conversationId, u.id, u.prenom, u.nom, u.role, u.photo
     FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id IN (:ids)`,
    { ids: rows.map((r) => r.id) }
  );
  const byConv = new Map();
  people.forEach((p) => { if (!byConv.has(p.conversationId)) byConv.set(p.conversationId, []); byConv.get(p.conversationId).push(p); });

  return rows.map((r) => {
    const participants = byConv.get(r.id) || [];
    const other = participants.find((p) => p.id !== user.id);
    return {
      ...r,
      nonLus: Number(r.nonLus),
      participants,
      titre: r.type === 'prive' ? (other ? `${other.prenom} ${other.nom}` : 'Conversation') : (r.titre || 'Groupe'),
      photo: r.type === 'prive' ? other?.photo || null : null,
    };
  });
}

async function unread(userId) {
  const [{ total }] = await q(
    `SELECT COUNT(*) AS total FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = :uid
     WHERE (m.sender_id IS NULL OR m.sender_id <> :uid) AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)`,
    { uid: userId }
  );
  return Number(total);
}

async function createConversation(user, { type, userIds = [], titre, cibleType, cibleId }) {
  if (type === 'groupe' && user.role !== 'admin') throw new ApiError(403, 'Seul l’administrateur peut créer un groupe.');

  const ids = new Set(userIds.map(Number).filter((n) => Number.isInteger(n) && n > 0));
  if (type === 'groupe' && cibleType && cibleType !== 'aucune') {
    (await notifications.recipientIds({ cibleType, cibleId: Number(cibleId) })).forEach((id) => ids.add(id));
  }
  ids.delete(user.id);
  if (!ids.size) throw new ApiError(400, 'Choisissez au moins un destinataire.');
  if (ids.size + 1 > M.groupMax) throw new ApiError(400, `Un groupe est limité à ${M.groupMax} personnes.`);
  if (type === 'prive' && ids.size !== 1) throw new ApiError(400, 'Une conversation privée concerne une seule personne.');

  const allowed = await allowedIds(user);
  if (allowed) for (const id of ids) if (!allowed.includes(id)) throw new ApiError(403, 'Vous ne pouvez pas écrire à cette personne.');
  const found = await q('SELECT id FROM users WHERE id IN (:ids)', { ids: [...ids] });
  if (found.length !== ids.size) throw new ApiError(400, 'Destinataire introuvable.');

  if (type === 'prive') {
    const other = [...ids][0];
    const [ex] = await q(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = :me
       JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = :other
       WHERE c.type = 'prive' LIMIT 1`,
      { me: user.id, other }
    );
    if (ex) return { id: ex.id, existante: true };
  }

  const t = await sequelize.transaction();
  try {
    const c = await Conversation.create({ type, titre: type === 'groupe' ? String(titre).trim() : null, createdBy: user.id }, { transaction: t });
    await ConversationParticipant.bulkCreate(
      [{ conversationId: c.id, userId: user.id, lastReadAt: new Date() }, ...[...ids].map((userId) => ({ conversationId: c.id, userId }))],
      { transaction: t }
    );
    await t.commit();
    logger.success('MSG', `Conversation #${c.id} (${type}) créée par ${user.email} avec ${ids.size} destinataire(s)`);
    return { id: c.id, existante: false };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function messages(user, id, { after }) {
  await assertMember(id, user.id);
  const select = `SELECT m.id, m.sender_id AS senderId, m.contenu, m.created_at AS createdAt,
      CONCAT(u.prenom, ' ', u.nom) AS expediteur, u.role AS role
    FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = :id`;
  let rows;
  if (after) {
    rows = await q(`${select} AND m.id > :after ORDER BY m.id ASC LIMIT 200`, { id, after });
  } else {
    rows = await q(`${select} ORDER BY m.id DESC LIMIT :limit`, { id, limit: M.pageSize });
    rows.reverse();
  }
  if (!after || rows.length) await markRead(id, user.id);
  return { items: rows };
}

async function send(user, id, contenu) {
  await assertMember(id, user.id);
  const m = await Message.create({ conversationId: id, senderId: user.id, contenu });
  await markRead(id, user.id);
  return { id: m.id };
}

async function removeConversation(user, id) {
  await assertMember(id, user.id);
  await Conversation.destroy({ where: { id } }); // participants et messages supprimés en cascade
  logger.warn('MSG', `Conversation #${id} supprimée par ${user.email}`);
}

module.exports = { contacts, listConversations, unread, createConversation, messages, send, removeConversation };