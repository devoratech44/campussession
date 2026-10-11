// frontend/src/components/presence/SeanceFormModal.jsx
import { useEffect, useState } from 'react';
import { CalendarPlus, BookOpen, CalendarDays, Clock, DoorOpen, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { todayStr } from '../../utils/presence';
import Modal from '../common/Modal';

export default function SeanceFormModal({ item, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(() => ({
    enseignementId: item ? String(item.enseignementId) : '',
    date: item?.date || todayStr(),
    heureDebut: item?.heureDebut || '',
    heureFin: item?.heureFin || '',
    salle: item?.salle || '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    api.get('/enseignements').then((res) => setList(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, [isEdit]);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, enseignementId: Number(form.enseignementId) };
      if (isEdit) await api.put(`/presences/seances/${item.id}`, payload);
      else await api.post('/presences/seances', payload);
      onSaved(isEdit);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Modifier la séance' : 'Nouvelle séance'} icon={CalendarPlus} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="seance-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="seance-form" onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="sf-ens"><BookOpen size={16} /> Enseignement</label>
          {isEdit ? (
            <input id="sf-ens" readOnly value={`${item.enseignement.module.code} · ${item.enseignement.professeur.prenom} ${item.enseignement.professeur.nom} · ${item.enseignement.publicLabel}`} />
          ) : (
            <select id="sf-ens" value={form.enseignementId} onChange={set('enseignementId')} required>
              <option value="">Choisir…</option>
              {list.map((x) => <option key={x.id} value={x.id}>{x.module.code} · {x.professeur.prenom} {x.professeur.nom} · {x.publicLabel}</option>)}
            </select>
          )}
        </div>
        <div className="form-grid cols-2">
          <div className="field"><label htmlFor="sf-date"><CalendarDays size={16} /> Date</label><input id="sf-date" type="date" value={form.date} onChange={set('date')} required /></div>
          <div className="field"><label htmlFor="sf-salle"><DoorOpen size={16} /> Salle</label><input id="sf-salle" value={form.salle} onChange={set('salle')} maxLength={100} /></div>
          <div className="field"><label htmlFor="sf-debut"><Clock size={16} /> Début</label><input id="sf-debut" type="time" value={form.heureDebut} onChange={set('heureDebut')} required /></div>
          <div className="field"><label htmlFor="sf-fin"><Clock size={16} /> Fin</label><input id="sf-fin" type="time" value={form.heureFin} onChange={set('heureFin')} required /></div>
        </div>
        <small className="hint">Les séances de l&apos;emploi du temps sont créées automatiquement chaque jour. Utilisez ceci pour une séance exceptionnelle ou un rattrapage.</small>
      </form>
    </Modal>
  );
}