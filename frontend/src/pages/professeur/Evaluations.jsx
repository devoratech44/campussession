// frontend/src/pages/professeur/Evaluations.jsx
import { useCallback, useEffect, useState } from 'react';
import { NotebookPen, Plus, Pencil, Trash2, ClipboardList, Paperclip, CircleAlert, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EvaluationModal from '../../components/evaluations/EvaluationModal';
import NotesPanel from '../../components/evaluations/NotesPanel';
import '../../styles/evaluations.css';
import '../../styles/etudiant.css';

const BASE = '/professeur/evaluations';
const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };
const EMPTY = { type: '', moduleId: '' };
const labelOf = (t) => (t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE[t.type]);
const fmt = (n) => (n === null ? '—' : String(n).replace('.', ','));

export default function Evaluations() {
  const toast = useToast();
  const [cours, setCours] = useState(null);
  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [notesFor, setNotesFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/professeur/cours'), api.get('/professeur/options')])
      .then(([c, o]) => { setCours(c.data.data); setOptions(o.data.data); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(BASE, { params: { page, type: filters.type || undefined, moduleId: filters.moduleId || undefined } });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  if (!cours || !options || !data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  if (notesFor) {
    return <NotesPanel travailId={notesFor} base={BASE} lockExisting={!options.canEditNotes} onBack={() => setNotesFor(null)} onChanged={load} />;
  }

  const set = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`${BASE}/${confirm.id}`);
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
        <button type="button" className="btn" disabled={cours.length === 0} onClick={() => setModal({ item: null })}><Plus size={20} /> Nouvelle évaluation</button>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="pe-type">Type</label>
            <select id="pe-type" value={filters.type} onChange={set('type')}>
              <option value="">Tous</option>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pe-module">Module</label>
            <select id="pe-module" value={filters.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Évaluation</th><th>Module</th><th>Public</th><th>Date</th><th>Rendus</th><th>Notes</th><th>Moyenne</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={8} className="empty">Aucune évaluation.</td></tr>}
            {data.items.map((t) => (
              <tr key={t.id}>
                <td><span className="badge badge-info">{labelOf(t)}</span> <strong>{t.titre}</strong>{t.aFichier && <Paperclip size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />}</td>
                <td>{t.moduleCode}</td>
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

      {data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} évaluation(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}
      <small className="hint">{options.canEditNotes ? 'Vous pouvez corriger vos notes.' : 'Une note saisie est définitive pour vous : seul l’administrateur peut la corriger.'}</small>

      {modal && (
        <EvaluationModal
          item={modal.item} enseignements={cours} base={BASE}
          onClose={() => setModal(null)}
          onSaved={(wasEdit) => { toast.success(wasEdit ? 'Évaluation modifiée.' : 'Évaluation créée : les étudiants sont notifiés.'); setModal(null); load(); }}
        />
      )}

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