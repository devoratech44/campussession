// frontend/src/components/layout/TopNav.jsx
import { NavLink } from 'react-router-dom';

export default function TopNav({ items }) {
  return (
    <nav className="topnav" aria-label="Navigation">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}