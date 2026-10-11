// backend/src/models/NotificationUser.js
module.exports = (sequelize, DataTypes) => {
  const NotificationUser = sequelize.define('NotificationUser', {
    notificationId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    estLue: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lueAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'notification_user' });
  return NotificationUser;
};