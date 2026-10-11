// frontend/src/components/common/ThemeToggle.jsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={toggleTheme}
      aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}