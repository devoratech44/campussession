// frontend/src/components/common/ConfirmDialog.jsx
import { CircleAlert } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', danger = false, busy = false, onConfirm, onCancel, icon }) {
  return (
    <Modal
      title={title}
      icon={icon || CircleAlert}
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Annuler</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Patientez…' : confirmLabel}
          </button>
        </>
      )}
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}