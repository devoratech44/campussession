// backend/src/models/Conversation.js
module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.ENUM('prive', 'groupe'), allowNull: false, defaultValue: 'prive' },
    titre: { type: DataTypes.STRING(150), allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { tableName: 'conversations' });
  return Conversation;
};