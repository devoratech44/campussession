// frontend/src/components/layout/NotificationBell.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../../api/axios';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import '../../styles/notification.css';

const REFRESH_MS = Number(import.meta.env.VITE_NOTIF_REFRESH_MS) || 15000;
const LIMIT = Number(import.meta.env.VITE_NOTIF_BELL_LIMIT) || 10;

const TYPES = {
  information: 'Information', devoir: 'Devoir', examen: 'Examen', notes: 'Notes',
  presences: 'Présences', emploi_du_temps: 'Emploi du temps', systeme: 'Système',
};

const when = (iso) => (iso
  ? `${new Date(iso).toLocaleString('fr-FR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' })} ${TIMEZONE_LABEL}`
  : '');

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const box = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/mine', { params: { limit: LIMIT } });
      setItems(data.data.items);
      setUnread(data.data.unread);
    } catch {
      /* silencieux : la cloche ne doit jamais bloquer la page */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const readOne = async (n) => {
    if (n.estLue) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, estLue: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.put(`/notifications/${n.id}/read`); } catch { load(); }
  };

  const readAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, estLue: true })));
    setUnread(0);
    try { await api.put('/notifications/read-all'); } catch { load(); }
  };

  return (
    <div className="notif" ref={box}>
      <button
        type="button" className="icon-btn notif__btn" aria-label={`Notifications${unread ? `, ${unread} non lue(s)` : ''}`}
        aria-expanded={open} onClick={() => { setOpen((o) => !o); if (!open) load(); }}
      >
        <Bell size={20} />
        {unread > 0 && <span className="notif__badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <div className="notif__head">
            <strong>Notifications</strong>
            <button type="button" className="notif__all" onClick={readAll} disabled={unread === 0}><CheckCheck size={16} /> Tout marquer comme lu</button>
          </div>

          <ul className="notif__list">
            {items.length === 0 && <li className="notif__empty">Aucune notification.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" className={`notif__item ${n.estLue ? '' : 'unread'}`} onClick={() => readOne(n)}>
                  <span className="notif__type">{TYPES[n.type] || n.type}</span>
                  <strong>{n.titre}</strong>
                  <span className="notif__msg">{n.message}</span>
                  <small>{when(n.createdAt)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}