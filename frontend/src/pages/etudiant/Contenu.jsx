// frontend/src/pages/etudiant/Contenu.jsx
import { useCallback, useEffect, useState } from 'react';
import { BookMarked, CircleAlert, ChevronLeft, ChevronRight, RotateCcw, Presentation, CalendarDays } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import '../../styles/etudiant.css';

const EMPTY = { moduleId: '', du: '', au: '', toutes: false };

export default function Contenu() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/etudiant/contenu', {
        params: { page, moduleId: filters.moduleId || undefined, du: filters.du || undefined, au: filters.au || undefined, toutes: filters.toutes || undefined },
      });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const set = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><BookMarked size={24} /></span> Contenu des cours</h1>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="c-module">Module</label>
            <select id="c-module" value={filters.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {data.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="c-du">Du</label><input id="c-du" type="date" value={filters.du} onChange={set('du')} /></div>
          <div className="field"><label htmlFor="c-au">Au</label><input id="c-au" type="date" min={filters.du || undefined} value={filters.au} onChange={set('au')} /></div>
          <label className="member-item" style={{ minHeight: 0 }}>
            <input type="checkbox" checked={filters.toutes} onChange={(e) => { setFilters((f) => ({ ...f, toutes: e.target.checked })); setPage(1); }} />
            Afficher aussi les séances sans contenu
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      {data.items.length === 0 && <div className="empty">Aucun contenu publié pour le moment.</div>}
      {data.items.map((s) => (
        <div className="card stack" key={s.seanceId}>
          <strong style={{ fontSize: '1.05rem' }}>{s.moduleCode} · {s.moduleNom}</strong>
          <span className="meta-line">
            <span><CalendarDays size={14} /> {formatDateFr(s.dateSeance)} · {s.heureDebut} - {s.heureFin}</span>
            <span><Presentation size={14} /> {s.professeur}</span>
          </span>
          {s.pointsAbordes
            ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.pointsAbordes}</p>
            : <p className="muted" style={{ margin: 0 }}>Le professeur n’a pas renseigné de contenu pour cette séance.</p>}
        </div>
      ))}

      {data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} séance(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}
    </section>
  );
}