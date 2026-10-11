// frontend/src/components/users/BlockModal.jsx
import { useState } from 'react';
import { Ban, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';

export default function BlockModal({ user, onClose, onDone }) {
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/users/${user.id}/block`, { motif });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Bloquer ${user.prenom} ${user.nom}`} icon={Ban} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="block-form" className="btn btn-danger" disabled={saving || !motif.trim()}><Ban size={18} /> {saving ? 'Blocage…' : 'Bloquer le compte'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="block-form" onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="motif">Motif (affiché à l&apos;utilisateur)</label>
          <textarea id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={255} required />
        </div>
        <small className="hint">La session en cours sera fermée et toute connexion refusée avec le message « Compte bloqué ».</small>
      </form>
    </Modal>
  );
}