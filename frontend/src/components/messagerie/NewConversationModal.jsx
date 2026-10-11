// frontend/src/components/messagerie/NewConversationModal.jsx
import { useEffect, useState } from 'react';
import { MessageSquarePlus, UsersRound, X, Send, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { errorMessage, photoUrl } from '../../utils/format';
import { ROLE_LABEL } from '../../utils/roles';
import Modal from '../common/Modal';

export default function NewConversationModal({ canGroup, onClose, onCreated }) {
  const [mode, setMode] = useState('prive');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [titre, setTitre] = useState('');
  const [cibleType, setCibleType] = useState('aucune');
  const [cibleId, setCibleId] = useState('');
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/messagerie/contacts', { params: { q: debounced || undefined } })
      .then((res) => setResults(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, [debounced]);

  useEffect(() => {
    if (mode === 'groupe' && canGroup && !options) {
      api.get('/enseignements/options').then((res) => setOptions(res.data.data)).catch((err) => setError(errorMessage(err)));
    }
  }, [mode, canGroup, options]);

  const create = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/messagerie/conversations', payload);
      onCreated(data.data.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (c) => {
    if (mode === 'prive') { create({ type: 'prive', userIds: [c.id] }); return; }
    setSelected((list) => (list.some((x) => x.id === c.id) ? list.filter((x) => x.id !== c.id) : [...list, c]));
  };

  const onGroup = (e) => {
    e.preventDefault();
    create({ type: 'groupe', titre, userIds: selected.map((x) => x.id), cibleType, cibleId: cibleType === 'aucune' ? undefined : Number(cibleId) });
  };

  const cibles = options ? { classe: options.classes, filiere: options.filieres, groupe: options.groupes }[cibleType] || [] : [];

  return (
    <Modal
      title="Nouvelle conversation" icon={MessageSquarePlus} onClose={onClose} busy={busy}
      footer={mode === 'groupe' ? (
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="submit" form="grp-form" className="btn" disabled={busy || (!selected.length && cibleType === 'aucune')}><Send size={18} /> Créer le groupe</button>
        </>
      ) : undefined}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {canGroup && (
        <div className="seg" role="group" aria-label="Type">
          <button type="button" className={mode === 'prive' ? 'on' : ''} onClick={() => setMode('prive')}>Message privé</button>
          <button type="button" className={mode === 'groupe' ? 'on' : ''} onClick={() => setMode('groupe')}><UsersRound size={16} /> Groupe</button>
        </div>
      )}

      <form id="grp-form" className="stack" onSubmit={onGroup}>
        {mode === 'groupe' && (
          <>
            <div className="field">
              <label htmlFor="g-titre">Nom du groupe</label>
              <input id="g-titre" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={150} required />
            </div>
            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="g-ct">Ajouter tout un ensemble</label>
                <select id="g-ct" value={cibleType} onChange={(e) => { setCibleType(e.target.value); setCibleId(''); }}>
                  <option value="aucune">Non</option>
                  <option value="classe">Une classe</option>
                  <option value="filiere">Une filière</option>
                  <option value="groupe">Un groupe</option>
                </select>
              </div>
              {cibleType !== 'aucune' && (
                <div className="field">
                  <label htmlFor="g-ci">Choix</label>
                  <select id="g-ci" value={cibleId} onChange={(e) => setCibleId(e.target.value)} required>
                    <option value="">Choisir…</option>
                    {cibles.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                  </select>
                </div>
              )}
            </div>
            {selected.length > 0 && (
              <div className="legend">
                {selected.map((c) => (
                  <button key={c.id} type="button" className="badge badge-info" onClick={() => pick(c)} title="Retirer">{c.prenom} {c.nom} <X size={12} /></button>
                ))}
              </div>
            )}
          </>
        )}
      </form>

      <div className="field">
        <label htmlFor="c-search">{mode === 'prive' ? 'Écrire à…' : 'Ajouter des personnes'}</label>
        <input id="c-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou matricule…" autoComplete="off" />
      </div>

      <div className="member-list">
        {results.length === 0 && <div className="empty">Aucune personne trouvée.</div>}
        {results.map((c) => (
          <button key={c.id} type="button" className="member-item" style={{ border: 0, background: selected.some((x) => x.id === c.id) ? 'var(--surface)' : 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left' }} onClick={() => pick(c)} disabled={busy}>
            <img className="avatar" src={photoUrl(c.photo)} alt="" />
            <span>{c.prenom} {c.nom}</span>
            <small>{ROLE_LABEL[c.role]}{c.matricule ? ` · ${c.matricule}` : ''}</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}