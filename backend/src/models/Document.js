// backend/src/models/Document.js
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    titre: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    type: { type: DataTypes.ENUM('cours', 'ressource', 'video', 'autre'), allowNull: false, defaultValue: 'cours' },
    fichier: { type: DataTypes.STRING(255), allowNull: true },
    nomOriginal: { type: DataTypes.STRING(255), allowNull: true },
    taille: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    lien: { type: DataTypes.STRING(500), allowNull: true },
    moduleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    classeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    uploaderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    estArchive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { tableName: 'documents' });
  return Document;
};