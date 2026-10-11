// backend/src/models/index.js
const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const db = {};

fs.readdirSync(__dirname)
  .filter((f) => f !== 'index.js' && f.endsWith('.js'))
  .forEach((file) => {
    const factory = require(path.join(__dirname, file));
    if (typeof factory !== 'function') return; // fichier encore vide
    const model = factory(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(db);
});

db.sequelize = sequelize;
module.exports = db;