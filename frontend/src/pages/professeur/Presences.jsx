// frontend/src/pages/professeur/Presences.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ChevronLeft, ChevronRight, DoorOpen, Layers, CircleAlert, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { errorMessage } from '../../utils/format';
import { PUBLIC_TYPES, formatDateFr } from '../../utils/schedule';
import { SEANCE_STATUS, shiftDate, todayStr } from '../../utils/presence';
import '../../styles/etudiant.css';

export default function Presences() {
  const [date, setDate] = useState(todayStr);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/presences/seances', { params: { dateDebut: date, dateFin: date, ordre: 'asc', limit: 50 } });
      setItems(data.data.items);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [date]);

  useEffect(() => {
    load();
    const id = setInterval(load, env.liveRefreshMs * 3);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><ClipboardCheck size={24} /></span> Séances et présences</h1>
        <div className="date-nav">
          <button type="button" className="icon-btn" aria-label="Jour précédent" onClick={() => setDate((d) => shiftDate(d, -1))}><ChevronLeft size={20} /></button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <button type="button" className="icon-btn" aria-label="Jour suivant" onClick={() => setDate((d) => shiftDate(d, 1))}><ChevronRight size={20} /></button>
          <button type="button" className="btn btn-ghost" onClick={() => setDate(todayStr())}>Aujourd&apos;hui</button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <p className="muted" style={{ margin: 0 }}>{formatDateFr(date)}. La session s&apos;ouvre automatiquement 5 minutes avant le cours : signez pour afficher le QR code.</p>

      <div className="grid">
        {items.length === 0 && <div className="card empty">Aucune séance ce jour-là.</div>}
        {items.map((s) => {
          const st = SEANCE_STATUS[s.statut];
          const e = s.enseignement;
          if (s.virtuelle) {
            return (
              <div key={s.id} className="card seance-card" style={{ opacity: 0.85 }}>
                <h3>{e.module.code} · {s.heureDebut} - {s.heureFin}</h3>
                <span className="muted">{e.module.nom}</span>
                <div className="meta-line">
                  <span><Layers size={16} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
                  <span><DoorOpen size={16} /> {s.salle || '—'}</span>
                </div>
                <div className="row row-between">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <small className="muted">Ouverture à {s.ouvreA}</small>
                </div>
              </div>
            );
          }
          return (
            <Link key={s.id} to={`/professeur/presences/${s.id}`} className="card card-hover seance-card" style={{ color: 'var(--text)' }}>
              <h3>{e.module.code} · {s.heureDebut} - {s.heureFin}</h3>
              <span className="muted">{e.module.nom}</span>
              <div className="meta-line">
                <span><Layers size={16} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
                <span><DoorOpen size={16} /> {s.salle || '—'}</span>
              </div>
              <div className="row row-between">
                <span className={`badge ${st.cls}`}>{st.label}</span>
                <span className="badges">
                  <span className="badge badge-present">{s.counts.present} P</span>
                  <span className="badge badge-retard">{s.counts.retard} R</span>
                  <span className="badge badge-absent">{s.counts.absent} A</span>
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700 }}>
                {s.statut === 'ouverte' ? 'Gérer la session' : 'Voir la séance'} <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}