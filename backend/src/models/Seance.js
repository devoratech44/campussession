// backend/src/models/Seance.js
const cfg = require('../config/appConfig');

module.exports = (sequelize, DataTypes) => {
  const Seance = sequelize.define(
    'Seance',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      enseignementId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      creneauId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      dateSeance: { type: DataTypes.DATEONLY, allowNull: false },
      heureDebut: { type: DataTypes.TIME, allowNull: true },
      heureFin: { type: DataTypes.TIME, allowNull: true },
      salle: { type: DataTypes.STRING(100), allowNull: true },
      statut: { type: DataTypes.ENUM(...cfg.seanceStatuts), allowNull: false, defaultValue: 'planifiee' },
      motifAnnulation: { type: DataTypes.STRING(255), allowNull: true },
      pointsAbordes: { type: DataTypes.TEXT, allowNull: true },
      qrToken: { type: DataTypes.STRING(64), allowNull: true },
      codeAcces: { type: DataTypes.STRING(12), allowNull: true },
      signatureProf: { type: DataTypes.TEXT('medium'), allowNull: true },
      signeAt: { type: DataTypes.DATE, allowNull: true },
      signePar: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      ouverteAt: { type: DataTypes.DATE, allowNull: true },
      scanJusqua: { type: DataTypes.DATE, allowNull: true },
      autoFermeAt: { type: DataTypes.DATE, allowNull: true },
      fermeeAt: { type: DataTypes.DATE, allowNull: true },
      modifiee: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      mailProfAt: { type: DataTypes.DATE, allowNull: true },
      mailRetardAt: { type: DataTypes.DATE, allowNull: true },
      mailAbsenceAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'seances' }
  );

  Seance.associate = (models) => {
    Seance.belongsTo(models.Enseignement, { foreignKey: 'enseignementId', as: 'enseignement' });
    Seance.belongsTo(models.EmploiDuTemps, { foreignKey: 'creneauId', as: 'creneau' });
    Seance.hasMany(models.Presence, { foreignKey: 'seanceId', as: 'presences' });
  };

  return Seance;
};