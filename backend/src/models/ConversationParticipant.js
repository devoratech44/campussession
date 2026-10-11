// backend/src/models/ConversationParticipant.js
module.exports = (sequelize, DataTypes) => {
  const ConversationParticipant = sequelize.define('ConversationParticipant', {
    conversationId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    lastReadAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'conversation_participants' });
  return ConversationParticipant;
};