// frontend/src/pages/auth/Login.jsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, User, Lock, Server, CircleAlert, Info, Compass, BookOpen, TrendingUp, UserPlus } from 'lucide-react';
import env from '../../config/env';
import ContactModal from '../../components/landing/ContactModal';
import '../../styles/landing.css';
import { useAuth } from '../../contexts/AuthContext';
import useServerStatus from '../../hooks/useServerStatus';
import { errorMessage } from '../../utils/format';
import { homeForRole } from '../../utils/roles';
import { peekRedirect } from '../../utils/redirect';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';
import Clock from '../../components/common/Clock';

const STATUS_LABEL = { checking: 'Vérification du serveur…', online: 'Serveur connecté', offline: 'Serveur injoignable' };
const STATUS_DOT = { checking: '', online: 'ok', offline: 'ko' };
const MOTTO_ICONS = [Compass, BookOpen, TrendingUp];

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Login() {
  const { user, login, notice } = useAuth();
  const navigate = useNavigate();
  const status = useServerStatus();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(false);

  const mottoWords = (env.motto || '').split(/\s*[–—-]\s*/).filter(Boolean);

  if (user) return <Navigate to={peekRedirect(user.role)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(identifiant.trim(), motDePasse);
      if (result.blocked) navigate('/bloque');
      else if (result.requiresVerification) navigate('/verification');
      else navigate(peekRedirect(result.user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-hero">
<span className="blob b1" /><span className="blob b2" />
        <Logo size={84} />
        <h1>{env.appName}</h1>
        <p>La plateforme de gestion pédagogique et de suivi individualisé des étudiants.</p>
        <ul className="auth-motto">
          {mottoWords.map((word, i) => {
            const Icon = MOTTO_ICONS[i % MOTTO_ICONS.length];
            return (
              <li key={word}><Icon size={24} />{capitalize(word)}</li>
            );
          })}
        </ul>
      </aside>

      <main className="auth-panel">
        <div className="auth-toolbar"><ThemeToggle /></div>

        <form className="card auth-card rise" onSubmit={onSubmit} noValidate>
          <div className="auth-brand-mobile">
            <Logo size={48} />
            <strong style={{ fontSize: '1.25rem' }}>{env.appName}</strong>
          </div>

          <div>
            <h2 className="auth-title"><LogIn size={24} /> Connexion</h2>
            <p className="muted" style={{ margin: 0 }}>Accédez à votre espace personnel.</p>
          </div>

          {notice && <div className="alert alert-info" role="status"><Info size={18} />{notice}</div>}
          {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

          <div className="field">
            <label htmlFor="identifiant"><User size={16} /> Email ou matricule</label>
            <div className="input-icon">
              <User size={18} className="lead" />
              <input
                id="identifiant" type="text" autoComplete="username" autoCapitalize="none"
                value={identifiant} onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="Email ou matricule" required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="motDePasse"><Lock size={16} /> Mot de passe</label>
            <div className="input-icon has-trail">
              <Lock size={18} className="lead" />
              <input
                id="motDePasse" type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Votre mot de passe" required
              />
              <button type="button" className="trail" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading || !identifiant || !motDePasse}>
            <LogIn size={20} /> {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-contact">
          Vous n&apos;avez pas de compte ?{' '}
          <button type="button" className="contact-link" onClick={() => setContact(true)}><UserPlus size={18} /> Contactez l&apos;administrateur</button>
        </p>

        <div className="auth-meta">
          <span className="row" style={{ gap: '0.5rem', justifyContent: 'center' }}>
            <Server size={16} />
            <span className={`status-dot ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          <Clock />
          <span>{env.copyright}</span>
          <span>
            Conçu par <a href={env.authorUrl} target="_blank" rel="noopener noreferrer">{env.authorName}</a>
          </span>
        </div>
      </main>
      {contact && <div className="lp"><ContactModal onClose={() => setContact(false)} /></div>}
    </div>
  );
}