// backend/src/controllers/presenceController.js
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const time = require('../utils/timeUtils');
const { Seance, Presence, Enseignement } = require('../models');
const ens = require('../services/enseignementService');
const svc = require('../services/sessionService');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const asId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };

// Le professeur n'accède qu'à ses séances ; l'administrateur à toutes
async function accessible(req) {
  const s = await svc.findSeance(req.params.id);
  if (req.user.role === 'professeur' && s.enseignement.professeurId !== req.user.id) {
    throw new ApiError(403, "Cette séance n'est pas la vôtre.");
  }
  return s;
}
const sendDetail = async (res, s) => res.json({ success: true, data: await svc.getDetail(s) });

exports.listSeances = asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {};
  const range = {};
  if (DATE.test(q.dateDebut || '')) range[Op.gte] = q.dateDebut;
  if (DATE.test(q.dateFin || '')) range[Op.lte] = q.dateFin;
  if (DATE.test(q.dateDebut || '') || DATE.test(q.dateFin || '')) where.dateSeance = range;
  if (cfg.seanceStatuts.includes(q.statut)) where.statut = q.statut;

  const and = [];
  if (req.user.role === 'professeur') and.push({ professeurId: req.user.id });
  else if (asId(q.professeurId)) and.push({ professeurId: asId(q.professeurId) });
  if (asId(q.moduleId)) and.push({ moduleId: asId(q.moduleId) });
  if (asId(q.classeId)) and.push(ens.whereForClasse(asId(q.classeId)));

  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(q.limit, 10) || cfg.pagination.defaultLimit));

  const { rows, count } = await Seance.findAndCountAll({
    where,
    attributes: svc.SEANCE_ATTRS,
    include: [{ model: Enseignement, as: 'enseignement', required: true, include: ens.INCLUDES, ...(and.length ? { where: { [Op.and]: and } } : {}) }],
    order: [['dateSeance', q.ordre === 'asc' ? 'ASC' : 'DESC'], ['heureDebut', 'ASC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  const counts = await svc.countsFor(rows);
  let items = rows.map((s) => svc.serializeSeance(s, counts[s.id]));

  // Séances à venir (professeur : les siennes ; admin : toutes), seulement si aucun filtre de statut n'est posé
  if (q.avenir !== 'false' && !q.statut && DATE.test(q.dateDebut || '') && DATE.test(q.dateFin || '')) {
    const virtual = await svc.virtualSeances({
      from: q.dateDebut, to: q.dateFin,
      professeurId: req.user.role === 'professeur' ? req.user.id : asId(q.professeurId),
    });
    items = [...items, ...virtual.filter((v) => !asId(q.moduleId) || v.enseignement.module.id === asId(q.moduleId))]
      .sort((a, b) => `${a.date}${a.heureDebut}`.localeCompare(`${b.date}${b.heureDebut}`) * (q.ordre === 'asc' ? 1 : -1));
  }
  res.json({
    success: true,
    data: { items, total: count + (items.length - rows.length), page, limit, pages: Math.max(1, Math.ceil(count / limit)) },
  });
});

exports.getSeance = asyncHandler(async (req, res) => sendDetail(res, await accessible(req)));

exports.createSeance = asyncHandler(async (req, res) => {
  const { enseignementId, date, heureDebut, heureFin, salle } = req.body;
  if (!(await Enseignement.count({ where: { id: enseignementId } }))) throw new ApiError(400, 'Enseignement introuvable.');
  const created = await svc.newSeance({
    enseignementId,
    dateSeance: date,
    heureDebut: time.toSql(time.parse(heureDebut)),
    heureFin: time.toSql(time.parse(heureFin)),
    salle: salle || null,
    modifiee: true,
    createdBy: req.user.id,
  });
  logger.success('SESSION', `Séance créée manuellement : #${created.id} (${date})`);
  res.status(201);
  await sendDetail(res, await svc.findSeance(created.id));
});

exports.updateSeance = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await s.update({
    dateSeance: req.body.date,
    heureDebut: time.toSql(time.parse(req.body.heureDebut)),
    heureFin: time.toSql(time.parse(req.body.heureFin)),
    salle: req.body.salle || null,
    modifiee: true,
  });
  logger.info('SESSION', `Séance modifiée : #${s.id}`);
  await sendDetail(res, s);
});

exports.removeSeance = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await s.destroy();
  logger.warn('SESSION', `Séance supprimée : #${s.id}`);
  res.json({ success: true });
});

exports.ouvrir = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await svc.openSeance(s, { duree: req.body.duree });
  await sendDetail(res, s);
});

exports.fermer = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  await svc.closeSeance(s);
  await sendDetail(res, s);
});

exports.annuler = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await svc.cancelSeance(s, req.body.motif);
  await sendDetail(res, s);
});

exports.signer = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  await svc.signSeance(s, req.body.signature, req.user);
  await sendDetail(res, s);
});

exports.points = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  await s.update({ pointsAbordes: req.body.pointsAbordes || null });
  await sendDetail(res, s);
});

exports.retard = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  await svc.setRetard(s, req.body.etudiantId, req.body.minutes, req.user);
  await sendDetail(res, s);
});

exports.signatureProf = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  const row = await Seance.findByPk(s.id, { attributes: ['id', 'signatureProf', 'signeAt'] });
  if (!row.signatureProf) throw new ApiError(404, 'Aucune signature enregistrée.');
  res.json({ success: true, data: { signature: row.signatureProf, at: row.signeAt } });
});

exports.signatureEtudiant = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  const row = await Presence.findOne({ where: { seanceId: s.id, etudiantId: req.params.etudiantId }, attributes: ['signature', 'scannedAt'] });
  if (!row?.signature) throw new ApiError(404, 'Aucune signature enregistrée.');
  res.json({ success: true, data: { signature: row.signature, at: row.scannedAt } });
});

exports.setPresence = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await svc.adminSetPresence(s, Number(req.params.etudiantId), req.body, req.user);
  await sendDetail(res, s);
});

exports.deletePresence = asyncHandler(async (req, res) => {
  const s = await svc.findSeance(req.params.id);
  await Presence.destroy({ where: { seanceId: s.id, etudiantId: req.params.etudiantId } });
  logger.warn('PRESENCE', `Ligne supprimée : séance #${s.id}, étudiant #${req.params.etudiantId}`);
  await sendDetail(res, s);
});

// Historique filtrable (séances fermées)
exports.historique = asyncHandler(async (req, res) => {
  const q = req.query;
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(q.limit, 10) || cfg.pagination.defaultLimit));

  const where = ["s.statut = 'fermee'"];
  const rep = {};
  const add = (cond, key, value) => { where.push(cond); rep[key] = value; };
  if (asId(q.etudiantId)) add('p.etudiant_id = :etudiantId', 'etudiantId', asId(q.etudiantId));
  if (asId(q.classeId)) add('u.classe_id = :classeId', 'classeId', asId(q.classeId));
  if (asId(q.moduleId)) add('e.module_id = :moduleId', 'moduleId', asId(q.moduleId));
  if (asId(q.professeurId)) add('e.professeur_id = :professeurId', 'professeurId', asId(q.professeurId));
  if (cfg.presenceStatuts.includes(q.statut)) add('p.statut = :statut', 'statut', q.statut);
  if (q.justifie === 'true' || q.justifie === 'false') add('p.justifie = :justifie', 'justifie', q.justifie === 'true' ? 1 : 0);
  if (DATE.test(q.du || '')) add('s.date_seance >= :du', 'du', q.du);
  if (DATE.test(q.au || '')) add('s.date_seance <= :au', 'au', q.au);

  const FROM = `FROM presences p
    JOIN seances s ON s.id = p.seance_id
    JOIN enseignements e ON e.id = s.enseignement_id
    JOIN modules m ON m.id = e.module_id
    JOIN users pr ON pr.id = e.professeur_id
    JOIN users u ON u.id = p.etudiant_id
    LEFT JOIN classes c ON c.id = u.classe_id
    WHERE ${where.join(' AND ')}`;

  const [{ total }] = await sequelize.query(`SELECT COUNT(*) AS total ${FROM}`, { replacements: rep, type: QueryTypes.SELECT });
  const rows = await sequelize.query(
    `SELECT p.seance_id AS seanceId, p.etudiant_id AS etudiantId, p.statut, p.minutes_retard AS minutesRetard,
            p.justifie, p.motif_justification AS motifJustification, p.remarque, p.methode, p.scanned_at AS scannedAt,
            u.prenom, u.nom, u.matricule, c.nom AS classe,
            DATE_FORMAT(s.date_seance, '%Y-%m-%d') AS dateSeance,
            TIME_FORMAT(s.heure_debut, '%H:%i') AS heureDebut, TIME_FORMAT(s.heure_fin, '%H:%i') AS heureFin,
            m.code AS moduleCode, m.nom AS moduleNom, CONCAT(pr.prenom, ' ', pr.nom) AS professeur
     ${FROM}
     ORDER BY s.date_seance DESC, s.heure_debut DESC, u.nom ASC
     LIMIT :limit OFFSET :offset`,
    { replacements: { ...rep, limit, offset: (page - 1) * limit }, type: QueryTypes.SELECT }
  );

  res.json({
    success: true,
    data: {
      items: rows.map((r) => ({ ...r, justifie: Boolean(r.justifie) })),
      total: Number(total), page, limit, pages: Math.max(1, Math.ceil(Number(total) / limit)),
    },
  });
});

// ---------- Étudiant ----------
exports.pointageInfo = asyncHandler(async (req, res) => {
  if (!req.query.token) throw new ApiError(400, 'QR code manquant.');
  res.json({ success: true, data: await svc.pointageInfo(req.user, req.query.token, req.query.k) });
});

exports.pointer = asyncHandler(async (req, res) => {
  const meta = { ip: req.ip, appareil: String(req.get('user-agent') || '').slice(0, 200) };
  res.json({ success: true, data: await svc.checkIn(req.user, req.body, meta) });
});

exports.pointageCourant = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.pointageCourant(req.user) });
});

exports.pointageSignature = asyncHandler(async (req, res) => {
  const meta = { ip: req.ip, appareil: String(req.get('user-agent') || '').slice(0, 200) };
  res.json({ success: true, data: await svc.saveSignature(req.user, req.body, meta) });
});

// ---------- Professeur / admin ----------
exports.qr = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  res.json({ success: true, data: svc.qrFor(s) });
});

exports.pointerPour = asyncHandler(async (req, res) => {
  const s = await accessible(req);
  await svc.pointerPour(s, Number(req.params.etudiantId), req.body.signature, req.user);
  await sendDetail(res, s);
});