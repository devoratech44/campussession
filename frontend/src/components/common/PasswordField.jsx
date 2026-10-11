// frontend/src/components/common/PasswordField.jsx
import { useState } from 'react';
import { Lock, Eye, EyeOff, Sparkles, Copy } from 'lucide-react';
import env from '../../config/env';
import { generatePassword } from '../../utils/password';
import { useToast } from '../../contexts/ToastContext';
import PasswordStrength from './PasswordStrength';

export default function PasswordField({
  id, label, value, onChange, meta, generator = false, strength = true, autoComplete = 'new-password',
}) {
  const toast = useToast();
  const [show, setShow] = useState(false);

  const generate = () => { onChange(generatePassword(env.passwordGenLength, meta?.password?.max)); setShow(true); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); toast.success('Mot de passe copié.'); }
    catch { toast.error('Copie impossible sur ce navigateur.'); }
  };

  return (
    <div className="field">
      <label htmlFor={id}><Lock size={16} /> {label}</label>
      <div className="pwd-row">
        <div className="input-icon has-trail">
          <Lock size={18} className="lead" />
          <input
            id={id} type={show ? 'text' : 'password'} value={value} autoComplete={autoComplete}
            maxLength={meta?.password?.max} onChange={(e) => onChange(e.target.value)} required
          />
          <button type="button" className="trail" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer' : 'Afficher'}>
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {generator && (
          <>
            <button type="button" className="icon-btn" onClick={generate} title="Générer un mot de passe" aria-label="Générer un mot de passe"><Sparkles size={20} /></button>
            <button type="button" className="icon-btn" onClick={copy} disabled={!value} title="Copier" aria-label="Copier le mot de passe"><Copy size={20} /></button>
          </>
        )}
      </div>
      {strength && <PasswordStrength value={value} rules={meta?.password} />}
    </div>
  );
}