// frontend/src/utils/password.js
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '@#$%&*!?';

const randomInt = (max) => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % max;
};
const pick = (set) => set[randomInt(set.length)];

export function generatePassword(length, max) {
  const size = Math.min(Math.max(length, 8), max || 72);
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const LEVELS = [
  { label: 'Trop faible', color: 'var(--danger)' },
  { label: 'Faible', color: 'var(--danger)' },
  { label: 'Moyen', color: 'var(--warning)' },
  { label: 'Bon', color: 'var(--primary)' },
  { label: 'Excellent', color: 'var(--success)' },
];

export function evaluatePassword(value, rules) {
  if (!value) return { score: 0, ...LEVELS[0] };
  const min = rules?.min ?? 0;
  let score = 0;
  if (value.length >= min) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= min + 4) score += 1;
  if ((/[a-z]/.test(value) && /[A-Z]/.test(value)) || /[^A-Za-z0-9]/.test(value)) score += 1;
  return { score, ...LEVELS[score] };
}