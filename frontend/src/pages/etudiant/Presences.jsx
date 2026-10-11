// frontend/src/pages/etudiant/Presences.jsx
import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, ChevronLeft, ChevronRight, RotateCcw, CircleAlert, BookOpen, CalendarRange } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import { METHODES, PRESENCE_STATUS, timeOf } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Gauges from '../../components/etudiant/Gauges';
import '../../styles/reports.css';
import '../../styles/etudiant.css';

const EMPTY = { statut: '', moduleId: '', du: '', au: '' };
const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}${suffix}`);

export default function Presences() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/etudiant/presences', {
        params: { page, statut: filters.statut || undefined, moduleId: filters.moduleId || undefined, du: filters.du || undefined, au: filters.au || undefined },
      });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <Loader />;
  if (!data) return <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>;

  const set = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };
  const s = data.summary;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><ClipboardCheck size={24} /></span> Mes présences</h1>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <Gauges blocage={data.blocage} />

      <div className="kpi-grid">
        <div className="kpi"><small>Taux de présence</small><strong>{fmt(s.taux, ' %')}</strong><small>{s.seances} séance(s)</small></div>
        <div className="kpi good"><small>Présent</small><strong>{s.presents}</strong></div>
        <div className="kpi"><small>Retards</small><strong>{s.retards}</strong><small>{s.retardsNJ} non justifié(s)</small></div>
        <div className={`kpi ${s.absents ? 'bad' : ''}`}><small>Absences</small><strong>{s.absents}</strong><small>{s.absentsNJ} non justifiée(s)</small></div>
      </div>

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="p-statut">Statut</label>
            <select id="p-statut" value={filters.statut} onChange={set('statut')}>
              <option value="">Tous</option>
              <option value="present">Présent</option>
              <option value="retard">Retard</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-module"><BookOpen size={16} /> Module</label>
            <select id="p-module" value={filters.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {data.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-du"><CalendarRange size={16} /> Du</label>
            <input id="p-du" type="date" value={filters.du} onChange={set('du')} />
          </div>
          <div className="field">
            <label htmlFor="p-au"><CalendarRange size={16} /> Au</label>
            <input id="p-au" type="date" min={filters.du || undefined} value={filters.au} onChange={set('au')} />
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Cours</th><th>Horaire</th><th>Statut</th><th>Justification</th><th>Pointage</th><th>Remarque</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={7} className="empty">Aucune présence pour ces filtres : seules les séances terminées apparaissent.</td></tr>}
            {data.items.map((r) => {
              const ps = PRESENCE_STATUS[r.statut];
              return (
                <tr key={r.seanceId}>
                  <td>{formatDateFr(r.dateSeance)}</td>
                  <td><strong>{r.moduleCode}</strong><small className="muted" style={{ display: 'block' }}>{r.professeur}{r.salle ? ` · ${r.salle}` : ''}</small></td>
                  <td>{r.heureDebut} - {r.heureFin}</td>
                  <td>
                    <span className={`badge ${ps.cls}`}>{ps.label}</span>
                    {r.statut === 'retard' && <small className="muted" style={{ display: 'block' }}>{r.minutesRetard} min</small>}
                  </td>
                  <td>
                    {r.statut === 'present' ? '—' : (r.justifie
                      ? <><span className="badge badge-ok">Justifié</span>{r.motifJustification && <small className="muted" style={{ display: 'block' }}>{r.motifJustification}</small>}</>
                      : <span className="badge badge-ko">Non justifié</span>)}
                  </td>
                  <td>{r.scannedAt ? <>{timeOf(r.scannedAt)}<small className="muted" style={{ display: 'block' }}>{METHODES[r.methode]}</small></> : (r.methode && r.methode !== 'auto' ? METHODES[r.methode] : '—')}</td>
                  <td>{r.remarque || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} séance(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}
      <small className="hint">Une absence ou un retard justifié par l’administration ne compte plus pour le blocage.</small>
    </section>
  );
}