// frontend/src/pages/auth/Blocked.jsx
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react';
import env from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function Blocked() {
  const { blocked, clearBlocked } = useAuth();

  if (!blocked) return <Navigate to="/connexion" replace />;

  const subject = encodeURIComponent('Compte bloqué – demande de déblocage');

  return (
    <div className="auth-panel" style={{ minHeight: '100vh' }}>
      <div className="auth-toolbar"><ThemeToggle /></div>

      <section className="card auth-card rise" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Logo size={56} /></div>
        <div className="blocked-icon"><ShieldAlert size={36} /></div>
        <h2 style={{ margin: 0 }}>Compte bloqué</h2>
        <p className="muted" style={{ margin: 0 }}>
          {blocked.motif || 'Votre compte a été bloqué par l\'administration.'}
        </p>
        <p style={{ margin: 0 }}>
          Contactez l&apos;administrateur pour justifier vos absences et retards et demander le déblocage.
        </p>
        <a className="btn" href={`mailto:${env.contactEmail}?subject=${subject}`}>
          <Mail size={20} /> Contacter l&apos;administrateur
        </a>
        <Link className="btn btn-ghost" to="/connexion" onClick={clearBlocked}>
          <ArrowLeft size={18} /> Retour à la connexion
        </Link>
      </section>
    </div>
  );
}