// frontend/src/components/users/PasswordModal.jsx
import { useState } from 'react';
import { KeyRound, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';
import PasswordField from '../common/PasswordField';

export default function PasswordModal({ user, meta, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/users/${user.id}/password`, { motDePasse: password });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Nouveau mot de passe — ${user.prenom} ${user.nom}`} icon={KeyRound} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="pwd-form" className="btn" disabled={saving || !password}><Save size={18} /> {saving ? 'Enregistrement…' : 'Définir'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="pwd-form" onSubmit={onSubmit} className="stack">
        <PasswordField id="newPwd" label="Nouveau mot de passe" value={password} onChange={setPassword} meta={meta} generator />
        <small className="hint">Pensez à copier le mot de passe avant de valider, puis à le transmettre à l&apos;utilisateur.</small>
      </form>
    </Modal>
  );
}