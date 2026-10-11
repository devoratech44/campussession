// backend/src/models/Note.js
module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    travailId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    etudiantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    valeur: { type: DataTypes.DECIMAL(4, 2), allowNull: false },
    commentaire: { type: DataTypes.TEXT, allowNull: true },
    saisiPar: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { tableName: 'notes' });
  return Note;
};