// frontend/src/components/common/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Rendue seulement quand elle est ouverte (le parent l'affiche conditionnellement)
export default function Modal({ title, icon: Icon, onClose, children, footer, wide = false, busy = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, busy]);

  // Dans l'espace courant, pour hériter du thème (admin ou tech)
  const host = document.querySelector('[data-space]') || document.body;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{Icon && <Icon size={22} />}{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Fermer"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    host
  );
}