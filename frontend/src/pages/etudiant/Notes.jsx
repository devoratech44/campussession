// frontend/src/pages/etudiant/Notes.jsx
import { useEffect, useState } from 'react';
import { TrendingUp, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { TIMEZONE } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import '../../styles/reports.css';
import '../../styles/evaluations.css';

const PASS = Number(import.meta.env.VITE_EVAL_PASS_MARK) || 10;
const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };
const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}${suffix}`);
const cls = (v) => (v === null || v === undefined ? '' : (v >= PASS ? 'mark-ok' : 'mark-ko'));

export default function Notes() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/etudiant/notes').then((res) => setData(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><TrendingUp size={24} /></span> Mes notes</h1>
      </div>

      <div className="kpi-grid">
        <div className={`kpi ${data.generale === null ? '' : (data.generale >= PASS ? 'good' : 'bad')}`}><small>Moyenne générale</small><strong>{fmt(data.generale)}</strong><small>sur 20</small></div>
        <div className="kpi"><small>Notes</small><strong>{data.nbNotes}</strong></div>
        <div className="kpi"><small>Modules notés</small><strong>{data.modules.length}</strong></div>
      </div>

      {data.modules.length === 0 && <div className="empty">Aucune note pour le moment.</div>}

      {data.modules.map((m) => (
        <section className="stack" key={m.id}>
          <div className="row row-between">
            <h3 className="step-title">{m.code} · {m.nom} <small className="muted">coef. {fmt(m.coefficient)}</small></h3>
            <span className={cls(m.moyenne)}>Moyenne du module : <strong>{fmt(m.moyenne)} / 20</strong></span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Évaluation</th><th>Note / 20</th><th>Commentaire du professeur</th><th>Date</th></tr></thead>
              <tbody>
                {m.notes.map((n) => (
                  <tr key={n.travailId}>
                    <td>{n.type === 'tp' ? `TP ${n.numeroTp}` : TYPE[n.type]} · {n.titre}</td>
                    <td className={cls(n.valeur)}><strong>{fmt(n.valeur)}</strong></td>
                    <td>{n.commentaire || '—'}</td>
                    <td>{new Date(n.updatedAt).toLocaleDateString('fr-FR', { timeZone: TIMEZONE })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <small className="hint">Moyenne d’un module : notes pondérées par type d’évaluation. Moyenne générale : moyennes des modules pondérées par leur coefficient.</small>
    </section>
  );
}