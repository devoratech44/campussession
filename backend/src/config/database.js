// backend/src/config/database.js
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.pass, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.db.logSql ? (sql) => logger.sql('SQL', sql) : false,
  timezone: '+00:00',
  define: {
    underscored: true,
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
});

// Crée la base automatiquement si les droits le permettent
async function ensureDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.pass,
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();
    logger.success('DB', `Base "${env.db.name}" prête`);
  } catch (err) {
    logger.warn('DB', `Création automatique impossible (${err.message}). La base doit exister.`);
  }
}

module.exports = { sequelize, ensureDatabase };