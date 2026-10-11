// frontend/src/utils/schedule.js
export const DAYS = [
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
  { id: 7, label: 'Dimanche', short: 'Dim' },
];

export const PUBLIC_TYPES = {
  classe: 'Classe',
  filiere: 'Filière',
  groupe: 'Groupe',
  etudiant: 'Étudiant (individuel)',
};

const pad = (n) => String(n).padStart(2, '0');

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':');
  return Number(h) * 60 + Number(m);
};
export const toLabel = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// Une couleur par module (angle d'or pour bien les distinguer)
export const moduleColor = (id) => `hsl(${(Number(id) * 137) % 360} 62% 42%)`;

export const dayLabel = (id) => DAYS.find((d) => d.id === Number(id))?.label || '';

export const todayDayId = () => ((new Date().getUTCDay() + 6) % 7) + 1;

export const totalHours = (slots) =>
  slots.reduce((sum, s) => sum + (toMinutes(s.heureFin) - toMinutes(s.heureDebut)), 0) / 60;

export const formatHours = (hours) => `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', ',')} h`;

export const formatDateFr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export const periodLabel = (slot) =>
  slot.dateDebut || slot.dateFin
    ? `${formatDateFr(slot.dateDebut) || '…'} au ${formatDateFr(slot.dateFin) || '…'}`
    : 'Chaque semaine';

// Lundi et dimanche de la semaine contenant une date (AAAA-MM-JJ)
export function weekBounds(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  return { start: iso(monday), end: iso(sunday) };
}

export const slotInWeek = (slot, week) =>
  !week || ((!slot.dateDebut || slot.dateDebut <= week.end) && (!slot.dateFin || slot.dateFin >= week.start));

// Cours simultanés côte à côte : attribue une colonne (lane) à chaque créneau d'un jour
export function layoutDay(slots) {
  const items = slots
    .map((slot) => ({ slot, start: toMinutes(slot.heureDebut), end: toMinutes(slot.heureFin) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds = [];
    cluster.forEach((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.end); } else laneEnds[lane] = item.end;
      item.lane = lane;
    });
    cluster.forEach((item) => result.push({ ...item, lanes: laneEnds.length }));
    cluster = [];
  };

  items.forEach((item) => {
    if (cluster.length && item.start >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  });
  flush();
  return result;
}