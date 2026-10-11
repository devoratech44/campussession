// backend/src/services/enseignementService.js
const { Op, QueryTypes, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { Module, User, Classe, Filiere, Groupe } = require('../models');

const INCLUDES = [
  { model: Module, as: 'module', attributes: ['id', 'code', 'nom', 'coefficient', 'volumeHoraire'] },
  { model: User, as: 'professeur', attributes: ['id', 'prenom', 'nom', 'statut', 'specialite', 'photo'] },
  { model: Classe, as: 'classe', attributes: ['id', 'nom', 'salle'] },
  { model: Filiere, as: 'filiere', attributes: ['id', 'nom'] },
  { model: Groupe, as: 'groupe', attributes: ['id', 'nom'] },
  { model: User, as: 'etudiant', attributes: ['id', 'prenom', 'nom', 'matricule'] },
];

const TARGET_FIELD = { classe: 'classeId', filiere: 'filiereId', groupe: 'groupeId', etudiant: 'etudiantId' };

// Nombre d'étudiants concernés (à utiliser dans une requête dont le modèle racine est Enseignement)
const NB_ETUDIANTS = literal(
  "(CASE `Enseignement`.`public_type` " +
  "WHEN 'classe' THEN (SELECT COUNT(*) FROM users u WHERE u.role = 'etudiant' AND u.classe_id = `Enseignement`.`classe_id`) " +
  "WHEN 'filiere' THEN (SELECT COUNT(*) FROM users u WHERE u.role = 'etudiant' AND u.filiere_id = `Enseignement`.`filiere_id`) " +
  "WHEN 'groupe' THEN (SELECT COUNT(*) FROM groupe_etudiants ge WHERE ge.groupe_id = `Enseignement`.`groupe_id`) " +
  'ELSE 1 END)'
);

function describePublic(d) {
  switch (d.publicType) {
    case 'classe': return { id: d.classeId, label: d.classe?.nom || '—' };
    case 'filiere': return { id: d.filiereId, label: d.filiere?.nom || '—' };
    case 'groupe': return { id: d.groupeId, label: d.groupe?.nom || '—' };
    default: return { id: d.etudiantId, label: d.etudiant ? `${d.etudiant.prenom} ${d.etudiant.nom}` : '—' };
  }
}

function serialize(e) {
  const d = typeof e.toJSON === 'function' ? e.toJSON() : e;
  const pub = describePublic(d);
  return {
    id: d.id,
    module: d.module,
    professeur: d.professeur,
    publicType: d.publicType,
    publicId: pub.id,
    publicLabel: pub.label,
    collectif: d.publicType !== 'etudiant',
    anneeAcademique: d.anneeAcademique,
    nbEtudiants: d.nbEtudiants !== undefined ? Number(d.nbEtudiants) : undefined,
    salleParDefaut: d.classe?.salle || null,
  };
}

// Enseignements qui concernent une classe (classe, ses filières, ses groupes, ses étudiants en cours individuel)
const whereForClasse = (classeId) => {
  const c = Number(classeId);
  return {
    [Op.or]: [
      { publicType: 'classe', classeId: c },
      { publicType: 'filiere', filiereId: { [Op.in]: literal(`(SELECT filiere_id FROM classe_filiere WHERE classe_id = ${c})`) } },
      { publicType: 'groupe', groupeId: { [Op.in]: literal(`(SELECT id FROM groupes WHERE classe_id = ${c})`) } },
      { publicType: 'etudiant', etudiantId: { [Op.in]: literal(`(SELECT id FROM users WHERE role = 'etudiant' AND classe_id = ${c})`) } },
    ],
  };
};

// Enseignements qui concernent une filière
const whereForFiliere = (filiereId) => {
  const f = Number(filiereId);
  return {
    [Op.or]: [
      { publicType: 'filiere', filiereId: f },
      { publicType: 'classe', classeId: { [Op.in]: literal(`(SELECT classe_id FROM classe_filiere WHERE filiere_id = ${f})`) } },
      { publicType: 'groupe', groupeId: { [Op.in]: literal(`(SELECT id FROM groupes WHERE filiere_id = ${f})`) } },
      { publicType: 'etudiant', etudiantId: { [Op.in]: literal(`(SELECT id FROM users WHERE role = 'etudiant' AND filiere_id = ${f})`) } },
    ],
  };
};

// Enseignements d'un étudiant : sa classe, sa filière, ses groupes et ses cours individuels (§ 6)
async function whereForStudent(student) {
  const rows = await sequelize.query('SELECT groupe_id FROM groupe_etudiants WHERE etudiant_id = :id', {
    replacements: { id: student.id },
    type: QueryTypes.SELECT,
  });
  const groupIds = rows.map((r) => r.groupe_id);
  const or = [{ publicType: 'etudiant', etudiantId: student.id }];
  if (student.classeId) or.push({ publicType: 'classe', classeId: student.classeId });
  if (student.filiereId) or.push({ publicType: 'filiere', filiereId: student.filiereId });
  if (groupIds.length) or.push({ publicType: 'groupe', groupeId: { [Op.in]: groupIds } });
  return { [Op.or]: or };
}

// Identifiants des étudiants d'un enseignement (utilisé par présences, notes et rendus)
async function studentIdsFor(e) {
  let users;
  if (e.publicType === 'classe') users = await User.findAll({ where: { role: 'etudiant', classeId: e.classeId }, attributes: ['id'] });
  else if (e.publicType === 'filiere') users = await User.findAll({ where: { role: 'etudiant', filiereId: e.filiereId }, attributes: ['id'] });
  else if (e.publicType === 'etudiant') return [e.etudiantId];
  else {
    const rows = await sequelize.query('SELECT etudiant_id AS id FROM groupe_etudiants WHERE groupe_id = :id', {
      replacements: { id: e.groupeId },
      type: QueryTypes.SELECT,
    });
    return rows.map((r) => r.id);
  }
  return users.map((u) => u.id);
}

module.exports = {
  INCLUDES, TARGET_FIELD, NB_ETUDIANTS, serialize, whereForClasse, whereForFiliere, whereForStudent, studentIdsFor,
};