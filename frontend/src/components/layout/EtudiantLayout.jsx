// frontend/src/components/layout/EtudiantLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import env from '../../config/env';
import { ETUDIANT_NAV } from '../../config/navigation';
import Logo from '../common/Logo';
import Sidebar from './Sidebar';
import Footer from './Footer';
import NotificationBell from './NotificationBell';

export default function EtudiantLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div data-space="tech" className="shell-side">
      <Sidebar items={ETUDIANT_NAV} open={open} onClose={() => setOpen(false)} />
      <div className="shell-content">
        <header className="mobile-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={22} /></button>
          <div className="brand"><Logo size={32} /><strong>{env.appName}</strong></div>
          <NotificationBell />
        </header>
        <div className="floating-bell"><NotificationBell /></div>
        <main className="app-main"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}