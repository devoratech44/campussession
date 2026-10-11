// frontend/src/pages/etudiant/Dashboard.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ScanLine, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../utils/format';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Gauges from '../../components/etudiant/Gauges';
import UpcomingList from '../../components/etudiant/UpcomingList';
import '../../styles/reports.css';
import '../../styles/etudiant.css';

const REFRESH = Number(import.meta.env.VITE_STUDENT_DASH_REFRESH_MS) || 15000;
const PASS = Number(import.meta.env.VITE_EVAL_PASS_MARK) || 10;
const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };
const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}${suffix}`);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/etudiant/dashboard');
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
  const toPoint = data.enCours.filter((c) => c.peutPointer);

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><LayoutDashboard size={24} /></span> Bonjour, {user.prenom}</h1>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {toPoint.length > 0 && (
        <div className="alert alert-info" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <span><strong>{toPoint[0].moduleCode} · {toPoint[0].moduleNom}</strong> : le pointage est ouvert (jusqu’à {toPoint[0].heureFin} {TIMEZONE_LABEL}).</span>
          <Link className="btn" to="/etudiant/pointage"><ScanLine size={18} /> Pointer</Link>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi"><small>Taux de présence</small><strong>{fmt(s.taux, ' %')}</strong><small>{s.seances} séance(s) terminée(s)</small></div>
        <div className="kpi"><small>Présences</small><strong>{s.presents}</strong></div>
        <div className="kpi"><small>Retards</small><strong>{s.retards}</strong><small>{s.retardsNJ} non justifié(s)</small></div>
        <div className="kpi"><small>Absences</small><strong>{s.absents}</strong><small>{s.absentsNJ} non justifiée(s)</small></div>
        <div className="kpi"><small>Moyenne générale</small><strong>{fmt(s.moyenne)}</strong><small>sur 20</small></div>
      </div>

      <Gauges blocage={data.blocage} />
      <div><Link className="btn btn-ghost" to="/etudiant/presences">Voir le détail de mes présences</Link></div>

      {data.aRendre.length > 0 && (
        <section className="stack">
          <h3 className="step-title">Devoirs à rendre</h3>
          {data.aRendre.map((t) => (
            <div className="alert alert-info" key={t.id} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span><strong>{t.moduleCode}</strong> · {t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE[t.type]} « {t.titre} »{t.dateTravail ? ` : pour le ${t.dateTravail.split('-').reverse().join('/')}` : ''}{t.statut === 'en_retard' ? ' (délai dépassé)' : ''}</span>
              <Link className="btn btn-ghost" to="/etudiant/devoirs">Voir</Link>
            </div>
          ))}
        </section>
      )}

      {data.dernierContenu && (
        <section className="stack">
          <h3 className="step-title">Dernier cours vu</h3>
          <div className="card stack">
            <strong>{data.dernierContenu.moduleCode} · {data.dernierContenu.moduleNom}</strong>
            <small className="muted">{data.dernierContenu.dateSeance.split('-').reverse().join('/')} · {data.dernierContenu.professeur}</small>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.dernierContenu.pointsAbordes}</p>
            <div><Link className="btn btn-ghost" to="/etudiant/contenu">Tout le contenu des cours</Link></div>
          </div>
        </section>
      )}

      <UpcomingList items={data.aVenir} />

      <section className="stack">
        <h3 className="step-title">Dernières notes</h3>
        {data.notes.length === 0 ? <div className="empty">Aucune note pour le moment.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Évaluation</th><th>Module</th><th>Note / 20</th><th>Date</th></tr></thead>
              <tbody>
                {data.notes.map((nt, i) => (
                  <tr key={i}>
                    <td>{nt.type === 'tp' ? `TP ${nt.numeroTp}` : TYPE[nt.type]} · {nt.titre}</td>
                    <td>{nt.moduleCode}</td>
                    <td className={nt.valeur >= PASS ? 'mark-ok' : 'mark-ko'}><strong>{fmt(nt.valeur)}</strong></td>
                    <td>{new Date(nt.updatedAt).toLocaleDateString('fr-FR', { timeZone: TIMEZONE })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}