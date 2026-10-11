// backend/src/models/Enseignement.js
const cfg = require('../config/appConfig');

// Enseignement = module + professeur + public (classe | filière | groupe | étudiant) + année
module.exports = (sequelize, DataTypes) => {
  const Enseignement = sequelize.define(
    'Enseignement',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      moduleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      professeurId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      publicType: { type: DataTypes.ENUM(...cfg.publicTypes), allowNull: false },
      classeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      filiereId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      groupeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      etudiantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      anneeAcademique: { type: DataTypes.STRING(20), allowNull: false, defaultValue: cfg.academicYear },
    },
    { tableName: 'enseignements' }
  );

  Enseignement.associate = (models) => {
    Enseignement.belongsTo(models.Module, { foreignKey: 'moduleId', as: 'module' });
    Enseignement.belongsTo(models.User, { foreignKey: 'professeurId', as: 'professeur' });
    Enseignement.belongsTo(models.Classe, { foreignKey: 'classeId', as: 'classe' });
    Enseignement.belongsTo(models.Filiere, { foreignKey: 'filiereId', as: 'filiere' });
    Enseignement.belongsTo(models.Groupe, { foreignKey: 'groupeId', as: 'groupe' });
    Enseignement.belongsTo(models.User, { foreignKey: 'etudiantId', as: 'etudiant' });
    Enseignement.hasMany(models.EmploiDuTemps, { foreignKey: 'enseignementId', as: 'creneaux' });
  };

  return Enseignement;
};