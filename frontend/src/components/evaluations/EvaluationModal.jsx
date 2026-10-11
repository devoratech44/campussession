// frontend/src/components/evaluations/EvaluationModal.jsx
import { useState } from 'react';
import { NotebookPen, BookOpen, CalendarDays, Paperclip, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';

const MAX_TP = Number(import.meta.env.VITE_EVAL_MAX_TP) || 3;
const MAX_MB = Number(import.meta.env.VITE_MAX_DOC_MB) || 50;

export default function EvaluationModal({ item, enseignements, onClose, onSaved, base = '/evaluations' }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(() => ({
    enseignementId: item ? String(item.enseignementId) : '',
    type: item?.type || 'devoir',
    numeroTp: item?.numeroTp ? String(item.numeroTp) : '1',
    titre: item?.titre || '',
        dateTravail: item?.dateTravail || '',
    dateLimite: item?.dateLimite || '',
    consignes: item?.consignes || '',
  }));
  const [file, setFile] = useState(null);
  const [retirer, setRetirer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (${MAX_MB} Mo maximum).`);
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    if (!isEdit) fd.append('enseignementId', form.enseignementId);
    ['type', 'titre', 'consignes', 'dateTravail', 'dateLimite'].forEach((k) => fd.append(k, form[k]));
    if (form.type === 'tp') fd.append('numeroTp', form.numeroTp);
    if (file) fd.append('fichier', file);
    if (retirer) fd.append('retirerFichier', 'true');
    const req = { headers: { 'Content-Type': 'multipart/form-data' } };

    setSaving(true);
    try {
      if (isEdit) await api.put(`${base}/${item.id}`, fd, req);
      else await api.post(base, fd, req);
      onSaved(isEdit);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Modifier l’évaluation' : 'Nouvelle évaluation'} icon={NotebookPen} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="eval-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="eval-form" className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="ev-ens"><BookOpen size={16} /> Assignation (module, professeur, public)</label>
          <select id="ev-ens" value={form.enseignementId} onChange={set('enseignementId')} required disabled={isEdit}>
            <option value="">Choisir…</option>
            {enseignements.map((x) => (
              <option key={x.id} value={x.id}>{x.module.code} · {x.professeur.prenom} {x.professeur.nom} · {x.publicLabel}</option>
            ))}
          </select>
          {isEdit && <small className="hint">L’assignation ne peut pas être changée : les notes y sont rattachées.</small>}
        </div>

        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="ev-type">Type</label>
            <select id="ev-type" value={form.type} onChange={set('type')}>
              <option value="devoir">Devoir</option>
              <option value="examen">Examen</option>
              <option value="tp">TP</option>
            </select>
          </div>
          {form.type === 'tp' ? (
            <div className="field">
              <label htmlFor="ev-tp">Numéro du TP</label>
              <select id="ev-tp" value={form.numeroTp} onChange={set('numeroTp')}>
                {Array.from({ length: MAX_TP }, (_, i) => <option key={i + 1} value={i + 1}>TP {i + 1}</option>)}
              </select>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="ev-date"><CalendarDays size={16} /> Date (facultatif)</label>
              <input id="ev-date" type="date" value={form.dateTravail} onChange={set('dateTravail')} />
            </div>
          )}
        </div>

        {form.type === 'tp' && (
          <div className="field">
            <label htmlFor="ev-date2"><CalendarDays size={16} /> Date (facultatif)</label>
            <input id="ev-date2" type="date" value={form.dateTravail} onChange={set('dateTravail')} />
          </div>
        )}

        <div className="field">
          <label htmlFor="ev-titre">Titre</label>
          <input id="ev-titre" value={form.titre} onChange={set('titre')} maxLength={200} required />
        </div>

        <div className="field">
          <label htmlFor="ev-cons">Consignes (facultatif)</label>
          <textarea id="ev-cons" rows={5} value={form.consignes} onChange={set('consignes')} maxLength={10000} />
        </div>
        <div className="field">
          <label htmlFor="ev-lim">Date limite de rendu précise (heure GMT, facultatif)</label>
          <input id="ev-lim" type="datetime-local" value={form.dateLimite} onChange={set('dateLimite')} />
          <small className="hint">Sans date limite précise, le rendu est accepté jusqu’à 23h59 GMT de la date ci-dessus.</small>
        </div>

        <div className="field">
          <label htmlFor="ev-file"><Paperclip size={16} /> Fichier joint (facultatif, {MAX_MB} Mo max)</label>
          <input id="ev-file" type="file" onChange={onFile} />
          {isEdit && item.aFichier && !file && (
            <label className="member-item" style={{ minHeight: 0 }}>
              <input type="checkbox" checked={retirer} onChange={(e) => setRetirer(e.target.checked)} />
              Retirer le fichier actuel ({item.nomOriginal})
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}