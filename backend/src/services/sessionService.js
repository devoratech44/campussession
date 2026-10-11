// backend/src/services/sessionService.js
const crypto = require('crypto');
const { Op, QueryTypes, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const time = require('../utils/timeUtils');
const { Seance, Presence, Enseignement, EmploiDuTemps, User, Classe, Filiere, Groupe } = require('../models');
const ens = require('./enseignementService');
const blockService = require('./blockService');
const mailService = require('./mailService');
const qr = require('./qrService');

const S = cfg.sessions;
const MIN = 60 * 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I
const SEANCE_ATTRS = { exclude: ['signatureProf'] };

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Heure locale du serveur (le serveur doit être à l'heure de l'établissement)
const atMinutes = (dateStr, minutes) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes, 0, 0);
};
const bounds = (s) => ({
  start: atMinutes(s.dateSeance, time.parse(s.heureDebut)),
  end: atMinutes(s.dateSeance, time.parse(s.heureFin)),
});

const seanceIncludes = () => [{ model: Enseignement, as: 'enseignement', required: true, include: ens.INCLUDES }];

async function findSeance(id) {
  const s = await Seance.findByPk(id, { attributes: SEANCE_ATTRS, include: seanceIncludes() });
  if (!s) throw new ApiError(404, 'Séance introuvable.');
  return s;
}

// ---------- Codes ----------
function randomCode(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

async function uniqueCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = randomCode(S.codeLength);
    const used = await Seance.count({ where: { codeAcces: code, statut: { [Op.in]: ['planifiee', 'ouverte'] } } });
    if (!used) return code;
  }
  throw new ApiError(500, 'Impossible de générer un code de présence.');
}

async function newSeance(fields) {
  return Seance.create({
    ...fields,
    statut: 'planifiee',
    qrToken: crypto.randomBytes(24).toString('hex'),
    codeAcces: await uniqueCode(),
  });
}

// ---------- Étudiants d'une séance ----------
async function studentsOf(enseignement) {
  const ids = await ens.studentIdsFor(enseignement);
  if (!ids.length) return [];
  return User.findAll({
    where: { id: ids, role: 'etudiant' },
    attributes: ['id', 'prenom', 'nom', 'matricule', 'photo', 'email', 'estBloque', 'classeId', 'filiereId'],
    order: [['nom', 'ASC'], ['prenom', 'ASC']],
  });
}

async function assertStudentIn(enseignement, user) {
  const where = { [Op.and]: [{ id: enseignement.id }, await ens.whereForStudent(user)] };
  if (!(await Enseignement.count({ where }))) {
    logger.warn('POINTAGE', `Refusé (hors cours) : ${user.prenom} ${user.nom} (${user.matricule}) | enseignement #${enseignement.id}`);
    throw new ApiError(403, "Ce QR code ne correspond pas à l'un de vos cours : vous ne faites pas partie de ce cours.", { code: 'NOT_MEMBER' });
  }
}

async function filieresOf(e) {
  if (e.publicType === 'filiere') return [e.filiere?.nom].filter(Boolean);
  if (e.publicType === 'classe') {
    const c = await Classe.findByPk(e.classeId, { include: [{ model: Filiere, as: 'filieres', attributes: ['nom'] }] });
    return c ? c.filieres.map((f) => f.nom) : [];
  }
  if (e.publicType === 'groupe') {
    const g = await Groupe.findByPk(e.groupeId, {
      include: [
        { model: Filiere, as: 'filiere', attributes: ['nom'] },
        { model: Classe, as: 'classe', include: [{ model: Filiere, as: 'filieres', attributes: ['nom'] }] },
      ],
    });
    if (!g) return [];
    return g.filiere ? [g.filiere.nom] : (g.classe?.filieres || []).map((f) => f.nom);
  }
  const u = await User.findByPk(e.etudiantId, { include: [{ model: Filiere, as: 'filiere', attributes: ['nom'] }] });
  return u?.filiere ? [u.filiere.nom] : [];
}

async function buildInfo(s) {
  const e = s.enseignement;
  const prof = await User.findByPk(e.professeurId, { attributes: ['prenom', 'nom', 'email'] });
  const { start } = bounds(s);
  return {
    seanceId: s.id,
    date: s.dateSeance,
    heureDebut: time.fromSql(s.heureDebut),
    heureFin: time.fromSql(s.heureFin),
    salle: s.salle || e.classe?.salle || null,
    moduleCode: e.module.code,
    moduleNom: e.module.nom,
    professeur: `${prof.prenom} ${prof.nom}`,
    profPrenom: prof.prenom,
    profEmail: prof.email,
    publicType: e.publicType,
    publicLabel: ens.serialize(e).publicLabel,
    filieres: await filieresOf(e),
    nbEtudiants: (await ens.studentIdsFor(e)).length,
    ouvertureA: hhmm(new Date(start.getTime() - S.openBeforeMin * MIN)),
  };
}

// ---------- Sérialisation ----------
function serializeSeance(s, counts) {
  const d = s.toJSON();
  const e = d.enseignement ? ens.serialize(d.enseignement) : null;
  return {
    id: d.id,
    enseignementId: d.enseignementId,
    creneauId: d.creneauId,
    date: d.dateSeance,
    heureDebut: time.fromSql(d.heureDebut),
    heureFin: time.fromSql(d.heureFin),
    salle: d.salle || e?.salleParDefaut || null,
    statut: d.statut,
    motifAnnulation: d.motifAnnulation,
    pointsAbordes: d.pointsAbordes,
    signe: Boolean(d.signeAt),
    signeAt: d.signeAt,
    ouverteAt: d.ouverteAt,
    scanJusqua: d.scanJusqua,
    fermeeAt: d.fermeeAt,
    modifiee: Boolean(d.modifiee),
    enseignement: e,
    counts: counts || null,
  };
}

async function countsFor(list) {
  if (!list.length) return {};
  const rows = await sequelize.query(
    'SELECT seance_id AS id, statut, COUNT(*) AS total FROM presences WHERE seance_id IN (:ids) GROUP BY seance_id, statut',
    { replacements: { ids: list.map((s) => s.id) }, type: QueryTypes.SELECT }
  );
  const map = {};
  for (const s of list) {
    const total = (await ens.studentIdsFor(s.enseignement)).length;
    map[s.id] = { total, present: 0, retard: 0, absent: 0 };
  }
  rows.forEach((r) => {
    if (map[r.id] && r.statut !== 'absent') map[r.id][r.statut] = Number(r.total);
  });
  Object.values(map).forEach((c) => { c.absent = Math.max(0, c.total - c.present - c.retard); });
  return map;
}

async function getDetail(s) {
  const students = await studentsOf(s.enseignement);
  const rows = await Presence.findAll({
    where: { seanceId: s.id },
    attributes: { exclude: ['signature'], include: [[literal('(`Presence`.`signature` IS NOT NULL)'), 'aSigne']] },
  });
  const byStudent = new Map(rows.map((r) => [r.etudiantId, r]));

  const etudiants = students.map((u) => {
    const r = byStudent.get(u.id);
    return {
      id: u.id,
      prenom: u.prenom,
      nom: u.nom,
      matricule: u.matricule,
      photo: u.photo,
      statut: r ? r.statut : 'absent',
      minutesRetard: r ? r.minutesRetard : 0,
      justifie: r ? Boolean(r.justifie) : false,
      motifJustification: r ? r.motifJustification : null,
      remarque: r ? r.remarque : null,
      methode: r ? r.methode : null,
      scannedAt: r ? r.scannedAt : null,
      aSigne: r ? Boolean(Number(r.get('aSigne'))) : false,
      enAttente: r ? Boolean(Number(r.get('aSigne'))) && !r.scannedAt && r.statut === 'absent' : false,
    };
  });

  const counts = {
    total: etudiants.length,
    present: etudiants.filter((x) => x.statut === 'present').length,
    retard: etudiants.filter((x) => x.statut === 'retard').length,
    absent: etudiants.filter((x) => x.statut === 'absent').length,
  };

  return {
    seance: serializeSeance(s, counts),
    etudiants,
    acces: s.statut === 'ouverte' && s.signeAt
      ? { code: s.codeAcces, scanUrl: `${S.publicUrl}/etudiant/pointage/${s.qrToken}` }
      : null,
    serverNow: new Date().toISOString(),
  };
}

// ---------- Cycle de vie ----------
async function openSeance(s, { duree } = {}) {
  if (s.statut === 'ouverte' && !duree) throw new ApiError(409, 'La session est déjà ouverte.');
  const now = new Date();
  const { end } = bounds(s);
  let scanJusqua;
  if (duree) scanJusqua = new Date(now.getTime() + duree * MIN);
  else if (now < end) scanJusqua = end;
  else scanJusqua = new Date(now.getTime() + S.reopenDefaultMin * MIN);

  await s.update({
    statut: 'ouverte',
    ouverteAt: s.ouverteAt || now,
    scanJusqua,
    autoFermeAt: new Date(scanJusqua.getTime() + S.closeAfterMin * MIN),
    fermeeAt: null,
    motifAnnulation: null,
  });
  logger.success('SESSION', `Session ouverte : #${s.id} (pointage jusqu'à ${hhmm(scanJusqua)})`);
}

async function cancelSeance(s, motif) {
  if (s.statut === 'annulee') throw new ApiError(409, 'La session est déjà annulée.');
  await s.update({ statut: 'annulee', motifAnnulation: motif || null, fermeeAt: new Date() });
  logger.warn('SESSION', `Session annulée : #${s.id}${motif ? ` (${motif})` : ''}`);
}

// Ferme : les non-pointés deviennent absents d'office, puis contrôle du blocage automatique
async function closeSeance(s, { auto = false } = {}) {
  if (s.statut !== 'ouverte') throw new ApiError(409, 'Seule une session ouverte peut être fermée.');
  if (!s.signeAt) {
    if (!auto) throw new ApiError(409, "La session n'est pas signée : faites signer le professeur ou annulez-la.");
    await cancelSeance(s, 'Session non signée par le professeur.');
    return;
  }

  const students = await studentsOf(s.enseignement);
  const existing = await Presence.findAll({ where: { seanceId: s.id }, attributes: ['etudiantId'] });
  const have = new Set(existing.map((r) => r.etudiantId));
  const missing = students.filter((u) => !have.has(u.id));
  if (missing.length) {
    await Presence.bulkCreate(missing.map((u) => ({ seanceId: s.id, etudiantId: u.id, statut: 'absent', minutesRetard: 0, methode: 'auto' })));
  }
  await s.update({ statut: 'fermee', fermeeAt: new Date() });

  const flagged = await Presence.findAll({
    where: { seanceId: s.id, justifie: false, statut: { [Op.in]: ['absent', 'retard'] } },
    attributes: ['etudiantId'],
  });
  for (const row of flagged) {
    const u = await User.findByPk(row.etudiantId);
    if (u && u.role === 'etudiant') await blockService.checkStudent(u);
  }
  logger.success('SESSION', `Session fermée : #${s.id} (${missing.length} absent(s) d'office)`);
}

async function signSeance(s, signature, actor) {
  if (s.statut !== 'ouverte') throw new ApiError(409, "La session n'est pas ouverte.");
  if (s.signeAt && actor.role !== 'admin') throw new ApiError(409, 'Cette session est déjà signée.');
  const signeAt = new Date();
  await Seance.update({ signatureProf: signature }, { where: { id: s.id } });
  await s.update({ signeAt, signePar: actor.id });
  logger.success('SESSION', `Session signée : #${s.id} par ${actor.email}`);
}

// ---------- Présences ----------
async function upsertPresence(seanceId, etudiantId, data, createDefaults = {}) {
  const row = await Presence.findOne({ where: { seanceId, etudiantId } });
  if (row) { await row.update(data); return row; }
  return Presence.create({ seanceId, etudiantId, ...createDefaults, ...data });
}

async function loadStudent(etudiantId) {
  const u = await User.findOne({ where: { id: etudiantId, role: 'etudiant' } });
  if (!u) throw new ApiError(404, 'Étudiant introuvable.');
  return u;
}

// Le professeur saisit uniquement des minutes de retard
async function setRetard(s, etudiantId, minutes, actor) {
  if (!['ouverte', 'fermee'].includes(s.statut)) throw new ApiError(409, "La session n'est pas en cours.");
  if (actor.role === 'professeur' && (s.statut !== 'ouverte' || !s.signeAt)) {
    throw new ApiError(409, 'Les retards se saisissent pendant la session, après signature.');
  }
  const u = await loadStudent(etudiantId);
  await assertStudentIn(s.enseignement, u);
  await upsertPresence(
    s.id, u.id,
    { statut: 'retard', minutesRetard: minutes, saisiPar: actor.id },
    { methode: actor.role === 'admin' ? 'admin' : 'prof' }
  );
  logger.info('PRESENCE', `Retard saisi : ${u.matricule} ${minutes} min (séance #${s.id}, ${actor.email})`);
}

// Correction complète par l'administrateur
async function adminSetPresence(s, etudiantId, body, actor) {
  const u = await loadStudent(etudiantId);
  await assertStudentIn(s.enseignement, u);
  const statut = body.statut;
  const justifie = statut === 'present' ? false : Boolean(body.justifie);
  await upsertPresence(
    s.id, u.id,
    {
      statut,
      minutesRetard: statut === 'retard' ? Math.max(1, Number(body.minutesRetard) || 1) : 0,
      justifie,
      motifJustification: justifie ? body.motifJustification || null : null,
      remarque: body.remarque || null,
      saisiPar: actor.id,
      // Remise à « absent » : l'étudiant doit pouvoir signer et pointer à nouveau
      ...(statut === 'absent' ? { scannedAt: null, signature: null, methode: 'admin' } : {}),
    },
    { methode: 'admin' }
  );
  if (s.statut === 'fermee' && statut !== 'present' && !justifie) await blockService.checkStudent(u);
  logger.info('PRESENCE', `Présence modifiée : ${u.matricule} → ${statut} (séance #${s.id})`);
}

// ---------- Pointage étudiant ----------
function scanBlock(s, nowMs) {
  if (s.statut === 'planifiee') return { code: 'NOT_OPEN', message: "La session n'est pas encore ouverte." };
  if (s.statut === 'annulee') return { code: 'CANCELLED', message: 'Cette session a été annulée.' };
  if (s.statut === 'fermee') return { code: 'CLOSED', message: 'La session est terminée.' };
  if (!s.signeAt) return { code: 'NOT_SIGNED', message: "Le professeur n'a pas encore signé : patientez quelques instants." };
  if (!s.scanJusqua || nowMs > s.scanJusqua.getTime()) return { code: 'SCAN_CLOSED', message: 'Le délai de pointage est dépassé.' };
  return null;
}


const PRESENCE_FLAGS = ['statut', 'minutesRetard', 'scannedAt', 'methode', [literal('(`Presence`.`signature` IS NOT NULL)'), 'aSigne']];

// Séances ouvertes aujourd'hui qui concernent l'étudiant
async function activeSeances(user) {
  return Seance.findAll({
    where: { dateSeance: dateKey(new Date()), statut: 'ouverte' },
    attributes: SEANCE_ATTRS,
    include: [{ model: Enseignement, as: 'enseignement', required: true, where: await ens.whereForStudent(user), include: ens.INCLUDES }],
    order: [['heureDebut', 'ASC']],
  });
}

// Récapitulatif affiché à l'étudiant après pointage
function summary(s, user, presence, dejaPointe) {
  const d = serializeSeance(s);
  const e = d.enseignement;
  return {
    dejaPointe,
    prenom: user.prenom,
    statut: presence.statut,
    minutesRetard: presence.minutesRetard,
    methode: presence.methode,
    pointeAt: presence.scannedAt,
    module: e.module.nom,
    moduleCode: e.module.code,
    professeur: `${e.professeur.prenom} ${e.professeur.nom}`,
    salle: d.salle,
    heureDebut: d.heureDebut,
    heureFin: d.heureFin,
  };
}

// Le pointage n'existe que pendant un cours de l'étudiant
async function pointageCourant(user) {
  const [s] = await activeSeances(user);
  if (!s) return { seance: null };
  const row = await Presence.findOne({ where: { seanceId: s.id, etudiantId: user.id }, attributes: PRESENCE_FLAGS });
  const block = scanBlock(s, Date.now());
  const dejaPointe = Boolean(row?.scannedAt);
  return {
    seance: serializeSeance(s),
    signatureFaite: Boolean(row && Number(row.get('aSigne'))),
    dejaPointe,
    resume: dejaPointe ? summary(s, user, row, true) : null,
    peutPointer: !block && !dejaPointe,
    raison: block ? block.message : null,
  };
}

async function pointageInfo(user, token, key) {
  const s = await Seance.findOne({ where: { qrToken: String(token) }, attributes: SEANCE_ATTRS, include: seanceIncludes() });
  if (!s) throw new ApiError(404, 'QR code invalide.');
  await assertStudentIn(s.enseignement, user);

  const row = await Presence.findOne({ where: { seanceId: s.id, etudiantId: user.id }, attributes: PRESENCE_FLAGS });
  if (row?.scannedAt) {
    return { seance: serializeSeance(s), dejaPointe: true, resume: summary(s, user, row, true), peutPointer: false, raison: null, signatureFaite: true, proof: null };
  }

  const block = scanBlock(s, Date.now());
  if (!block && !qr.verifyKey(token, key)) {
    throw new ApiError(410, 'QR code expiré : scannez à nouveau le QR affiché par le professeur.', { code: 'QR_EXPIRED' });
  }
  return {
    seance: serializeSeance(s),
    dejaPointe: false,
    resume: null,
    peutPointer: !block,
    raison: block ? block.message : null,
    signatureFaite: Boolean(row && Number(row.get('aSigne'))),
    proof: block ? null : qr.issueProof(s.id, user.id),
  };
}

// Étape 1 : l'étudiant signe (reste absent tant qu'il n'a pas validé)
async function saveSignature(user, { seanceId, signature }, meta = {}) {
  const s = await Seance.findByPk(seanceId, { attributes: SEANCE_ATTRS, include: seanceIncludes() });
  if (!s) throw new ApiError(404, 'Séance introuvable.');
  await assertStudentIn(s.enseignement, user);
  const block = scanBlock(s, Date.now());
  if (block) throw new ApiError(409, block.message, { code: block.code });

  const existing = await Presence.findOne({ where: { seanceId: s.id, etudiantId: user.id } });
  if (existing?.scannedAt) throw new ApiError(409, 'Vous avez déjà pointé pour ce cours.', { code: 'ALREADY' });
  if (existing) await existing.update({ signature });
  else await Presence.create({ seanceId: s.id, etudiantId: user.id, statut: 'absent', minutesRetard: 0, methode: 'auto', signature });

  logger.info('POINTAGE', `Signature reçue : ${user.prenom} ${user.nom} (${user.matricule}) | séance #${s.id} | IP ${meta.ip || '—'} | ${meta.appareil || '—'}`);
  return { signatureFaite: true };
}

// Étape 2 : validation par scan du QR ou saisie du code
async function checkIn(user, { token, k, proof, code, signature }, meta = {}) {
  if (!token && !code) throw new ApiError(400, 'QR code ou code de présence requis.');
  const where = token
    ? { qrToken: String(token) }
    : { codeAcces: String(code).trim().toUpperCase(), statut: 'ouverte' };
  const s = await Seance.findOne({ where, attributes: SEANCE_ATTRS, include: seanceIncludes() });
  if (!s) throw new ApiError(404, token ? 'QR code invalide.' : 'Code invalide ou session non ouverte.', { code: 'INVALID' });

  await assertStudentIn(s.enseignement, user);

  const now = new Date();
  const existing = await Presence.findOne({ where: { seanceId: s.id, etudiantId: user.id } });
  if (existing?.scannedAt) return summary(s, user, existing, true);

  const block = scanBlock(s, now.getTime());
  if (block) throw new ApiError(409, block.message, { code: block.code });

  if (token && !qr.verifyProof(s.id, user.id, proof) && !qr.verifyKey(token, k)) {
    throw new ApiError(410, 'QR code expiré : scannez à nouveau le QR affiché par le professeur.', { code: 'QR_EXPIRED' });
  }

  const sig = signature || existing?.signature;
  if (!sig) throw new ApiError(400, 'Votre signature est requise avant de valider.', { code: 'SIGNATURE_REQUIRED' });

  const { start } = bounds(s);
  const elapsed = Math.floor((now.getTime() - start.getTime()) / MIN);
  const computed = elapsed > S.lateGraceMin ? elapsed : 0;
  const minutes = Math.max(computed, existing ? existing.minutesRetard : 0);
  const data = {
    statut: minutes > 0 ? 'retard' : 'present',
    minutesRetard: minutes,
    methode: token ? 'qr' : 'code',
    signature: sig,
    scannedAt: now,
  };

  try {
    if (existing) await existing.update(data);
    else await Presence.create({ seanceId: s.id, etudiantId: user.id, ...data });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ApiError(409, 'Pointage déjà enregistré.');
    throw err;
  }

  logger.success(
    'POINTAGE',
    `${user.prenom} ${user.nom} (${user.matricule}) | ${s.enseignement.module.code} | séance #${s.id} | ${data.methode} | ${data.statut}${minutes ? ` ${minutes} min` : ''} | IP ${meta.ip || '—'} | ${meta.appareil || '—'}`
  );
  return summary(s, user, data, false);
}

// Le professeur (ou l'admin) pointe à la place d'un étudiant
async function pointerPour(s, etudiantId, signature, actor) {
  if (s.statut !== 'ouverte') throw new ApiError(409, "La session n'est pas ouverte.");
  if (!s.signeAt) throw new ApiError(409, "Signez d'abord la session.");
  const u = await loadStudent(etudiantId);
  await assertStudentIn(s.enseignement, u);

  const existing = await Presence.findOne({ where: { seanceId: s.id, etudiantId: u.id } });
  if (existing?.scannedAt) throw new ApiError(409, 'Cet étudiant a déjà pointé.');

  let sig = signature;
  if (!sig) {
    const row = await Seance.findByPk(s.id, { attributes: ['id', 'signatureProf'] });
    sig = row?.signatureProf;
  }
  if (!sig) throw new ApiError(400, 'Signature requise.');

  const now = new Date();
  const { start } = bounds(s);
  const elapsed = Math.floor((now.getTime() - start.getTime()) / MIN);
  const computed = elapsed > S.lateGraceMin ? elapsed : 0;
  const minutes = Math.max(computed, existing ? existing.minutesRetard : 0);
  const methode = actor.role === 'admin' ? 'admin' : 'prof';
  const data = {
    statut: minutes > 0 ? 'retard' : 'present',
    minutesRetard: minutes,
    methode,
    signature: sig,
    scannedAt: now,
    saisiPar: actor.id,
  };
  if (existing) await existing.update(data);
  else await Presence.create({ seanceId: s.id, etudiantId: u.id, ...data });

  logger.success('POINTAGE', `${u.prenom} ${u.nom} (${u.matricule}) pointé par ${actor.email} (${methode}) | séance #${s.id} | ${data.statut}${minutes ? ` ${minutes} min` : ''}`);
}

// QR courant (clé tournante) pour l'affichage du professeur
function qrFor(s) {
  if (s.statut !== 'ouverte' || !s.signeAt) throw new ApiError(409, "Le QR code n'est disponible qu'après la signature, session ouverte.");
  const { key, refreshMs } = qr.currentKey(s.qrToken);
  return { url: `${S.publicUrl}/etudiant/pointage/${s.qrToken}?k=${key}`, refreshMs };
}

// ---------- Planificateur ----------
async function generateForToday(now) {
  const today = dateKey(now);
  const jour = ((now.getDay() + 6) % 7) + 1;
  const slots = await EmploiDuTemps.findAll({
    where: {
      jour,
      [Op.and]: [
        { [Op.or]: [{ dateDebut: null }, { dateDebut: { [Op.lte]: today } }] },
        { [Op.or]: [{ dateFin: null }, { dateFin: { [Op.gte]: today } }] },
      ],
    },
  });

  for (const slot of slots) {
    if (now.getTime() >= atMinutes(today, time.parse(slot.heureFin)).getTime()) continue;
    if (await Seance.count({ where: { creneauId: slot.id, dateSeance: today } })) continue;
    try {
      await newSeance({
        enseignementId: slot.enseignementId, creneauId: slot.id, dateSeance: today,
        heureDebut: slot.heureDebut, heureFin: slot.heureFin, salle: slot.salle,
      });
      logger.info('SESSION', `Séance planifiée : créneau #${slot.id} le ${today}`);
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') throw err;
    }
  }
}

// Répercute les changements du créneau sur les séances encore planifiées
async function syncPlanned() {
  const rows = await Seance.findAll({
    where: { statut: 'planifiee', modifiee: false, creneauId: { [Op.ne]: null } },
    attributes: SEANCE_ATTRS,
    include: [{ model: EmploiDuTemps, as: 'creneau' }],
  });
  for (const r of rows) {
    const c = r.creneau;
    if (c && (r.heureDebut !== c.heureDebut || r.heureFin !== c.heureFin || (r.salle || null) !== (c.salle || null))) {
      await r.update({ heureDebut: c.heureDebut, heureFin: c.heureFin, salle: c.salle });
    }
  }
}

async function mailUnscanned(s, kind) {
  const info = await buildInfo(s);
  const students = await studentsOf(s.enseignement);
  const rows = await Presence.findAll({ where: { seanceId: s.id }, attributes: ['etudiantId', 'statut'] });
  const done = new Set(rows.filter((r) => r.statut !== 'absent').map((r) => r.etudiantId));
  let sent = 0;
  for (const u of students) {
    if (done.has(u.id) || u.estBloque || !u.email) continue;
    const ok = kind === 'retard' ? await mailService.sendStudentLateNotice(u, info) : await mailService.sendStudentAbsenceCheck(u, info);
    if (ok) sent += 1;
  }
  logger.info('SESSION', `Mails « ${kind} » : ${sent} envoyé(s) (séance #${s.id})`);
}

async function processSeance(s, now) {
  const { start, end } = bounds(s);
  const t = now.getTime();

  // 30 min avant : rappel au professeur
  if (!s.mailProfAt && t >= start.getTime() - S.profMailBeforeMin * MIN) {
    if (t < start.getTime()) await mailService.sendProfessorReminder(await buildInfo(s));
    await s.update({ mailProfAt: now });
  }

  // 5 min avant : ouverture automatique ; cours terminé sans ouverture : annulée
  if (s.statut === 'planifiee') {
    if (t >= end.getTime()) { await cancelSeance(s, 'Session non ouverte.'); return; }
    if (t >= start.getTime() - S.openBeforeMin * MIN) await openSeance(s);
  }

  if (s.statut === 'ouverte' && s.signeAt) {
    if (!s.mailRetardAt && t >= start.getTime() + S.lateMailAfterStartMin * MIN && t < end.getTime()) {
      await mailUnscanned(s, 'retard');
      await s.update({ mailRetardAt: now });
    }
    if (!s.mailAbsenceAt && t >= end.getTime() - S.absenceMailBeforeEndMin * MIN && t < end.getTime()) {
      await mailUnscanned(s, 'absence');
      await s.update({ mailAbsenceAt: now });
    }
  }

  // Fermeture automatique (fin du pointage + délai de grâce)
  if (s.statut === 'ouverte' && s.autoFermeAt && t >= s.autoFermeAt.getTime()) await closeSeance(s, { auto: true });
}

async function tick() {
  const now = new Date();
  await generateForToday(now);
  await syncPlanned();
  const active = await Seance.findAll({
    where: { statut: { [Op.in]: ['planifiee', 'ouverte'] } },
    attributes: SEANCE_ATTRS,
    include: seanceIncludes(),
  });
  for (const s of active) {
    try {
      await processSeance(s, now);
    } catch (err) {
      logger.error('SESSION', `Séance #${s.id} : ${err.message}`);
    }
  }
}

module.exports = {
  SEANCE_ATTRS, findSeance, newSeance, serializeSeance, countsFor, getDetail,
  openSeance, closeSeance, cancelSeance, signSeance, setRetard, adminSetPresence,
  pointageInfo, pointageCourant, saveSignature, checkIn, pointerPour, qrFor, tick,
};