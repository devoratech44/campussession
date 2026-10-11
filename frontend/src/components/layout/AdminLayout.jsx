// frontend/src/components/layout/AdminLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import env from '../../config/env';
import { ADMIN_NAV } from '../../config/navigation';
import Logo from '../common/Logo';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div data-space="admin" className="shell-side">
      <Sidebar items={ADMIN_NAV} open={open} onClose={() => setOpen(false)} />
      <div className="shell-content">
        <header className="mobile-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={22} /></button>
          <div className="brand"><Logo size={32} /><strong>{env.appName}</strong></div>
          <span style={{ width: 'var(--tap)' }} />
        </header>
        <main className="app-main"><Outlet /></main>
        <Footer />
      </div>
    </div>
  );
}