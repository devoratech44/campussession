// backend/src/models/Presence.js
const cfg = require('../config/appConfig');

module.exports = (sequelize, DataTypes) => {
  const Presence = sequelize.define(
    'Presence',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      seanceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      etudiantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      statut: { type: DataTypes.ENUM(...cfg.presenceStatuts), allowNull: false, defaultValue: 'absent' },
      minutesRetard: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      methode: { type: DataTypes.ENUM(...cfg.presenceMethodes), allowNull: false, defaultValue: 'auto' },
      signature: { type: DataTypes.TEXT('medium'), allowNull: true },
      scannedAt: { type: DataTypes.DATE, allowNull: true },
      justifie: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      motifJustification: { type: DataTypes.STRING(255), allowNull: true },
      remarque: { type: DataTypes.STRING(255), allowNull: true },
      saisiPar: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'presences' }
  );

  Presence.associate = (models) => {
    Presence.belongsTo(models.Seance, { foreignKey: 'seanceId', as: 'seance' });
    Presence.belongsTo(models.User, { foreignKey: 'etudiantId', as: 'etudiant' });
  };

  return Presence;
};