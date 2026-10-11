// frontend/src/pages/admin/ClassesFilieres.jsx
import { useCallback, useEffect, useState } from 'react';
import { School, Layers, Plus, Pencil, Trash2, DoorOpen, CalendarRange, GraduationCap, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ClasseModal, FiliereModal } from '../../components/structure/StructureModals';

export default function ClassesFilieres() {
  const meta = useMeta();
  const toast = useToast();
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);     // { kind, item }
  const [confirm, setConfirm] = useState(null); // { kind, item }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, f] = await Promise.all([api.get('/classes'), api.get('/filieres')]);
      setClasses(c.data.data);
      setFilieres(f.data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!meta || loading) return <Loader />;

  const onSaved = () => {
    const created = !modal.item;
    const label = modal.kind === 'classe' ? 'Classe' : 'Filière';
    setModal(null);
    toast.success(`${label} ${created ? 'créée' : 'modifiée'}.`);
    load();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/${confirm.kind === 'classe' ? 'classes' : 'filieres'}/${confirm.item.id}`);
      toast.success(`${confirm.kind === 'classe' ? 'Classe' : 'Filière'} supprimée.`);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const isClasses = tab === 'classes';

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><School size={24} /></span> Classes et filières</h1>
        <button type="button" className="btn" onClick={() => setModal({ kind: isClasses ? 'classe' : 'filiere', item: null })}>
          <Plus size={20} /> {isClasses ? 'Nouvelle classe' : 'Nouvelle filière'}
        </button>
      </div>

      <div className="seg" role="tablist" style={{ maxWidth: 420 }}>
        <button type="button" role="tab" aria-selected={isClasses} className={isClasses ? 'on' : ''} onClick={() => setTab('classes')}><School size={18} /> Classes ({classes.length})</button>
        <button type="button" role="tab" aria-selected={!isClasses} className={!isClasses ? 'on' : ''} onClick={() => setTab('filieres')}><Layers size={18} /> Filières ({filieres.length})</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {isClasses ? (
        <div className="grid">
          {classes.length === 0 && <div className="card empty">Aucune classe.</div>}
          {classes.map((c) => (
            <article key={c.id} className="card card-hover class-card">
              <h3><School size={20} /> {c.nom}</h3>
              <div className="meta">
                <span><DoorOpen size={16} /> {c.salle || 'Salle non définie'}</span>
                <span><CalendarRange size={16} /> {c.anneeAcademique}</span>
              </div>
              <div className="badges">
                {c.filieres.map((f) => <span key={f.id} className="badge badge-info">{f.nom}</span>)}
              </div>
              <div className="foot">
                <span><span className="count text-gradient">{c.nbEtudiants}</span> <span className="muted"><GraduationCap size={16} style={{ verticalAlign: 'text-bottom' }} /> étudiant(s)</span></span>
                <div className="actions">
                  <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ kind: 'classe', item: c })}><Pencil size={18} /></button>
                  <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ kind: 'classe', item: c })}><Trash2 size={18} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid">
          {filieres.length === 0 && <div className="card empty">Aucune filière.</div>}
          {filieres.map((f) => (
            <article key={f.id} className="card card-hover class-card">
              <h3><Layers size={20} /> {f.nom}</h3>
              <div className="meta"><span className="badge badge-info">{f.niveau}</span></div>
              {f.description && <p className="muted" style={{ margin: 0 }}>{f.description}</p>}
              <div className="badges">
                {f.classes.map((c) => <span key={c.id} className="badge">{c.nom}</span>)}
              </div>
              <div className="foot">
                <span><span className="count text-gradient">{f.nbEtudiants}</span> <span className="muted"><GraduationCap size={16} style={{ verticalAlign: 'text-bottom' }} /> étudiant(s)</span></span>
                <div className="actions">
                  <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ kind: 'filiere', item: f })}><Pencil size={18} /></button>
                  <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ kind: 'filiere', item: f })}><Trash2 size={18} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal?.kind === 'classe' && <ClasseModal item={modal.item} filieres={filieres} meta={meta} onClose={() => setModal(null)} onSaved={onSaved} />}
      {modal?.kind === 'filiere' && <FiliereModal item={modal.item} meta={meta} onClose={() => setModal(null)} onSaved={onSaved} />}

      {confirm && (
        <ConfirmDialog
          title={`Supprimer ${confirm.item.nom} ?`}
          icon={Trash2}
          danger
          confirmLabel="Supprimer"
          busy={busy}
          message={confirm.kind === 'classe'
            ? `Les ${confirm.item.nbEtudiants} étudiant(s) de la classe seront détachés. Ses groupes et assignations de modules seront supprimés.`
            : `Les ${confirm.item.nbEtudiants} étudiant(s) de la filière n'auront plus de filière. Les assignations de modules visant cette filière seront supprimées.`}
          onConfirm={onDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}