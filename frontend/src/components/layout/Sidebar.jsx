// frontend/src/components/layout/Sidebar.jsx
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { LogOut, X } from 'lucide-react';
import env from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABEL } from '../../utils/roles';
import { photoUrl, onPhotoError } from '../../utils/format';
import Logo from '../common/Logo';
import ThemeToggle from '../common/ThemeToggle';

export default function Sidebar({ items, open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({});

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/badges').then((r) => { if (alive) setBadges(r.data.data); }).catch(() => {});
    load();
    const timer = setInterval(load, Number(import.meta.env.VITE_NOTIF_REFRESH_MS) || 15000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/connexion', { replace: true });
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo size={42} />
          <div>
            <strong>{env.appName}</strong>
            <small>{env.motto}</small>
          </div>
          <button type="button" className="btn btn-ghost sidebar-close" onClick={onClose} aria-label="Fermer le menu"><X size={20} /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          {items.map(({ to, label, icon: Icon, end, soon, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
              {soon && <em className="soon">Bientôt</em>}
              {badge && badges[badge] > 0 && <span className="nav-badge" aria-label={`${badges[badge]} en attente`}>{badges[badge] > 99 ? '99+' : badges[badge]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <img src={photoUrl(user.photo)} alt={`Photo de ${user.prenom}`} onError={onPhotoError} />
            <div className="who">
              <strong>{user.prenom} {user.nom}</strong>
              <br />
              <small>{ROLE_LABEL[user.role]}</small>
            </div>
          </div>
          <div className="sidebar-actions">
            <ThemeToggle />
            <button type="button" className="btn btn-ghost" onClick={onLogout}><LogOut size={18} /> Déconnexion</button>
          </div>
        </div>
      </aside>
    </>
  );
}