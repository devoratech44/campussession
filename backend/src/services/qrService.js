// backend/src/services/qrService.js
const crypto = require('crypto');

// Lecture à la demande : indépendante de l'ordre de chargement du .env
const conf = () => ({
  secret: process.env.QR_SECRET || process.env.JWT_SECRET,
  rotateMs: (Number(process.env.QR_ROTATE_SECONDS) || 3) * 1000,
  window: Number(process.env.QR_WINDOW_SLOTS) || 5,
  proofMs: (Number(process.env.SCAN_PROOF_SECONDS) || 180) * 1000,
});

const mac = (data, len) => crypto.createHmac('sha256', conf().secret).update(data).digest('hex').slice(0, len);

const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const keyFor = (token, slot) => mac(`qr|${token}|${slot}`, 12);

// Clé courante du QR (change toutes les QR_ROTATE_SECONDS)
function currentKey(token) {
  const { rotateMs } = conf();
  const now = Date.now();
  return { key: keyFor(token, Math.floor(now / rotateMs)), refreshMs: rotateMs, msLeft: rotateMs - (now % rotateMs) };
}

// Accepte la tranche courante et les précédentes (latence de scan et de chargement)
function verifyKey(token, key) {
  if (!key) return false;
  const { rotateMs, window } = conf();
  const slot = Math.floor(Date.now() / rotateMs);
  for (let i = 0; i < window; i += 1) {
    if (same(keyFor(token, slot - i), key)) return true;
  }
  return false;
}

// Preuve de scan : liée à la séance et à l'étudiant, valable quelques minutes
function issueProof(seanceId, userId) {
  const exp = Date.now() + conf().proofMs;
  return `${exp}.${mac(`proof|${seanceId}|${userId}|${exp}`, 24)}`;
}

function verifyProof(seanceId, userId, proof) {
  const [exp, sig] = String(proof || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(mac(`proof|${seanceId}|${userId}|${exp}`, 24), sig);
}

module.exports = { currentKey, verifyKey, issueProof, verifyProof };