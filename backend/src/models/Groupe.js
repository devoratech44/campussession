// backend/src/models/Groupe.js
module.exports = (sequelize, DataTypes) => {
  const Groupe = sequelize.define(
    'Groupe',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      classeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      filiereId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'groupes' }
  );

  Groupe.associate = (models) => {
    Groupe.belongsTo(models.Classe, { foreignKey: 'classeId', as: 'classe' });
    Groupe.belongsTo(models.Filiere, { foreignKey: 'filiereId', as: 'filiere' });
    Groupe.belongsToMany(models.User, {
      through: models.GroupeEtudiant,
      foreignKey: 'groupeId',
      otherKey: 'etudiantId',
      as: 'membres',
    });
  };

  return Groupe;
};