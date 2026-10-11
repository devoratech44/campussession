// backend/src/models/Message.js
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    contenu: { type: DataTypes.STRING(2000), allowNull: false },
  }, { tableName: 'messages' });
  return Message;
};