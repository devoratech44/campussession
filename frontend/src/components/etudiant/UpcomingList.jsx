// frontend/src/components/etudiant/UpcomingList.jsx
import { DoorOpen, Presentation, CalendarClock } from 'lucide-react';
import { formatDateFr } from '../../utils/schedule';
import { TIMEZONE_LABEL, shiftDate, todayStr } from '../../utils/presence';
import '../../styles/etudiant.css';

export const dayWord = (date) => {
  const today = todayStr();
  if (date === today) return 'Aujourd’hui';
  if (date === shiftDate(today, 1)) return 'Demain';
  return formatDateFr(date);
};

const inWords = (min) => {
  if (min < 60) return `dans ${min} min`;
  if (min < 1440) return `dans ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  return '';
};

export default function UpcomingList({ items, title = 'Prochains cours' }) {
  return (
    <section className="stack">
      <h3 className="step-title"><CalendarClock size={20} /> {title}</h3>
      {items.length === 0 && <div className="empty">Aucun cours à venir prochainement.</div>}
      {items.map((c) => (
        <div className="course" key={`${c.date}-${c.heureDebut}-${c.moduleCode}`}>
          <div className="course__time">{c.heureDebut}<small>{c.heureFin}</small></div>
          <div className="course__body">
            <strong>{c.moduleCode} · {c.moduleNom}</strong>
            <span className="meta-line">
              <span>{dayWord(c.date)}</span>
              <span><DoorOpen size={14} /> {c.salle || '—'}</span>
              <span><Presentation size={14} /> {c.professeur}</span>
            </span>
          </div>
          <div className="course__badges">
            <span className="badge badge-info">À venir</span>
            <span className="course__note">Pointage dès {c.ouvreA} {TIMEZONE_LABEL}{inWords(c.debutDans) ? ` · ${inWords(c.debutDans)}` : ''}</span>
          </div>
        </div>
      ))}
    </section>
  );
}