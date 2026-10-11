// backend/src/models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    titre: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.ENUM('information', 'devoir', 'examen', 'notes', 'presences', 'emploi_du_temps', 'systeme'), allowNull: false, defaultValue: 'information' },
    cibleType: { type: DataTypes.ENUM('tous', 'classe', 'filiere', 'groupe', 'utilisateur'), allowNull: false, defaultValue: 'tous' },
    cibleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { tableName: 'notifications' });
  return Notification;
};