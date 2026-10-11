// backend/src/models/GroupeEtudiant.js
module.exports = (sequelize, DataTypes) => {
  const GroupeEtudiant = sequelize.define(
    'GroupeEtudiant',
    {
      groupeId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
      etudiantId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
    },
    { tableName: 'groupe_etudiants' }
  );

  return GroupeEtudiant;
};