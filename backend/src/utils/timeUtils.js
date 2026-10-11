// backend/src/utils/timeUtils.js
const PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const pad = (n) => String(n).padStart(2, '0');

// "HH:MM" ou "HH:MM:SS" -> minutes depuis minuit (24:00 = 1440) ; null si invalide
const parse = (value) => {
  const m = PATTERN.exec(String(value ?? '').trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
};

const label = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toSql = (minutes) => `${label(minutes)}:00`;
const fromSql = (value) => (value ? String(value).slice(0, 5) : value);

module.exports = { parse, label, toSql, fromSql };