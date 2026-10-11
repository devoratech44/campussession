// backend/src/models/ClasseFiliere.js
module.exports = (sequelize, DataTypes) => {
  const ClasseFiliere = sequelize.define(
    'ClasseFiliere',
    {
      classeId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
      filiereId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
    },
    { tableName: 'classe_filiere' }
  );

  return ClasseFiliere;
};