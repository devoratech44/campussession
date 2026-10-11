// backend/src/models/Filiere.js
module.exports = (sequelize, DataTypes) => {
  const Filiere = sequelize.define(
    'Filiere',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      niveau: { type: DataTypes.STRING(50), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'filieres' }
  );

  Filiere.associate = (models) => {
    Filiere.belongsToMany(models.Classe, {
      through: models.ClasseFiliere,
      foreignKey: 'filiereId',
      otherKey: 'classeId',
      as: 'classes',
    });
    Filiere.hasMany(models.User, { foreignKey: 'filiereId', as: 'etudiants' });
  };

  return Filiere;
};