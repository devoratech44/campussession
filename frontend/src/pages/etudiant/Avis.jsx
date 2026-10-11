// frontend/src/pages/etudiant/Avis.jsx
import { useEffect, useState } from 'react';
import { Star, CircleAlert, Presentation, Save } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import Loader from '../../components/common/Loader';

function AvisCard({ c, onSaved }) {
  const toast = useToast();
  const [note, setNote] = useState(c.avis?.appreciation || 0);
  const [text, setText] = useState(c.avis?.commentaire || '');
  const [busy, setBusy] = useState(false);
  const dirty = note !== (c.avis?.appreciation || 0) || text.trim() !== (c.avis?.commentaire || '');

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/etudiant/avis/${c.id}`, { appreciation: note, commentaire: text });
      onSaved(data.data);
      toast.success('Avis enregistré. Merci !');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <strong style={{ fontSize: '1.05rem' }}>{c.moduleCode} · {c.moduleNom}</strong>
      <span className="meta-line"><span><Presentation size={14} /> {c.professeur}</span></span>
      <div className="row" role="radiogroup" aria-label="Appréciation">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className="icon-btn" role="radio" aria-checked={note === n} aria-label={`${n} sur 5`} onClick={() => setNote(n)}>
            <Star size={26} fill={n <= note ? 'currentColor' : 'none'} style={{ color: n <= note ? 'var(--warning)' : 'var(--text-muted)' }} />
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor={`a-${c.id}`}>Commentaire (facultatif, anonyme pour le professeur)</label>
        <textarea id={`a-${c.id}`} rows={3} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
      </div>
      <div><button type="button" className="btn" disabled={busy || !note || !dirty} onClick={save}><Save size={18} /> {c.avis ? 'Mettre à jour' : 'Envoyer mon avis'}</button></div>
    </div>
  );
}

export default function Avis() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/etudiant/avis').then((r) => setItems(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!items) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Star size={24} /></span> Avis sur mes cours</h1>
      </div>
      {items.length === 0 && <div className="empty">Aucun cours dans votre emploi du temps.</div>}
      {items.map((c) => <AvisCard key={c.id} c={c} onSaved={setItems} />)}
      <small className="hint">Votre avis est anonyme pour le professeur. Vous pouvez le modifier à tout moment.</small>
    </section>
  );
}