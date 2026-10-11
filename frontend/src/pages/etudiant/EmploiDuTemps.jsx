// frontend/src/pages/etudiant/EmploiDuTemps.jsx
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CircleAlert, DoorOpen, Presentation, Layers, CalendarRange, Clock, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import useMeta from '../../hooks/useMeta';
import { errorMessage } from '../../utils/format';
import { DAYS, PUBLIC_TYPES, dayLabel, moduleColor, periodLabel, todayDayId, toMinutes } from '../../utils/schedule';
import { TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import ScheduleGrid from '../../components/schedule/ScheduleGrid';
import '../../styles/etudiant.css';

const byTime = (a, b) => toMinutes(a.heureDebut) - toMinutes(b.heureDebut);

function Details({ slot }) {
  const e = slot.enseignement;
  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <span><BookOpen size={16} style={{ verticalAlign: 'text-bottom' }} /> <strong>{e.module.code}</strong> · {e.module.nom}</span>
      <span><Clock size={16} style={{ verticalAlign: 'text-bottom' }} /> {dayLabel(slot.jour)} · {slot.heureDebut} - {slot.heureFin} ({TIMEZONE_LABEL})</span>
      <span><Presentation size={16} style={{ verticalAlign: 'text-bottom' }} /> {e.professeur.prenom} {e.professeur.nom}{e.professeur.specialite ? ` · ${e.professeur.specialite}` : ''}</span>
      <span><DoorOpen size={16} style={{ verticalAlign: 'text-bottom' }} /> {slot.salle || 'Salle non définie'}</span>
      <span><Layers size={16} style={{ verticalAlign: 'text-bottom' }} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
      <span><CalendarRange size={16} style={{ verticalAlign: 'text-bottom' }} /> {periodLabel(slot)}</span>
    </div>
  );
}

export default function EmploiDuTemps() {
  const meta = useMeta();
  const { user } = useAuth();
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('liste');
  const [day, setDay] = useState(todayDayId);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get('/emploi-du-temps/me')
      .then((res) => { const d = res.data.data; setSlots(Array.isArray(d) ? d : (d.items || d.slots || [])); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const inView = useMemo(() => (slots ? (view === 'jour' ? slots.filter((s) => s.jour === day) : slots) : []), [slots, view, day]);
  const legend = useMemo(() => {
    const map = new Map();
    inView.forEach((s) => map.set(s.enseignement.module.id, s.enseignement.module));
    return [...map.values()];
  }, [inView]);

  if (error) return <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>;
  if (!meta || !slots) return <Loader />;

  const today = todayDayId();

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><CalendarDays size={24} /></span> Mon emploi du temps</h1>
      </div>

      <div className="seg" role="group" aria-label="Affichage" style={{ maxWidth: 380 }}>
        <button type="button" className={view === 'liste' ? 'on' : ''} onClick={() => setView('liste')}>Liste</button>
        <button type="button" className={view === 'semaine' ? 'on' : ''} onClick={() => setView('semaine')}>Semaine</button>
        <button type="button" className={view === 'jour' ? 'on' : ''} onClick={() => setView('jour')}>Jour</button>
      </div>

      {view === 'jour' && (
        <div className="seg" role="tablist" aria-label="Jour">
          {DAYS.map((d) => <button key={d.id} type="button" role="tab" aria-selected={day === d.id} className={day === d.id ? 'on' : ''} onClick={() => setDay(d.id)}>{d.short}</button>)}
        </div>
      )}

      {view !== 'liste' && legend.length > 0 && (
        <div className="legend">
          {legend.map((m) => <span key={m.id} className="legend-item"><span className="legend-dot" style={{ background: moduleColor(m.id) }} />{m.code} · {m.nom}</span>)}
        </div>
      )}

      {view === 'liste' ? (
        <div className="stack">
          {slots.length === 0 && <div className="empty">Aucun cours dans votre emploi du temps.</div>}
          {DAYS.map((d) => {
            const list = slots.filter((s) => s.jour === d.id).sort(byTime);
            if (!list.length) return null;
            return (
              <section className="stack" key={d.id}>
                <h3 className="step-title">{d.label}{d.id === today && <span className="badge badge-ok">Aujourd’hui</span>}</h3>
                {list.map((s) => {
                  const e = s.enseignement;
                  return (
                    <div className="course" key={s.id} style={{ borderLeft: `5px solid ${moduleColor(e.module.id)}` }}>
                      <div className="course__time">{s.heureDebut}<small>{s.heureFin}</small></div>
                      <div className="course__body">
                        <strong>{e.module.code} · {e.module.nom}</strong>
                        <span className="meta-line">
                          {user.role !== 'professeur' && <span><Presentation size={14} /> {e.professeur.prenom} {e.professeur.nom}</span>}
                          <span><DoorOpen size={14} /> {s.salle || 'Salle non définie'}</span>
                          <span><Layers size={14} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
                        </span>
                        <small className="muted"><CalendarRange size={12} /> {periodLabel(s)}</small>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <ScheduleGrid
          slots={inView}
          days={view === 'jour' ? DAYS.filter((d) => d.id === day) : DAYS}
          schedule={meta.schedule}
          onSlotClick={setDetail}
        />
      )}

      <small className="hint">Horaires en heure {TIMEZONE_LABEL}. Dans la grille, cliquez sur un cours pour voir tous ses détails.</small>

      {detail && (
        <Modal title="Détail du cours" icon={CalendarDays} onClose={() => setDetail(null)}>
          <Details slot={detail} />
        </Modal>
      )}
    </section>
  );
}