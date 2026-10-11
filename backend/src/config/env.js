// backend/src/config/env.js
require('dotenv').config();

const required = ['DB_NAME', 'DB_USER', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = required.filter((k) => !process.env[k] || process.env[k].startsWith('CHANGE_ME'));
if (missing.length) {
  console.error(`[ENV] Variables manquantes ou non modifiées dans backend/.env : ${missing.join(', ')}`);
  process.exit(1);
}

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const bool = (v, d = false) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL,

  db: {
    host: process.env.DB_HOST,
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER,
    pass: process.env.DB_PASS || '',
    name: process.env.DB_NAME,
    logSql: bool(process.env.DB_LOG_SQL, true),
sync: bool(process.env.DB_SYNC, false),
syncAlter: bool(process.env.DB_SYNC_ALTER, false),
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    tempExpiresIn: process.env.JWT_TEMP_EXPIRES_IN || '15m',
  },
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),
  rateLimit: {
    max: num(process.env.AUTH_RATE_MAX, 30),
    windowMin: num(process.env.AUTH_RATE_WINDOW_MIN, 15),
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: num(process.env.MAIL_PORT, 587),
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM,
  },

  admin: {
    prenom: process.env.ADMIN_PRENOM,
    nom: process.env.ADMIN_NOM,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  uploads: {
    maxPhotoMb: num(process.env.UPLOAD_MAX_PHOTO_MB, 2),
    maxDocMb: num(process.env.UPLOAD_MAX_DOC_MB, 50),
    defaultPhoto: process.env.DEFAULT_PHOTO || 'default.png',
  },

  academicYear: process.env.ACADEMIC_YEAR || '2026-2027',
};