// frontend/src/components/messagerie/MessagerieView.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquarePlus, Send, Trash2, UsersRound, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage, photoUrl } from '../../utils/format';
import { ROLE_LABEL } from '../../utils/roles';
import { TIMEZONE, timeOf } from '../../utils/presence';
import ConfirmDialog from '../common/ConfirmDialog';
import Loader from '../common/Loader';
import NewConversationModal from './NewConversationModal';
import '../../styles/messagerie.css';

const THREAD_MS = Number(import.meta.env.VITE_MSG_REFRESH_MS) || 4000;
const LIST_MS = Number(import.meta.env.VITE_MSG_LIST_REFRESH_MS) || 10000;
const MAX = Number(import.meta.env.VITE_MSG_MAX_LENGTH) || 2000;

const dayKey = (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: TIMEZONE });
const shortWhen = (iso) => (!iso ? '' : (dayKey(iso) === dayKey(new Date().toISOString()) ? timeOf(iso) : dayKey(iso).slice(0, 5)));

function Avatar({ conv }) {
  return conv.type === 'groupe' || !conv.photo
    ? <span className="msg__avatar">{conv.type === 'groupe' ? <UsersRound size={20} /> : conv.titre.charAt(0)}</span>
    : <img className="msg__avatar" src={photoUrl(conv.photo)} alt="" />;
}

export default function MessagerieView({ canGroup = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [convs, setConvs] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);
  const lastId = useRef(0);
  const activeRef = useRef(null);

  const loadConvs = useCallback(async () => {
    try {
      const { data } = await api.get('/messagerie/conversations');
      setConvs(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadConvs();
    const timer = setInterval(loadConvs, LIST_MS);
    return () => clearInterval(timer);
  }, [loadConvs]);

  useEffect(() => { activeRef.current = activeId; }, [activeId]);

  const fetchThread = useCallback(async (id) => {
    try {
      const params = lastId.current ? { after: lastId.current } : {};
      const { data } = await api.get(`/messagerie/conversations/${id}/messages`, { params });
      if (activeRef.current !== id) return;
      const items = data.data.items;
      const first = !lastId.current;
      if (first) setMsgs(items);
      else if (items.length) setMsgs((m) => [...m, ...items]);
      if (items.length) lastId.current = items[items.length - 1].id;
      if (first || items.length) loadConvs();
    } catch {
      /* silencieux : le prochain passage réessaie */
    }
  }, [loadConvs]);

  useEffect(() => {
    lastId.current = 0;
    setMsgs([]);
    if (!activeId) return undefined;
    fetchThread(activeId);
    const timer = setInterval(() => fetchThread(activeId), THREAD_MS);
    return () => clearInterval(timer);
  }, [activeId, fetchThread]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, activeId]);

  const send = async (e) => {
    e?.preventDefault();
    const contenu = text.trim();
    if (!contenu || sending || !activeId) return;
    setSending(true);
    try {
      await api.post(`/messagerie/conversations/${activeId}/messages`, { contenu });
      setText('');
      await fetchThread(activeId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/messagerie/conversations/${activeId}`);
      toast.success('Conversation supprimée.');
      setConfirm(false);
      setActiveId(null);
      loadConvs();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCreated = async (id) => {
    setShowNew(false);
    await loadConvs();
    setActiveId(id);
  };

  const active = convs?.find((c) => c.id === activeId);
  let lastDay = '';

  return (
    <>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className={`msg ${activeId ? 'msg--thread' : ''}`}>
        <aside className="msg__list">
          <div className="msg__listhead">
            <strong>Conversations</strong>
            <button type="button" className="btn" onClick={() => setShowNew(true)}><MessageSquarePlus size={18} /> Nouveau</button>
          </div>
          {!convs ? <Loader /> : (
            <ul className="msg__items">
              {convs.length === 0 && <li className="empty" style={{ padding: '1.2rem' }}>Aucune conversation.</li>}
              {convs.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`msg__conv ${c.id === activeId ? 'on' : ''}`} onClick={() => setActiveId(c.id)}>
                    <Avatar conv={c} />
                    <span className="msg__meta">
                      <strong>{c.titre}</strong>
                      <span>{c.dernier ? `${c.dernierPar === user.id ? 'Vous : ' : ''}${c.dernier}` : 'Aucun message'}</span>
                    </span>
                    <span className="msg__side">
                      {shortWhen(c.dernierAt)}
                      {c.nonLus > 0 && <span className="msg__unread">{c.nonLus}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="msg__thread">
          {!active ? <div className="empty msg__placeholder">Sélectionnez une conversation ou créez-en une.</div> : (
            <>
              <div className="msg__head">
                <button type="button" className="icon-btn msg__back" onClick={() => setActiveId(null)} aria-label="Retour"><ArrowLeft size={20} /></button>
                <Avatar conv={active} />
                <span className="msg__meta">
                  <strong>{active.titre}</strong>
                  <span>
                    {active.type === 'groupe'
                      ? `${active.participants.length} participant(s)`
                      : ROLE_LABEL[active.participants.find((p) => p.id !== user.id)?.role] || ''}
                  </span>
                </span>
                {user.role === 'admin' && (
                  <button type="button" className="icon-btn danger" style={{ marginLeft: 'auto' }} title="Supprimer la conversation" aria-label="Supprimer la conversation" onClick={() => setConfirm(true)}><Trash2 size={18} /></button>
                )}
              </div>

              <div className="msg__body" ref={bodyRef}>
                {msgs.length === 0 && <div className="empty">Aucun message pour l&apos;instant.</div>}
                {msgs.map((m) => {
                  const d = dayKey(m.createdAt);
                  const sep = d !== lastDay;
                  lastDay = d;
                  const mine = m.senderId === user.id;
                  return (
                    <div key={m.id} style={{ display: 'contents' }}>
                      {sep && <span className="msg__day">{d}</span>}
                      <div className={`msg__bubble ${mine ? 'me' : 'other'}`}>
                        {!mine && active.type === 'groupe' && <span className="msg__from">{m.expediteur || 'Utilisateur supprimé'}</span>}
                        {m.contenu}
                        <span className="msg__time">{timeOf(m.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="msg__composer" onSubmit={send}>
                <textarea
                  rows={1} value={text} maxLength={MAX} placeholder="Écrire un message…" aria-label="Message"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
                />
                <button type="submit" className="btn" disabled={!text.trim() || sending} aria-label="Envoyer"><Send size={18} /></button>
              </form>
            </>
          )}
        </section>
      </div>

      {showNew && <NewConversationModal canGroup={canGroup} onClose={() => setShowNew(false)} onCreated={onCreated} />}

      {confirm && (
        <ConfirmDialog
          title="Supprimer cette conversation ?" icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message="La conversation et tous ses messages seront supprimés pour tous les participants."
          onConfirm={onDelete} onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}