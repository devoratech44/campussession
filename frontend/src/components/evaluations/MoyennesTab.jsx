// frontend/src/components/evaluations/MoyennesTab.jsx
import { useEffect, useState } from 'react';
import { School, Layers, BookOpen, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Loader from '../common/Loader';

const PASS = Number(import.meta.env.VITE_EVAL_PASS_MARK) || 10;
const MAX = Number(import.meta.env.VITE_EVAL_MAX_NOTE) || 20;
const fmt = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const cls = (n) => (n === null || n === undefined ? '' : (n >= PASS ? 'mark-ok' : 'mark-ko'));

export default function MoyennesTab({ options, base = '/evaluations' }) {
  const [f, setF] = useState({ classeId: '', filiereId: '', moduleId: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`${base}/moyennes`, { params: { classeId: f.classeId || undefined, filiereId: f.filiereId || undefined, moduleId: f.moduleId || undefined } })
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [f]);

  const set = (name) => (e) => setF((x) => ({ ...x, [name]: e.target.value }));

  return (
    <div className="stack">
      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="m-classe"><School size={16} /> Classe</label>
            <select id="m-classe" value={f.classeId} onChange={set('classeId')}>
              <option value="">Toutes</option>
              {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-filiere"><Layers size={16} /> Filière</label>
            <select id="m-filiere" value={f.filiereId} onChange={set('filiereId')}>
              <option value="">Toutes</option>
              {options.filieres.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-module"><BookOpen size={16} /> Module</label>
            <select id="m-module" value={f.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {loading ? <Loader /> : (
        <div className="table-wrap">
          <table className="moy-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                {data.modules.map((m) => <th key={m.id} title={`${m.nom} (coef. ${m.coefficient})`}>{m.code}<small className="muted" style={{ display: 'block' }}>coef. {fmt(m.coefficient)}</small></th>)}
                <th>Moyenne générale / {MAX}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={data.modules.length + 2} className="empty">Aucune note saisie pour ces filtres.</td></tr>}
              {data.items.map((s) => (
                <tr key={s.etudiantId}>
                  <td>{s.prenom} {s.nom}<small className="muted" style={{ display: 'block' }}>{s.matricule}{s.classe ? ` · ${s.classe}` : ''}</small></td>
                  {data.modules.map((m) => <td key={m.id} className={cls(s.parModule[m.id])}>{fmt(s.parModule[m.id])}</td>)}
                  <td className={cls(s.generale)}><strong>{fmt(s.generale)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small className="hint">Moyenne d’un module : notes pondérées par type (devoir, TP, examen). Moyenne générale : moyennes des modules pondérées par leur coefficient.</small>
    </div>
  );
}