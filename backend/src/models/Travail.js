// backend/src/models/Travail.js
module.exports = (sequelize, DataTypes) => {
  const Travail = sequelize.define('Travail', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    enseignementId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('devoir', 'examen', 'tp'), allowNull: false },
    numeroTp: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    titre: { type: DataTypes.STRING(200), allowNull: false },
    consignes: { type: DataTypes.TEXT, allowNull: true },
    fichier: { type: DataTypes.STRING(255), allowNull: true },
    nomOriginal: { type: DataTypes.STRING(255), allowNull: true },
    dateTravail: { type: DataTypes.DATEONLY, allowNull: true },
    dateLimite: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { tableName: 'travaux' });
  return Travail;
};