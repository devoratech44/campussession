// backend/src/services/surveillanceService.js
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const S = cfg.surveillance;
const q = (sql, r = {}) => sequelize.query(sql, { replacements: r, type: QueryTypes.SELECT });
const run = (sql, r = {}) => sequelize.query(sql, { replacements: r });
const EVENTS = ['sortie', 'raccourci', 'copie_collage'];

const log = (sid, eid, type, detail = null, alerte = 0) =>
  run('INSERT INTO surveillance_logs (surveillance_id, etudiant_id, type, detail, alerte) VALUES (:sid,:eid,:type,:detail,:alerte)', { sid, eid, type, detail, alerte });

// ---------- Administrateur ----------
async function list() {
  try {
    return await listInner();
  } catch (err) {
    logger.error('SURV', `list : ${err.original?.sqlMessage || err.parent?.sqlMessage || err.message}`);
    throw err;
  }
}

async function listInner() {
  return q(`SELECT s.id, s.titre, s.type, s.duree_minutes AS dureeMinutes, s.max_alertes AS maxAlertes, s.statut, s.started_at AS startedAt, s.outils,
    (SELECT COUNT(*) FROM surveillance_etudiants e WHERE e.surveillance_id = s.id) AS nbEtudiants,
    (SELECT COUNT(*) FROM surveillance_etudiants e WHERE e.surveillance_id = s.id AND e.statut = 'en_cours') AS nbEnCours,
    (SELECT COALESCE(SUM(e.alertes),0) FROM surveillance_etudiants e WHERE e.surveillance_id = s.id) AS nbAlertes
    FROM surveillances s ORDER BY s.id DESC LIMIT 100`);
}

async function create(b, user) {
  const titre = String(b.titre || '').trim();
  const duree = Number(b.dureeMinutes);
  if (titre.length < 2) throw new ApiError(400, 'Titre : 2 caractères minimum.');
  if (!Number.isInteger(duree) || duree < 5 || duree > 480) throw new ApiError(400, 'Durée : 5 à 480 minutes.');
  const ids = new Set((b.etudiantIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0));
  if (Number(b.classeId)) (await q("SELECT id FROM users WHERE role = 'etudiant' AND classe_id = :c", { c: Number(b.classeId) })).forEach((r) => ids.add(r.id));
  if (!ids.size) throw new ApiError(400, 'Choisissez au moins un étudiant ou une classe.');

  const [id] = await run(
    'INSERT INTO surveillances (titre, type, consignes, outils, duree_minutes, max_alertes, created_by) VALUES (:titre,:type,:consignes,:outils,:duree,:max,:by)',
    { titre, type: b.type === 'examen' ? 'examen' : 'devoir', consignes: b.consignes || null, outils: b.outils || null, duree, max: Math.min(20, Math.max(1, Number(b.maxAlertes) || 3)), by: user.id }
  );
  const list = [...ids];
  await run(`INSERT IGNORE INTO surveillance_etudiants (surveillance_id, etudiant_id) VALUES ${list.map(() => '(?,?)').join(',')}`, list.flatMap((e) => [id, e]));
  logger.success('SURV', `Surveillance #${id} créée (${list.length} étudiant(s)) par ${user.email}`);
  return { id };
}

async function setStatus(id, statut, user) {
  const [s] = await q('SELECT id, statut FROM surveillances WHERE id = :id', { id });
  if (!s) throw new ApiError(404, 'Surveillance introuvable.');
  if (statut === 'active') await run("UPDATE surveillances SET statut = 'active', started_at = UTC_TIMESTAMP() WHERE id = :id", { id });
  else {
    await run("UPDATE surveillances SET statut = 'terminee' WHERE id = :id", { id });
    await run("UPDATE surveillance_etudiants SET statut = 'termine', termine_at = UTC_TIMESTAMP() WHERE surveillance_id = :id AND statut = 'en_cours'", { id });
  }
  logger.warn('SURV', `Surveillance #${id} → ${statut} par ${user.email}`);
}

async function detail(id) {
  const [s] = await q('SELECT id, titre, type, consignes, outils, duree_minutes AS dureeMinutes, max_alertes AS maxAlertes, statut FROM surveillances WHERE id = :id', { id });
  if (!s) throw new ApiError(404, 'Surveillance introuvable.');
  const etudiants = await q(`SELECT u.id, u.prenom, u.nom, u.matricule, e.statut, e.alertes, e.entre_at AS entreAt, e.termine_at AS termineAt
    FROM surveillance_etudiants e JOIN users u ON u.id = e.etudiant_id WHERE e.surveillance_id = :id ORDER BY u.nom, u.prenom`, { id });
  const logs = await q(`SELECT l.id, l.etudiant_id AS etudiantId, CONCAT(u.prenom,' ',u.nom) AS etudiant, l.type, l.detail, l.alerte, l.created_at AS createdAt
    FROM surveillance_logs l JOIN users u ON u.id = l.etudiant_id WHERE l.surveillance_id = :id ORDER BY l.id DESC LIMIT 300`, { id });
  return { surveillance: s, etudiants, logs: logs.map((l) => ({ ...l, alerte: Boolean(l.alerte) })) };
}

async function exclure(id, eid, user) {
  await run("UPDATE surveillance_etudiants SET statut = 'exclu', termine_at = UTC_TIMESTAMP() WHERE surveillance_id = :id AND etudiant_id = :eid", { id, eid });
  await log(id, eid, 'exclusion', `Exclu par ${user.email}`, 1);
}

// ---------- Étudiant ----------
async function finish(sid, eid, reason) {
  await run("UPDATE surveillance_etudiants SET statut = 'termine', termine_at = UTC_TIMESTAMP() WHERE surveillance_id = :sid AND etudiant_id = :eid AND statut = 'en_cours'", { sid, eid });
  await log(sid, eid, reason);
}

async function mine(user) {
  const [s] = await q(`SELECT s.id, s.titre, s.type, s.consignes, s.outils, s.duree_minutes AS dureeMinutes, s.max_alertes AS maxAlertes,
      e.statut AS etat, e.alertes, e.entre_at AS entreAt
    FROM surveillances s JOIN surveillance_etudiants e ON e.surveillance_id = s.id AND e.etudiant_id = :uid
    WHERE s.statut = 'active' ORDER BY s.id DESC LIMIT 1`, { uid: user.id });
  if (!s) return { surveillance: null };
  let restantMs = null;
  if (s.entreAt && s.etat === 'en_cours') {
    restantMs = new Date(s.entreAt).getTime() + s.dureeMinutes * 60000 - Date.now();
    if (restantMs <= 0) { await finish(s.id, user.id, 'temps_ecoule'); s.etat = 'termine'; restantMs = 0; }
  }
  return {
    surveillance: { id: s.id, titre: s.titre, type: s.type, consignes: s.consignes, outils: s.outils, dureeMinutes: s.dureeMinutes, maxAlertes: s.maxAlertes },
    etat: { statut: s.etat, alertes: s.alertes, restantMs },
    graceSeconds: S.graceSeconds,
  };
}

async function enter(user, id) {
  const cur = await mine(user);
  if (!cur.surveillance || cur.surveillance.id !== id) throw new ApiError(403, "Vous n'avez pas de devoir ou d'examen surveillé.");
  if (cur.etat.statut === 'attendu') {
    await run("UPDATE surveillance_etudiants SET statut = 'en_cours', entre_at = UTC_TIMESTAMP() WHERE surveillance_id = :id AND etudiant_id = :uid", { id, uid: user.id });
    await log(id, user.id, 'entree', 'Début du chronomètre');
  }
  return mine(user);
}

async function event(user, id, { type, dureeSec }) {
  const cur = await mine(user);
  if (!cur.surveillance || cur.surveillance.id !== id || cur.etat.statut !== 'en_cours') throw new ApiError(409, 'Session non active.');
  if (!EVENTS.includes(type)) throw new ApiError(400, 'Événement inconnu.');
  const sec = Math.max(0, Math.min(86400, Number(dureeSec) || 0));
  // Journal uniquement : aucun avertissement, aucun blocage
  await log(id, user.id, type, type === 'sortie' ? `Hors de la page ${sec} s` : null, 0);
  return { statut: 'en_cours' };
}

async function terminer(user, id) {
  await finish(id, user.id, 'fin');
  return { ok: true };
}

async function pendingCount(userId) {
  const [r] = await q(`SELECT COUNT(*) AS nb FROM surveillances s JOIN surveillance_etudiants e ON e.surveillance_id = s.id
    WHERE s.statut = 'active' AND e.etudiant_id = :uid AND e.statut IN ('attendu','en_cours')`, { uid: userId });
  return Number(r.nb);
}

module.exports = { list, create, setStatus, detail, exclure, mine, enter, event, terminer, pendingCount };