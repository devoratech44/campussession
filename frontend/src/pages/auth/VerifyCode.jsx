// frontend/src/pages/auth/VerifyCode.jsx
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, MailCheck, RefreshCw, ArrowLeft, CircleAlert, CircleCheck, Timer } from 'lucide-react';
import env from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import useClock from '../../hooks/useClock';
import { errorMessage } from '../../utils/format';
import { peekRedirect } from '../../utils/redirect';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';

const LEN = env.codeLength;
const emptyDigits = () => Array(LEN).fill('');
const pad = (n) => String(n).padStart(2, '0');

export default function VerifyCode() {
  const { user, pending, verify, resend, clearPending } = useAuth();
  const navigate = useNavigate();
  const now = useClock();
  const [digits, setDigits] = useState(emptyDigits);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  if (user) return <Navigate to={peekRedirect(user.role)} replace />;
  if (!pending) return <Navigate to="/connexion" replace />;

  const expiresIn = Math.max(0, Math.ceil((pending.expiresAt - now.getTime()) / 1000));
  const resendIn = Math.max(0, Math.ceil((pending.resendAt - now.getTime()) / 1000));
  const expired = expiresIn === 0;

  const setAt = (i, v) => setDigits((prev) => { const next = [...prev]; next[i] = v; return next; });

  const onChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    setAt(i, v);
    if (v && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  // Collage automatique du code complet
  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: LEN }, (_, k) => text[k] || ''));
    refs.current[Math.min(text.length, LEN - 1)]?.focus();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < LEN) return setError(`Saisissez les ${LEN} chiffres du code.`);
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const result = await verify(code);
      if (result.blocked) navigate('/bloque', { replace: true });
      else navigate(peekRedirect(result.user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setDigits(emptyDigits());
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError('');
    setInfo('');
    try {
      await resend();
      setDigits(emptyDigits());
      refs.current[0]?.focus();
      setInfo('Un nouveau code vient d\'être envoyé.');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onBack = () => {
    clearPending();
    navigate('/connexion', { replace: true });
  };

  return (
    <div className="auth-panel" style={{ minHeight: '100vh' }}>
      <div className="auth-toolbar"><ThemeToggle /></div>

      <form className="card auth-card rise" onSubmit={onSubmit} noValidate>
        <div className="auth-brand-mobile" style={{ display: 'flex' }}>
          <Logo size={48} />
          <strong style={{ fontSize: '1.25rem' }}>{env.appName}</strong>
        </div>

        <div>
          <h2 className="auth-title"><ShieldCheck size={24} /> Vérification</h2>
          <p className="muted" style={{ margin: 0 }}>
            <MailCheck size={16} style={{ verticalAlign: 'text-bottom' }} /> Un code à {LEN} chiffres a été envoyé à{' '}
            <strong>{pending.emailMasque}</strong>.
          </p>
        </div>

        {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
        {info && <div className="alert alert-success" role="status"><CircleCheck size={18} />{info}</div>}
        {expired && !error && <div className="alert alert-error"><Timer size={18} />Ce code a expiré. Demandez-en un nouveau.</div>}

        <div className="code-inputs" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1} value={d} aria-label={`Chiffre ${i + 1}`}
              onChange={(e) => onChange(i, e)} onKeyDown={(e) => onKeyDown(i, e)}
            />
          ))}
        </div>

        {!expired && (
          <div className="countdown muted"><Timer size={16} style={{ verticalAlign: 'text-bottom' }} /> Expire dans {pad(Math.floor(expiresIn / 60))}:{pad(expiresIn % 60)}</div>
        )}

        <button type="submit" className="btn" disabled={loading || expired}>
          <ShieldCheck size={20} /> {loading ? 'Vérification…' : 'Valider le code'}
        </button>

        <button type="button" className="btn btn-ghost" onClick={onResend} disabled={resendIn > 0}>
          <RefreshCw size={18} /> {resendIn > 0 ? `Renvoyer le code (${resendIn} s)` : 'Renvoyer le code'}
        </button>

        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={18} /> Retour à la connexion
        </button>
      </form>
    </div>
  );
}