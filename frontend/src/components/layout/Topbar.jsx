// frontend/src/components/layout/Topbar.jsx
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import env from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABEL } from '../../utils/roles';
import { photoUrl, onPhotoError } from '../../utils/format';
import Logo from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from './NotificationBell';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/connexion', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="brand">
        <Logo size={36} />
        <span>{env.appName}</span>
      </div>
      <div className="row">
        <div className="user-chip">
          <img src={photoUrl(user.photo)} alt={`Photo de ${user.prenom}`} onError={onPhotoError} />
          <div className="who">
            <strong>{user.prenom} {user.nom}</strong>
            <br />
            <small>{ROLE_LABEL[user.role]}</small>
          </div>
        </div>
        <NotificationBell />
        <ThemeToggle />
        <button type="button" className="btn btn-ghost" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}