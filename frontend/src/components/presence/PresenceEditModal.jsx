// frontend/src/components/presence/PresenceEditModal.jsx
import { useState } from 'react';
import { ClipboardCheck, Timer, ShieldCheck, FileText, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { PRESENCE_STATUS } from '../../utils/presence';
import Modal from '../common/Modal';

export default function PresenceEditModal({ seanceId, student, initial, retardMax, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    statut: initial.statut,
    minutesRetard: initial.minutesRetard || (initial.statut === 'retard' ? 1 : 0),
    justifie: Boolean(initial.justifie),
    motifJustification: initial.motifJustification || '',
    remarque: initial.remarque || '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/presences/seances/${seanceId}/etudiants/${student.id}`, form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`${student.prenom} ${student.nom}`} icon={ClipboardCheck} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="presence-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="presence-form" onSubmit={onSubmit} className="stack">
        <div className="seg" role="group" aria-label="Statut">
          {Object.entries(PRESENCE_STATUS).map(([key, st]) => (
            <button key={key} type="button" className={form.statut === key ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, statut: key }))}>{st.label}</button>
          ))}
        </div>

        {form.statut === 'retard' && (
          <div className="field">
            <label htmlFor="pe-min"><Timer size={16} /> Minutes de retard</label>
            <input id="pe-min" type="number" min="1" max={retardMax} value={form.minutesRetard} onChange={set('minutesRetard')} required />
          </div>
        )}

        {form.statut !== 'present' && (
          <>
            <label className="check">
              <input type="checkbox" checked={form.justifie} onChange={(e) => setForm((f) => ({ ...f, justifie: e.target.checked }))} />
              <ShieldCheck size={18} /> Justifié
            </label>
            {form.justifie && (
              <div className="field">
                <label htmlFor="pe-motif"><FileText size={16} /> Motif de justification</label>
                <input id="pe-motif" value={form.motifJustification} onChange={set('motifJustification')} maxLength={255} />
              </div>
            )}
          </>
        )}

        <div className="field">
          <label htmlFor="pe-rem"><FileText size={16} /> Remarque (facultative)</label>
          <input id="pe-rem" value={form.remarque} onChange={set('remarque')} maxLength={255} />
        </div>
        <small className="hint">Un retard ou une absence est non justifié par défaut. Seuls les non justifiés comptent pour le blocage automatique.</small>
      </form>
    </Modal>
  );
}