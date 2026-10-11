// backend/src/utils/logger.js
const pc = require('picocolors');

const pad = (n) => String(n).padStart(2, '0');
const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const LEVELS = {
  info: { label: 'INFO', color: pc.cyan },
  success: { label: 'OK', color: pc.green },
  warn: { label: 'WARN', color: pc.yellow },
  error: { label: 'ERROR', color: pc.red },
  sql: { label: 'SQL', color: pc.magenta },
  http: { label: 'HTTP', color: pc.blue },
};

const SENSITIVE = ['motdepasse', 'password', 'ancienmotdepasse', 'nouveaumotdepasse', 'confirmation', 'code', 'token', 'codehash', 'signature'];

// Masque récursivement les mots de passe et codes
function mask(value) {
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.includes(k.toLowerCase()) ? '***' : mask(v)])
    );
  }
  return value;
}

function write(level, tag, message, extra) {
  const { label, color } = LEVELS[level];
  const line = `${pc.gray(`[${stamp()}]`)} ${color(`[${label}]`)} ${pc.bold(`[${tag}]`)} ${message}`;
  const out = level === 'error' ? console.error : console.log;
  out(line);
  if (extra !== undefined) out(pc.gray(typeof extra === 'string' ? extra : JSON.stringify(mask(extra), null, 2)));
}

module.exports = {
  mask,
  info: (tag, msg, extra) => write('info', tag, msg, extra),
  success: (tag, msg, extra) => write('success', tag, msg, extra),
  warn: (tag, msg, extra) => write('warn', tag, msg, extra),
  error: (tag, msg, extra) => write('error', tag, msg, extra),
  sql: (tag, msg) => write('sql', tag, msg),
  http: (tag, msg, extra) => write('http', tag, msg, extra),
};