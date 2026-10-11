// frontend/src/pages/etudiant/Documents.jsx
import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Download, Eye, ExternalLink, CircleAlert, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { downloadFile, openFile, formatSize } from '../../utils/files';
import { TIMEZONE } from '../../utils/presence';
import Loader from '../../components/common/Loader';

const TYPE = { cours: 'Cours', ressource: 'Ressource', video: 'Vidéo', autre: 'Autre' };
const PREVIEW = /\.(pdf|png|jpe?g)$/i;
const EMPTY = { type: '', moduleId: '' };

export default function Documents() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/etudiant/documents', {
        params: { page, q: debounced || undefined, type: filters.type || undefined, moduleId: filters.moduleId || undefined },
      });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, debounced, filters]);

  useEffect(() => { load(); }, [load]);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const guard = async (fn) => { try { await fn(); } catch (err) { toast.error(errorMessage(err)); } };
  const set = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><FolderOpen size={24} /></span> Documents</h1>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="o-q">Recherche</label>
            <input id="o-q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titre ou description…" />
          </div>
          <div className="field">
            <label htmlFor="o-type">Type</label>
            <select id="o-type" value={filters.type} onChange={set('type')}>
              <option value="">Tous</option>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="o-module">Module</label>
            <select id="o-module" value={filters.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {data.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setSearch(''); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Document</th><th>Type</th><th>Module</th><th>Fichier</th><th>Ajouté</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={6} className="empty">Aucun document disponible.</td></tr>}
            {data.items.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.titre}</strong>{d.description && <small className="muted" style={{ display: 'block' }}>{d.description}</small>}</td>
                <td><span className="badge badge-info">{TYPE[d.type]}</span></td>
                <td>{d.moduleCode || 'Général'}</td>
                <td>
                  {d.aFichier && <>{d.nomOriginal}<small className="muted" style={{ display: 'block' }}>{formatSize(d.taille)}</small></>}
                  {d.lien && <small className="muted" style={{ display: 'block' }}><ExternalLink size={12} /> Lien externe</small>}
                </td>
                <td>{new Date(d.createdAt).toLocaleDateString('fr-FR', { timeZone: TIMEZONE })}<small className="muted" style={{ display: 'block' }}>{d.auteur || ''}</small></td>
                <td>
                  <div className="actions">
                    {d.lien && <a className="icon-btn" href={d.lien} target="_blank" rel="noopener noreferrer" title="Ouvrir le lien" aria-label="Ouvrir le lien"><ExternalLink size={18} /></a>}
                    {d.aFichier && PREVIEW.test(d.nomOriginal || '') && (
                      <button type="button" className="icon-btn" title="Ouvrir" aria-label="Ouvrir" onClick={() => guard(() => openFile(`/etudiant/documents/${d.id}/fichier`))}><Eye size={18} /></button>
                    )}
                    {d.aFichier && (
                      <button type="button" className="icon-btn" title="Télécharger" aria-label="Télécharger" onClick={() => guard(() => downloadFile(`/etudiant/documents/${d.id}/fichier`, d.nomOriginal || d.titre))}><Download size={18} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} document(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}
    </section>
  );
}