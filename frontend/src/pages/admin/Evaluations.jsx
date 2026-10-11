// frontend/src/pages/admin/Evaluations.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  NotebookPen, Plus, Pencil, Trash2, ClipboardList, Paperclip, CircleAlert, ChevronLeft, ChevronRight,
  RotateCcw, School, Layers, Presentation, BookOpen, Tags,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EvaluationModal from '../../components/evaluations/EvaluationModal';
import NotesPanel from '../../components/evaluations/NotesPanel';
import MoyennesTab from '../../components/evaluations/MoyennesTab';
import '../../styles/evaluations.css';

const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };
const EMPTY = { type: '', moduleId: '', professeurId: '', classeId: '', filiereId: '' };
const labelOf = (t) => (t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE[t.type]);
const fmt = (n) => (n === null ? '—' : String(n).replace('.', ','));

export default function Evaluations() {
  const toast = useToast();
  const [tab, setTab] = useState('liste');
  const [options, setOptions] = useState(null);
  const [enseignements, setEnseignements] = useState([]);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null);       // { item }
  const [notesFor, setNotesFor] = useState(null); // id
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounced(search.trim()); setPage(1); }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.all([api.get('/enseignements/options'), api.get('/enseignements')])
      .then(([o, e]) => { setOptions(o.data.data); setEnseignements(e.data.data); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/evaluations', {
        params: {
          page, q: searchDebounced || undefined,
          type: filters.type || undefined, moduleId: filters.moduleId || undefined, professeurId: filters.professeurId || undefined,
          classeId: filters.classeId || undefined, filiereId: filters.filiereId || undefined,
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

  if (notesFor) return <NotesPanel travailId={notesFor} onBack={() => setNotesFor(null)} onChanged={load} />;

  const setFilter = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };
  const reset = () => { setFilters(EMPTY); setSearch(''); setPage(1); };

  const onSaved = (wasEdit) => {
    toast.success(wasEdit ? 'Évaluation modifiée.' : 'Évaluation créée.');
    setModal(null);
    load();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/evaluations/${confirm.id}`);
      toast.success('Évaluation supprimée.');
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
        <h1 className="page-title"><span className="ico"><NotebookPen size={24} /></span> Devoirs, examens et notes</h1>
        <button type="button" className="btn" onClick={() => setModal({ item: null })}><Plus size={20} /> Nouvelle évaluation</button>
      </div>

      <div className="seg" role="tablist" aria-label="Sections" style={{ maxWidth: 360 }}>
        <button type="button" role="tab" aria-selected={tab === 'liste'} className={tab === 'liste' ? 'on' : ''} onClick={() => setTab('liste')}>Évaluations</button>
        <button type="button" role="tab" aria-selected={tab === 'moyennes'} className={tab === 'moyennes' ? 'on' : ''} onClick={() => setTab('moyennes')}>Moyennes</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {tab === 'moyennes' ? <MoyennesTab options={options} /> : (
        <>
          <div className="card">
            <div className="filters-grid">
              <div className="field">
                <label htmlFor="v-q">Titre</label>
                <input id="v-q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" />
              </div>
              <div className="field">
                <label htmlFor="v-type"><Tags size={16} /> Type</label>
                <select id="v-type" value={filters.type} onChange={setFilter('type')}>
                  <option value="">Tous</option>
                  {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="v-module"><BookOpen size={16} /> Module</label>
                <select id="v-module" value={filters.moduleId} onChange={setFilter('moduleId')}>
                  <option value="">Tous</option>
                  {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="v-prof"><Presentation size={16} /> Professeur</label>
                <select id="v-prof" value={filters.professeurId} onChange={setFilter('professeurId')}>
                  <option value="">Tous</option>
                  {options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="v-classe"><School size={16} /> Classe</label>
                <select id="v-classe" value={filters.classeId} onChange={setFilter('classeId')}>
                  <option value="">Toutes</option>
                  {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="v-filiere"><Layers size={16} /> Filière</label>
                <select id="v-filiere" value={filters.filiereId} onChange={setFilter('filiereId')}>
                  <option value="">Toutes</option>
                  {options.filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={18} /> Réinitialiser</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Évaluation</th><th>Module</th><th>Professeur</th><th>Public</th><th>Date</th><th>Rendus</th><th>Notes</th><th>Moyenne</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.items.length === 0 && <tr><td colSpan={9} className="empty">Aucune évaluation.</td></tr>}
                {data?.items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="badge badge-info">{labelOf(t)}</span>{' '}
                      <strong>{t.titre}</strong>{t.aFichier && <Paperclip size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />}
                    </td>
                    <td>{t.moduleCode}</td>
                    <td>{t.professeur}</td>
                    <td>{t.publicLabel}</td>
                    <td>{t.dateTravail ? formatDateFr(t.dateTravail) : '—'}</td>
                    <td>{t.nbRendus} / {t.nbEtudiants}</td>
                    <td>{t.nbNotes} / {t.nbEtudiants}</td>
                    <td>{fmt(t.moyenne)}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="icon-btn" title="Notes et rendus" aria-label="Notes et rendus" onClick={() => setNotesFor(t.id)}><ClipboardList size={18} /></button>
                        <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ item: t })}><Pencil size={18} /></button>
                        <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm(t)}><Trash2 size={18} /></button>
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
              <span className="muted">Page {data.page} / {data.pages} · {data.total} évaluation(s)</span>
              <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
            </div>
          )}
        </>
      )}

      {modal && <EvaluationModal item={modal.item} enseignements={enseignements} onClose={() => setModal(null)} onSaved={onSaved} />}

      {confirm && (
        <ConfirmDialog
          title="Supprimer cette évaluation ?" icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={`« ${confirm.titre} » sera supprimée avec ses ${confirm.nbRendus} rendu(s) et ses ${confirm.nbNotes} note(s). Cette action est définitive.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}