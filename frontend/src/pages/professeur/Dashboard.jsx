// frontend/src/pages/professeur/Dashboard.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CircleAlert, DoorOpen, Layers, PenLine, CalendarClock, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../utils/format';
import { PUBLIC_TYPES } from '../../utils/schedule';
import { SEANCE_STATUS, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import { dayWord } from '../../components/etudiant/UpcomingList';
import '../../styles/reports.css';
import '../../styles/etudiant.css';

const REFRESH = Number(import.meta.env.VITE_STUDENT_DASH_REFRESH_MS) || 15000;
const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}${suffix}`);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/professeur/dashboard');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const s = data.stats;
  const toSign = data.seancesDuJour.filter((x) => x.statut === 'ouverte' && !x.signe);

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><LayoutDashboard size={24} /></span> Bonjour, {user.prenom}</h1>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {toSign.map((x) => (
        <div className="alert alert-info" key={x.id} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <span><PenLine size={18} style={{ verticalAlign: 'text-bottom' }} /> <strong>{x.enseignement.module.code}</strong> ({x.heureDebut} - {x.heureFin}) : la session est ouverte, signez pour lancer le pointage.</span>
          <Link className="btn" to={`/professeur/presences/${x.id}`}>Signer</Link>
        </div>
      ))}

      <div className="kpi-grid">
        <div className="kpi"><small>Étudiants suivis</small><strong>{s.etudiants}</strong></div>
        <div className="kpi"><small>Modules</small><strong>{s.modules}</strong><small>{s.assignations} assignation(s)</small></div>
        <div className="kpi"><small>Séances tenues</small><strong>{s.seancesTenues}</strong><small>{fmt(s.heures)} h</small></div>
        <div className="kpi"><small>Évaluations</small><strong>{s.evaluations}</strong></div>
        <div className={`kpi ${s.aCorriger ? 'bad' : ''}`}><small>Rendus à corriger</small><strong>{s.aCorriger}</strong></div>
        <div className="kpi"><small>Avis des étudiants</small><strong>{s.avis === null ? '—' : `${fmt(s.avis)} / 5`}</strong><small>{s.nbAvis} avis</small></div>
      </div>

      <section className="stack">
        <h3 className="step-title">Séances d’aujourd’hui</h3>
        {data.seancesDuJour.length === 0 && <div className="empty">Aucune séance aujourd’hui.</div>}
        {data.seancesDuJour.map((x) => {
          const st = SEANCE_STATUS[x.statut];
          const e = x.enseignement;
          return (
            <Link key={x.id} to={`/professeur/presences/${x.id}`} className="course" style={{ color: 'var(--text)' }}>
              <div className="course__time">{x.heureDebut}<small>{x.heureFin}</small></div>
              <div className="course__body">
                <strong>{e.module.code} · {e.module.nom}</strong>
                <span className="meta-line">
                  <span><Layers size={14} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
                  <span><DoorOpen size={14} /> {x.salle || '—'}</span>
                </span>
              </div>
              <div className="course__badges">
                <span className={`badge ${st.cls}`}>{st.label}</span>
                {x.statut !== 'planifiee' && x.statut !== 'annulee' && (
                  <span className="course__note">{x.counts.present} P · {x.counts.retard} R · {x.counts.absent} A <ArrowRight size={12} /></span>
                )}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="stack">
        <h3 className="step-title"><CalendarClock size={20} /> Prochains cours</h3>
        {data.aVenir.length === 0 && <div className="empty">Aucun cours à venir prochainement.</div>}
        {data.aVenir.map((c) => (
          <div className="course" key={`${c.date}-${c.heureDebut}-${c.moduleCode}-${c.publicLabel}`}>
            <div className="course__time">{c.heureDebut}<small>{c.heureFin}</small></div>
            <div className="course__body">
              <strong>{c.moduleCode} · {c.moduleNom}</strong>
              <span className="meta-line">
                <span>{dayWord(c.date)}</span>
                <span><Layers size={14} /> {c.publicLabel}</span>
                <span><DoorOpen size={14} /> {c.salle || '—'}</span>
              </span>
            </div>
            <div className="course__badges">
              <span className="badge badge-info">À venir</span>
              <span className="course__note">Ouverture à {c.ouvreA} {TIMEZONE_LABEL}</span>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}