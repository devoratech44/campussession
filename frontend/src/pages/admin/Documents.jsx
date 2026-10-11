// frontend/src/pages/admin/Documents.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  FolderOpen, Plus, Pencil, Trash2, Download, Eye, Archive, ArchiveRestore, ExternalLink, CircleAlert,
  ChevronLeft, ChevronRight, RotateCcw, BookOpen, School, Tags,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { downloadFile, openFile, formatSize } from '../../utils/files';
import { TIMEZONE } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DocumentModal from '../../components/documents/DocumentModal';

const TYPE = { cours: 'Cours', ressource: 'Ressource', video: 'Vidéo', autre: 'Autre' };
const EMPTY = { type: '', moduleId: '', classeId: '', archive: '' };
const PREVIEW = /\.(pdf|png|jpe?g)$/i;
const day = (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: TIMEZONE });

export default function Documents() {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounced(search.trim()); setPage(1); }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/enseignements/options').then((r) => setOptions(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/documents', {
        params: {
          page, q: searchDebounced || undefined, type: filters.type || undefined, moduleId: filters.moduleId || undefined,
          classeId: filters.classeId || undefined, archive: filters.archive || undefined,
        },
      });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchDebounced]);

  useEffect(() => { load(); }, [load]);

  if (!options || (loading && !data)) return <Loader />;

  const setFilter = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };
  const reset = () => { setFilters(EMPTY); setSearch(''); setPage(1); };

  const guard = async (fn) => { try { await fn(); } catch (err) { toast.error(errorMessage(err)); } };
  const onOpen = (d) => guard(async () => {
    if (!d.aFichier && d.lien) window.open(d.lien, '_blank', 'noopener');
    else await openFile(`/documents/${d.id}/fichier`);
  });
  const onDownload = (d) => guard(() => downloadFile(`/documents/${d.id}/fichier`, d.nomOriginal || d.titre));
  const onArchive = (d) => guard(async () => {
    await api.put(`/documents/${d.id}/archive`, { archive: !d.estArchive });
    toast.success(d.estArchive ? 'Document désarchivé.' : 'Document archivé.');
    load();
  });

  const onSaved = (wasEdit) => {
    toast.success(wasEdit ? 'Document modifié.' : 'Document ajouté.');
    setModal(null);
    load();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/documents/${confirm.id}`);
      toast.success('Document supprimé.');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><FolderOpen size={24} /></span> Documents</h1>
        <button type="button" className="btn" onClick={() => setModal({ item: null })}><Plus size={20} /> Nouveau document</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="f-q">Recherche</label>
            <input id="f-q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titre ou description…" />
          </div>
          <div className="field">
            <label htmlFor="f-type"><Tags size={16} /> Type</label>
            <select id="f-type" value={filters.type} onChange={setFilter('type')}>
              <option value="">Tous</option>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-module"><BookOpen size={16} /> Module</label>
            <select id="f-module" value={filters.moduleId} onChange={setFilter('moduleId')}>
              <option value="">Tous</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-classe"><School size={16} /> Classe</label>
            <select id="f-classe" value={filters.classeId} onChange={setFilter('classeId')}>
              <option value="">Toutes</option>
              {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-arch">Affichage</label>
            <select id="f-arch" value={filters.archive} onChange={setFilter('archive')}>
              <option value="">Documents actifs</option>
              <option value="true">Archivés</option>
              <option value="all">Tous</option>
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Document</th><th>Type</th><th>Module</th><th>Classe</th><th>Fichier</th><th>Ajouté</th><th>Actions</th></tr></thead>
          <tbody>
            {data?.items.length === 0 && <tr><td colSpan={7} className="empty">Aucun document.</td></tr>}
            {data?.items.map((d) => (
              <tr key={d.id} style={d.estArchive ? { opacity: 0.6 } : undefined}>
                <td>
                  <strong>{d.titre}</strong>
                  {d.estArchive && <span className="badge" style={{ marginLeft: 6 }}>Archivé</span>}
                  {d.description && <small className="muted" style={{ display: 'block' }}>{d.description}</small>}
                </td>
                <td><span className="badge badge-info">{TYPE[d.type]}</span></td>
                <td>{d.moduleCode || '—'}</td>
                <td>{d.classeNom || 'Toutes'}</td>
                <td>
                  {d.aFichier ? <>{d.nomOriginal}<small className="muted" style={{ display: 'block' }}>{formatSize(d.taille)}</small></> : null}
                  {d.lien && <small className="muted" style={{ display: 'block' }}><ExternalLink size={12} /> Lien externe</small>}
                </td>
                <td>{day(d.createdAt)}<small className="muted" style={{ display: 'block' }}>{d.auteur || ''}</small></td>
                <td>
                  <div className="actions">
                    {(d.lien || PREVIEW.test(d.nomOriginal || '')) && (
                      <button type="button" className="icon-btn" title="Ouvrir" aria-label="Ouvrir" onClick={() => onOpen(d)}><Eye size={18} /></button>
                    )}
                    {d.aFichier && <button type="button" className="icon-btn" title="Télécharger" aria-label="Télécharger" onClick={() => onDownload(d)}><Download size={18} /></button>}
                    <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ item: d })}><Pencil size={18} /></button>
                    <button type="button" className="icon-btn" title={d.estArchive ? 'Désarchiver' : 'Archiver'} aria-label={d.estArchive ? 'Désarchiver' : 'Archiver'} onClick={() => onArchive(d)}>
                      {d.estArchive ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                    </button>
                    <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm(d)}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} document(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}

      {modal && <DocumentModal item={modal.item} options={options} onClose={() => setModal(null)} onSaved={onSaved} />}

      {confirm && (
        <ConfirmDialog
          title="Supprimer ce document ?" icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={`« ${confirm.titre} » sera supprimé définitivement avec son fichier. Pour le garder sans l’afficher, archivez-le plutôt.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}