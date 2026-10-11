// backend/src/models/Module.js
module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define(
    'Module',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      nom: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      coefficient: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1,
        get() {
          const value = this.getDataValue('coefficient');
          return value === null ? null : Number(value);
        },
      },
      volumeHoraire: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'modules' }
  );

  Module.associate = (models) => {
    Module.hasMany(models.Enseignement, { foreignKey: 'moduleId', as: 'enseignements' });
  };

  return Module;
};