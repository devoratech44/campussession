// frontend/src/pages/professeur/Documents.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  FolderOpen, Plus, Pencil, Trash2, Download, Eye, Archive, ArchiveRestore, ExternalLink, CircleAlert, ChevronLeft, ChevronRight,
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
import '../../styles/etudiant.css';

const BASE = '/professeur/documents';
const TYPE = { cours: 'Cours', ressource: 'Ressource', video: 'Vidéo', autre: 'Autre' };
const PREVIEW = /\.(pdf|png|jpe?g)$/i;

export default function Documents() {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [archive, setArchive] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/professeur/options').then((r) => setOptions(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(BASE, { params: { page, q: debounced || undefined, archive: archive || undefined } });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, debounced, archive]);

  useEffect(() => { load(); }, [load]);

  if (!options || !data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const guard = async (fn) => { try { await fn(); } catch (err) { toast.error(errorMessage(err)); } };
  const onOpen = (d) => guard(async () => {
    if (!d.aFichier && d.lien) window.open(d.lien, '_blank', 'noopener');
    else await openFile(`${BASE}/${d.id}/fichier`);
  });
  const onArchive = (d) => guard(async () => {
    await api.put(`${BASE}/${d.id}/archive`, { archive: !d.estArchive });
    toast.success(d.estArchive ? 'Document désarchivé.' : 'Document archivé.');
    load();
  });
  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`${BASE}/${confirm.id}`);
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
        <h1 className="page-title"><span className="ico"><FolderOpen size={24} /></span> Mes documents</h1>
        <button type="button" className="btn" disabled={options.modules.length === 0} onClick={() => setModal({ item: null })}><Plus size={20} /> Nouveau document</button>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="pd-q">Recherche</label>
            <input id="pd-q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titre ou description…" />
          </div>
          <div className="field">
            <label htmlFor="pd-arch">Affichage</label>
            <select id="pd-arch" value={archive} onChange={(e) => { setArchive(e.target.value); setPage(1); }}>
              <option value="">Documents actifs</option>
              <option value="true">Archivés</option>
              <option value="all">Tous</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Document</th><th>Type</th><th>Module</th><th>Classe</th><th>Fichier</th><th>Ajouté</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={7} className="empty">Aucun document.</td></tr>}
            {data.items.map((d) => (
              <tr key={d.id} style={d.estArchive ? { opacity: 0.6 } : undefined}>
                <td><strong>{d.titre}</strong>{d.estArchive && <span className="badge" style={{ marginLeft: 6 }}>Archivé</span>}{d.description && <small className="muted" style={{ display: 'block' }}>{d.description}</small>}</td>
                <td><span className="badge badge-info">{TYPE[d.type]}</span></td>
                <td>{d.moduleCode || '—'}</td>
                <td>{d.classeNom || 'Toutes mes classes'}</td>
                <td>
                  {d.aFichier && <>{d.nomOriginal}<small className="muted" style={{ display: 'block' }}>{formatSize(d.taille)}</small></>}
                  {d.lien && <small className="muted" style={{ display: 'block' }}><ExternalLink size={12} /> Lien externe</small>}
                </td>
                <td>{new Date(d.createdAt).toLocaleDateString('fr-FR', { timeZone: TIMEZONE })}</td>
                <td>
                  <div className="actions">
                    {(d.lien || PREVIEW.test(d.nomOriginal || '')) && <button type="button" className="icon-btn" title="Ouvrir" aria-label="Ouvrir" onClick={() => onOpen(d)}><Eye size={18} /></button>}
                    {d.aFichier && <button type="button" className="icon-btn" title="Télécharger" aria-label="Télécharger" onClick={() => guard(() => downloadFile(`${BASE}/${d.id}/fichier`, d.nomOriginal || d.titre))}><Download size={18} /></button>}
                    <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ item: d })}><Pencil size={18} /></button>
                    <button type="button" className="icon-btn" title={d.estArchive ? 'Désarchiver' : 'Archiver'} aria-label={d.estArchive ? 'Désarchiver' : 'Archiver'} onClick={() => onArchive(d)}>{d.estArchive ? <ArchiveRestore size={18} /> : <Archive size={18} />}</button>
                    <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm(d)}><Trash2 size={18} /></button>
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
      <small className="hint">Vos étudiants voient un document dès qu’il concerne un de vos modules. Si vous choisissez une classe, seule cette classe le voit.</small>

      {modal && (
        <DocumentModal
          item={modal.item} options={options} base={BASE} moduleRequired
          onClose={() => setModal(null)}
          onSaved={(wasEdit) => { toast.success(wasEdit ? 'Document modifié.' : 'Document ajouté.'); setModal(null); load(); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Supprimer ce document ?" icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={`« ${confirm.titre} » sera supprimé définitivement. Pour le garder sans l’afficher, archivez-le.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}