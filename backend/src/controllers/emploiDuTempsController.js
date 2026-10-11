// backend/src/controllers/emploiDuTempsController.js
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const time = require('../utils/timeUtils');
const { EmploiDuTemps, Enseignement, User } = require('../models');
const svc = require('../services/enseignementService');

const asId = (value) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const serializeSlot = (slot) => {
  const d = slot.toJSON();
  return {
    id: d.id,
    enseignementId: d.enseignementId,
    jour: d.jour,
    heureDebut: time.fromSql(d.heureDebut),
    heureFin: time.fromSql(d.heureFin),
    salle: d.salle,
    dateDebut: d.dateDebut,
    dateFin: d.dateFin,
    enseignement: svc.serialize(d.enseignement),
  };
};

const includeEns = (where) => ({
  model: Enseignement,
  as: 'enseignement',
  required: true,
  include: svc.INCLUDES,
  ...(where ? { where } : {}),
});

const findSlots = (slotWhere, ensWhere) =>
  EmploiDuTemps.findAll({
    where: slotWhere,
    include: [includeEns(ensWhere)],
    order: [['jour', 'ASC'], ['heureDebut', 'ASC']],
  });

// Filtres : classe, filière, professeur, module, groupe, étudiant, type de cours, salle (§ 6)
async function buildFilters(query) {
  const and = [];
  const moduleId = asId(query.moduleId);
  const professeurId = asId(query.professeurId);
  const groupeId = asId(query.groupeId);
  const classeId = asId(query.classeId);
  const filiereId = asId(query.filiereId);
  const etudiantId = asId(query.etudiantId);

  if (moduleId) and.push({ moduleId });
  if (professeurId) and.push({ professeurId });
  if (groupeId) and.push({ publicType: 'groupe', groupeId });
  if (classeId) and.push(svc.whereForClasse(classeId));
  if (filiereId) and.push(svc.whereForFiliere(filiereId));
  if (etudiantId) {
    const student = await User.findOne({ where: { id: etudiantId, role: 'etudiant' } });
    and.push(student ? await svc.whereForStudent(student) : { id: 0 });
  }
  if (query.type === 'collectif') and.push({ publicType: { [Op.ne]: 'etudiant' } });
  if (query.type === 'individuel') and.push({ publicType: 'etudiant' });

  const slotWhere = {};
  const salle = String(query.salle || '').trim();
  if (salle) slotWhere.salle = { [Op.like]: `%${salle}%` };

  return { slotWhere, ensWhere: and.length ? { [Op.and]: and } : undefined };
}

// ---------- Conflits ----------
const targetKey = (e) => `${e.publicType}:${e[svc.TARGET_FIELD[e.publicType]]}`;

// null = illimité
const periodsOverlap = (a, b) => {
  if (a.dateFin && b.dateDebut && a.dateFin < b.dateDebut) return false;
  if (b.dateFin && a.dateDebut && b.dateFin < a.dateDebut) return false;
  return true;
};

async function findConflicts(data, excludeId) {
  const target = await Enseignement.findByPk(data.enseignementId);
  const candidates = await EmploiDuTemps.findAll({
    where: {
      jour: data.jour,
      heureDebut: { [Op.lt]: time.toSql(data.finMin) },
      heureFin: { [Op.gt]: time.toSql(data.debutMin) },
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    include: [includeEns()],
  });

  const conflicts = [];
  candidates.forEach((c) => {
    if (!periodsOverlap(data, c)) return;
    const other = c.enseignement;
    const raisons = [];
    if (other.professeurId === target.professeurId) raisons.push('professeur');
    if (data.salle && c.salle && c.salle.trim().toLowerCase() === data.salle.toLowerCase()) raisons.push('salle');
    if (targetKey(other) === targetKey(target)) raisons.push('public');
    if (!raisons.length) return;

    const s = serializeSlot(c);
    conflicts.push({
      id: s.id, jour: s.jour, heureDebut: s.heureDebut, heureFin: s.heureFin, raisons,
      module: s.enseignement.module.code, professeur: `${s.enseignement.professeur.prenom} ${s.enseignement.professeur.nom}`,
      publicLabel: s.enseignement.publicLabel,
    });
  });
  return conflicts;
}

async function prepare(body) {
  const debutMin = time.parse(body.heureDebut);
  const finMin = time.parse(body.heureFin);
  if (!(await Enseignement.count({ where: { id: body.enseignementId } }))) {
    throw new ApiError(400, 'Enseignement introuvable.');
  }
  return {
    enseignementId: body.enseignementId,
    jour: body.jour,
    debutMin,
    finMin,
    heureDebut: time.toSql(debutMin),
    heureFin: time.toSql(finMin),
    salle: body.salle ? String(body.salle).trim() : null,
    dateDebut: body.dateDebut || null,
    dateFin: body.dateFin || null,
  };
}

async function guardConflicts(data, body, excludeId) {
  if (body.forcer === true || body.forcer === 'true') return;
  const conflits = await findConflicts(data, excludeId);
  if (conflits.length) throw new ApiError(409, "Conflit d'horaire détecté.", { code: 'SCHEDULE_CONFLICT', conflits });
}

const fields = (d) => ({
  enseignementId: d.enseignementId, jour: d.jour, heureDebut: d.heureDebut, heureFin: d.heureFin,
  salle: d.salle, dateDebut: d.dateDebut, dateFin: d.dateFin,
});

const loadSlot = async (id) => serializeSlot(await EmploiDuTemps.findByPk(id, { include: [includeEns()] }));

// ---------- Routes ----------
exports.list = asyncHandler(async (req, res) => {
  const { slotWhere, ensWhere } = await buildFilters(req.query);
  const rows = await findSlots(slotWhere, ensWhere);
  res.json({ success: true, data: rows.map(serializeSlot) });
});

// Consultation par le professeur (ses cours) ou l'étudiant (le sien)
exports.mine = asyncHandler(async (req, res) => {
  const ensWhere = req.user.role === 'professeur' ? { professeurId: req.user.id } : await svc.whereForStudent(req.user);
  const rows = await findSlots({}, ensWhere);
  res.json({ success: true, data: rows.map(serializeSlot) });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await prepare(req.body);
  await guardConflicts(data, req.body);
  const slot = await EmploiDuTemps.create(fields(data));
  logger.success('EDT', `Créneau créé : jour ${data.jour} ${data.heureDebut}-${data.heureFin} (enseignement #${data.enseignementId})`);
  res.status(201).json({ success: true, data: await loadSlot(slot.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const slot = await EmploiDuTemps.findByPk(req.params.id);
  if (!slot) throw new ApiError(404, 'Créneau introuvable.');
  const data = await prepare(req.body);
  await guardConflicts(data, req.body, slot.id);
  await slot.update(fields(data));
  logger.info('EDT', `Créneau modifié : #${slot.id}`);
  res.json({ success: true, data: await loadSlot(slot.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  const slot = await EmploiDuTemps.findByPk(req.params.id);
  if (!slot) throw new ApiError(404, 'Créneau introuvable.');
  await slot.destroy();
  logger.warn('EDT', `Créneau supprimé : #${slot.id}`);
  res.json({ success: true });
});