// backend/src/models/User.js
const cfg = require('../config/appConfig');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      role: { type: DataTypes.ENUM(...cfg.roles), allowNull: false },
      matricule: { type: DataTypes.STRING(50), unique: true, allowNull: true },
      prenom: { type: DataTypes.STRING(100), allowNull: false },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(150), unique: true, allowNull: false, validate: { isEmail: true } },
      telephone: { type: DataTypes.STRING(30), allowNull: true },
      motDePasse: { type: DataTypes.STRING(100), allowNull: false },
      photo: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'default.png' },
      dateNaissance: { type: DataTypes.DATEONLY, allowNull: true },
      lieuNaissance: { type: DataTypes.STRING(150), allowNull: true },
      adresse: { type: DataTypes.STRING(255), allowNull: true },
      genre: { type: DataTypes.ENUM(...cfg.genres), allowNull: true },

      // Étudiant
      niveau: { type: DataTypes.STRING(50), allowNull: true },
      filiereId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      classeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      etatAcademique: { type: DataTypes.ENUM(...cfg.etatsAcademiques), allowNull: true },

      // Professeur
      specialite: { type: DataTypes.STRING(150), allowNull: true },
      statut: { type: DataTypes.ENUM(...cfg.statutsProfesseur), allowNull: true },

      // Vérification par code à 6 chiffres
      estVerifie: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      codeHash: { type: DataTypes.STRING(100), allowNull: true },
      codeExpiresAt: { type: DataTypes.DATE, allowNull: true },
      codeAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      codeSentAt: { type: DataTypes.DATE, allowNull: true },

      // Blocage
      estBloque: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      motifBlocage: { type: DataTypes.STRING(255), allowNull: true },
      blocageAuto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      // Présence en ligne
      lastSeenAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'users',
      defaultScope: { attributes: { exclude: ['motDePasse', 'codeHash'] } },
      scopes: { withSecrets: { attributes: { include: ['motDePasse', 'codeHash'] } } },
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Classe, { foreignKey: 'classeId', as: 'classe' });
    User.belongsTo(models.Filiere, { foreignKey: 'filiereId', as: 'filiere' });
  };

  return User;
};