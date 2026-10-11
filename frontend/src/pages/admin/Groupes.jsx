// frontend/src/pages/admin/Groupes.jsx
import { useCallback, useEffect, useState } from 'react';
import { UsersRound, Plus, Pencil, Trash2, School, Layers, GraduationCap, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import GroupeModal from '../../components/academic/GroupeModal';

export default function Groupes() {
  const toast = useToast();
  const [groupes, setGroupes] = useState([]);
  const [classes, setClasses] = useState(null);
  const [classeId, setClasseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);     // { item }
  const [confirm, setConfirm] = useState(null); // groupe
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/groupes', { params: { classeId: classeId || undefined } });
      setGroupes(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [classeId]);

  useEffect(() => { load(); }, [load]);

  if (!classes) return <Loader />;

  const onSaved = () => {
    toast.success(modal.item ? 'Groupe modifié.' : 'Groupe créé.');
    setModal(null);
    load();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/groupes/${confirm.id}`);
      toast.success('Groupe supprimé.');
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><UsersRound size={24} /></span> Groupes</h1>
        <button type="button" className="btn" onClick={() => setModal({ item: null })}><Plus size={20} /> Nouveau groupe</button>
      </div>

      <div className="card" style={{ maxWidth: 360 }}>
        <div className="field">
          <label htmlFor="f-classe"><School size={16} /> Filtrer par classe</label>
          <select id="f-classe" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            <option value="">Toutes les classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {loading ? <Loader /> : (
        <div className="grid">
          {groupes.length === 0 && <div className="card empty">Aucun groupe.</div>}
          {groupes.map((g) => (
            <article key={g.id} className="card card-hover class-card">
              <h3><UsersRound size={20} /> {g.nom}</h3>
              {g.description && <p className="muted" style={{ margin: 0 }}>{g.description}</p>}
              <div className="badges">
                <span className="badge badge-info"><School size={12} /> {g.classe?.nom}</span>
                {g.filiere && <span className="badge"><Layers size={12} /> {g.filiere.nom}</span>}
              </div>
              <div className="foot">
                <span><span className="count text-gradient">{g.nbMembres}</span> <span className="muted"><GraduationCap size={16} style={{ verticalAlign: 'text-bottom' }} /> membre(s)</span></span>
                <div className="actions">
                  <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModal({ item: g })}><Pencil size={18} /></button>
                  <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm(g)}><Trash2 size={18} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && <GroupeModal item={modal.item} classes={classes} onClose={() => setModal(null)} onSaved={onSaved} />}

      {confirm && (
        <ConfirmDialog
          title={`Supprimer ${confirm.nom} ?`} icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={`Le groupe et ses ${confirm.nbMembres} appartenance(s) seront supprimés, ainsi que les assignations de modules qui lui sont rattachées. Les étudiants ne sont pas supprimés.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}