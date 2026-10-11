// backend/src/services/userService.js
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const ApiError = require('../utils/ApiError');
const { User, Classe, Filiere } = require('../models');

const INCLUDES = [
  { model: Classe, as: 'classe', attributes: ['id', 'nom'] },
  { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
];
const HIDDEN = ['codeExpiresAt', 'codeAttempts', 'codeSentAt'];

// Ne garde que les champs autorisés ; les chaînes vides deviennent NULL
function pickFields(body, allowed) {
  const data = {};
  allowed.forEach((key) => {
    if (body[key] === undefined) return;
    const value = typeof body[key] === 'string' ? body[key].trim() : body[key];
    data[key] = value === '' ? null : value;
  });
  return data;
}

function removePhotoFile(name) {
  if (!name || name === env.uploads.defaultPhoto) return;
  fs.unlink(path.join(cfg.paths.photos, path.basename(name)), () => {});
}

// Retards et absences non justifiés de plusieurs étudiants
async function getCountersMap(ids) {
  if (!ids.length) return {};
  const rows = await sequelize.query(
    `SELECT p.etudiant_id AS id, p.statut AS statut, COUNT(*) AS total FROM presences p JOIN seances s ON s.id = p.seance_id
     WHERE p.justifie = 0 AND p.statut IN ('retard','absent') AND p.etudiant_id IN (:ids) AND s.statut = 'fermee'
     GROUP BY p.etudiant_id, p.statut`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
  const map = {};
  rows.forEach((r) => {
    map[r.id] = map[r.id] || { retards: 0, absences: 0 };
    if (r.statut === 'retard') map[r.id].retards = Number(r.total);
    else map[r.id].absences = Number(r.total);
  });
  return map;
}

const isOnline = (u) =>
  Boolean(u.lastSeenAt) && new Date(u.lastSeenAt).getTime() >= Date.now() - cfg.onlineThresholdSeconds * 1000;

async function serializeMany(users) {
  const counters = await getCountersMap(users.filter((u) => u.role === 'etudiant').map((u) => u.id));
  return users.map((u) => {
    const data = u.toJSON();
    HIDDEN.forEach((k) => delete data[k]);
    const c = counters[u.id] || { retards: 0, absences: 0 };
    return { ...data, enLigne: isOnline(u), retardsNonJustifies: c.retards, absencesNonJustifies: c.absences };
  });
}

async function findOne(id) {
  const user = await User.findByPk(id, { include: INCLUDES });
  return user ? (await serializeMany([user]))[0] : null;
}

// Niveau, filière et classe doivent être cohérents (§ 4.1)
async function assertStructure({ niveau, filiereId, classeId }) {
  const filiere = await Filiere.findByPk(filiereId);
  if (!filiere) throw new ApiError(400, 'Filière introuvable.');
  if (filiere.niveau !== niveau) throw new ApiError(400, `La filière ${filiere.nom} n'appartient pas au ${niveau}.`);

  const classe = await Classe.findByPk(classeId, { include: [{ model: Filiere, as: 'filieres', attributes: ['id'] }] });
  if (!classe) throw new ApiError(400, 'Classe introuvable.');
  if (!classe.filieres.some((f) => f.id === filiere.id)) {
    throw new ApiError(400, `La classe ${classe.nom} ne regroupe pas la filière ${filiere.nom}.`);
  }
}

// Un étudiant qui change de classe est retiré de ses anciens groupes (§ 5.2)
async function detachFromOtherGroups(etudiantId, classeId) {
  if (classeId) {
    await sequelize.query(
      `DELETE ge FROM groupe_etudiants ge JOIN groupes g ON g.id = ge.groupe_id
       WHERE ge.etudiant_id = :etudiantId AND g.classe_id <> :classeId`,
      { replacements: { etudiantId, classeId } }
    );
  } else {
    await sequelize.query('DELETE FROM groupe_etudiants WHERE etudiant_id = :etudiantId', { replacements: { etudiantId } });
  }
}

module.exports = {
  INCLUDES, pickFields, removePhotoFile, serializeMany, findOne, assertStructure, detachFromOtherGroups, isOnline,
};