// backend/server.js
require('dotenv').config({ quiet: true });
process.env.TZ = process.env.APP_TIMEZONE || 'UTC';

const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { ensureDatabase } = require('./src/config/database');

async function start() {
  logger.info('BOOT', `Démarrage de Campus Session (${env.nodeEnv})`);

  await ensureDatabase();

  const db = require('./src/models');
  await db.sequelize.authenticate();
  logger.success('DB', `Connecté à MySQL (${env.db.host}:${env.db.port}/${env.db.name})`);

  if (env.db.sync) {
    await db.sequelize.sync({ alter: env.db.syncAlter });
    logger.success('DB', 'Tables synchronisées');
  } else {
    logger.info('DB', 'Synchronisation Sequelize désactivée (schéma géré par le script SQL)');
  }

  await require('./src/services/seedService').seedAdmin();

  const app = require('./src/app');
  app.listen(env.port, () => {
    logger.success('SERVER', `API prête sur http://localhost:${env.port}/api`);
    require('./src/services/sessionScheduler').start();
  });
}

start().catch((err) => {
  logger.error('BOOT', `Échec du démarrage : ${err.message}`);
  process.exit(1);
});