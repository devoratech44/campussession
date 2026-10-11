// backend/src/models/EmploiDuTemps.js
// jour : 1 = lundi ... 7 = dimanche ; un créneau finissant à minuit est stocké avec heure_fin = '24:00:00'
module.exports = (sequelize, DataTypes) => {
  const EmploiDuTemps = sequelize.define(
    'EmploiDuTemps',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      enseignementId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      jour: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      heureDebut: { type: DataTypes.TIME, allowNull: false },
      heureFin: { type: DataTypes.TIME, allowNull: false },
      salle: { type: DataTypes.STRING(100), allowNull: true },
      dateDebut: { type: DataTypes.DATEONLY, allowNull: true },
      dateFin: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'emplois_du_temps' }
  );

  EmploiDuTemps.associate = (models) => {
    EmploiDuTemps.belongsTo(models.Enseignement, { foreignKey: 'enseignementId', as: 'enseignement' });
  };

  return EmploiDuTemps;
};