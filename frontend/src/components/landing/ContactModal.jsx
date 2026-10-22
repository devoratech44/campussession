// frontend/src/components/landing/ContactModal.jsx
import { useEffect, useRef, useState } from 'react';
import { Mail, Copy, ExternalLink, X, Check } from 'lucide-react';
import landing from '../../config/landing';

const { adminEmail, mail } = landing;
const enc = encodeURIComponent;

export default function ContactModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mailto = `mailto:${adminEmail}?subject=${enc(mail.subject)}&body=${enc(mail.body)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(adminEmail)}&su=${enc(mail.subject)}&body=${enc(mail.body)}`;

  const copy = async () => {
    const text = `Objet : ${mail.subject}\r\n\r\n${mail.body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="lp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title" tabIndex={-1} ref={ref}>
        <button type="button" className="lp-modal__close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 id="lp-modal-title">Contacter l&apos;administrateur</h2>
        <p>Un e-mail pré-rempli vous permet de demander la création de votre compte. Choisissez l&apos;option qui convient à votre messagerie.</p>
        <div className="lp-modal__actions">
          <a className="lp-btn lp-btn--primary" href={mailto}><Mail size={18} /> Ouvrir mon application mail</a>
          <a className="lp-btn lp-btn--outline" href={gmail} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} /> Ouvrir Gmail</a>
          <button type="button" className="lp-btn lp-btn--outline" onClick={copy}>{copied ? <Check size={18} /> : <Copy size={18} />} Copier le modèle</button>
        </div>
        <p className="lp-modal__status" role="status" aria-live="polite">{copied ? 'Modèle copié' : ''}</p>
        <p className="lp-modal__note">Un lien mailto ne peut pas joindre de fichier : si vous avez une photo de profil (facultative, JPEG ou PNG, 2 Mo maximum), joignez-la manuellement à l&apos;e-mail.</p>
      </div>
    </div>
  );
}