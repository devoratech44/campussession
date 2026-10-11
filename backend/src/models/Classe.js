// backend/src/models/Classe.js
const cfg = require('../config/appConfig');

module.exports = (sequelize, DataTypes) => {
  const Classe = sequelize.define(
    'Classe',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      salle: { type: DataTypes.STRING(100), allowNull: true },
      anneeAcademique: { type: DataTypes.STRING(20), allowNull: false, defaultValue: cfg.academicYear },
    },
    { tableName: 'classes' }
  );

  Classe.associate = (models) => {
    Classe.belongsToMany(models.Filiere, {
      through: models.ClasseFiliere,
      foreignKey: 'classeId',
      otherKey: 'filiereId',
      as: 'filieres',
    });
    Classe.hasMany(models.User, { foreignKey: 'classeId', as: 'etudiants' });
  };

  return Classe;
};