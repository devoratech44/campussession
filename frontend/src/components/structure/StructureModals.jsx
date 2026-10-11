// frontend/src/components/structure/StructureModals.jsx
import { useState } from 'react';
import { School, Layers, Save, CircleAlert, DoorOpen, CalendarRange, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';

function useSubmit(action, onSaved) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await action();
      onSaved(data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return { error, setError, saving, submit };
}

export function ClasseModal({ item, filieres, meta, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    nom: item?.nom || '',
    salle: item?.salle || '',
    anneeAcademique: item?.anneeAcademique || meta.academicYear,
    filiereIds: item ? item.filieres.map((f) => f.id) : [],
  }));

  const { error, setError, saving, submit } = useSubmit(
    () => (item ? api.put(`/classes/${item.id}`, form) : api.post('/classes', form)),
    onSaved
  );

  const toggle = (id) => setForm((f) => ({
    ...f,
    filiereIds: f.filiereIds.includes(id) ? f.filiereIds.filter((x) => x !== id) : [...f.filiereIds, id],
  }));

  const onSubmit = (e) => {
    if (!form.filiereIds.length) { e.preventDefault(); setError('Choisissez au moins une filière.'); return; }
    submit(e);
  };

  return (
    <Modal
      title={item ? `Modifier ${item.nom}` : 'Nouvelle classe'} icon={School} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="classe-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="classe-form" onSubmit={onSubmit} className="stack">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="c-nom"><School size={16} /> Nom de la classe</label>
            <input id="c-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="c-salle"><DoorOpen size={16} /> Salle</label>
            <input id="c-salle" value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })} maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="c-annee"><CalendarRange size={16} /> Année académique</label>
            <input id="c-annee" value={form.anneeAcademique} onChange={(e) => setForm({ ...form, anneeAcademique: e.target.value })} maxLength={20} />
          </div>
        </div>

        <div className="field">
          <label><BookOpen size={16} /> Filières regroupées dans cette classe</label>
          <div className="check-list">
            {filieres.map((f) => (
              <label key={f.id} className="check-item">
                <input type="checkbox" checked={form.filiereIds.includes(f.id)} onChange={() => toggle(f.id)} />
                {f.nom}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function FiliereModal({ item, meta, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    nom: item?.nom || '',
    niveau: item?.niveau || meta.niveaux[0],
    description: item?.description || '',
  }));

  const { error, saving, submit } = useSubmit(
    () => (item ? api.put(`/filieres/${item.id}`, form) : api.post('/filieres', form)),
    onSaved
  );

  return (
    <Modal
      title={item ? `Modifier ${item.nom}` : 'Nouvelle filière'} icon={Layers} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="filiere-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="filiere-form" onSubmit={submit} className="form-grid">
        <div className="field">
          <label htmlFor="f-nom"><BookOpen size={16} /> Nom de la filière</label>
          <input id="f-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="f-niveau"><Layers size={16} /> Niveau</label>
          <select id="f-niveau" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} required>
            {meta.niveaux.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-desc">Description (facultative)</label>
          <input id="f-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={255} />
        </div>
      </form>
    </Modal>
  );
}