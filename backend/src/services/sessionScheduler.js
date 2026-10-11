// backend/src/services/sessionScheduler.js
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');

let timer = null;
let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    await sessionService.tick();
  } catch (err) {
    logger.error('SESSION', `Planificateur en échec : ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  logger.info('SESSION', `Planificateur actif (toutes les ${cfg.sessions.tickSeconds} s)`);
  run();
  timer = setInterval(run, cfg.sessions.tickSeconds * 1000);
}

module.exports = { start };