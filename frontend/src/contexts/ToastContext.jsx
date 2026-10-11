// frontend/src/contexts/ToastContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import env from '../config/env';

const ToastContext = createContext(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), env.toastMs);
  }, []);

  const value = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return <div key={t.id} className={`toast ${t.type}`} role="status"><Icon size={20} />{t.message}</div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);