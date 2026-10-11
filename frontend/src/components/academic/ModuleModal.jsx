// frontend/src/components/academic/ModuleModal.jsx
import { useState } from 'react';
import { BookOpen, Hash, FileText, Scale, Clock, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';

export default function ModuleModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    code: item?.code || '',
    nom: item?.nom || '',
    description: item?.description || '',
    coefficient: item?.coefficient ?? 1,
    volumeHoraire: item?.volumeHoraire ?? 0,
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = item ? await api.put(`/modules/${item.id}`, form) : await api.post('/modules', form);
      onSaved(data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Modifier ${item.code}` : 'Nouveau module'} icon={BookOpen} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="module-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="module-form" onSubmit={onSubmit} className="form-grid cols-2">
        <div className="field">
          <label htmlFor="m-code"><Hash size={16} /> Code (unique)</label>
          <input id="m-code" value={form.code} onChange={set('code')} required maxLength={30} autoCapitalize="characters" />
        </div>
        <div className="field">
          <label htmlFor="m-nom"><BookOpen size={16} /> Nom du module</label>
          <input id="m-nom" value={form.nom} onChange={set('nom')} required maxLength={150} />
        </div>
        <div className="field">
          <label htmlFor="m-coef"><Scale size={16} /> Coefficient (0 à 20)</label>
          <input id="m-coef" type="number" min="0" max="20" step="0.5" value={form.coefficient} onChange={set('coefficient')} required />
        </div>
        <div className="field">
          <label htmlFor="m-vol"><Clock size={16} /> Volume horaire (heures)</label>
          <input id="m-vol" type="number" min="0" step="1" value={form.volumeHoraire} onChange={set('volumeHoraire')} />
        </div>
        <div className="field span-2">
          <label htmlFor="m-desc"><FileText size={16} /> Description (facultative)</label>
          <textarea id="m-desc" value={form.description} onChange={set('description')} />
        </div>
      </form>
    </Modal>
  );
}