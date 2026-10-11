// frontend/src/utils/presence.js
const pad = (n) => String(n).padStart(2, '0');

export const SEANCE_STATUS = {
  planifiee: { label: 'Planifiée', cls: 'badge-info' },
  ouverte: { label: 'Ouverte', cls: 'badge-ok' },
  fermee: { label: 'Fermée', cls: '' },
  annulee: { label: 'Annulée', cls: 'badge-ko' },
};

export const PRESENCE_STATUS = {
  present: { label: 'Présent', cls: 'badge-present' },
  retard: { label: 'Retard', cls: 'badge-retard' },
  absent: { label: 'Absent', cls: 'badge-absent' },
};

export const METHODES = { qr: 'QR code', code: 'Code', prof: 'Professeur', admin: 'Administrateur', auto: 'Automatique' };

export const TIMEZONE = import.meta.env.VITE_TIMEZONE || 'UTC';
export const TIMEZONE_LABEL = import.meta.env.VITE_TIMEZONE_LABEL || 'GMT';

// Date du jour en GMT (et non celle du fuseau de l'appareil)
export const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

export const shiftDate = (str, days) => {
  const d = new Date(`${str}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE }) : '—');

export const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};