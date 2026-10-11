// frontend/src/components/documents/DocumentModal.jsx
import { useState } from 'react';
import { FolderOpen, BookOpen, School, Paperclip, Link2, Save, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';

const MAX_MB = Number(import.meta.env.VITE_MAX_DOC_MB) || 50;

export default function DocumentModal({ item, options, onClose, onSaved, base = '/documents', moduleRequired = false }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(() => ({
    titre: item?.titre || '',
    description: item?.description || '',
    type: item?.type || 'cours',
    moduleId: item?.moduleId ? String(item.moduleId) : '',
    classeId: item?.classeId ? String(item.classeId) : '',
    lien: item?.lien || '',
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
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
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
      title={isEdit ? 'Modifier le document' : 'Nouveau document'} icon={FolderOpen} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="doc-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="doc-form" className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="d-titre">Titre</label>
          <input id="d-titre" value={form.titre} onChange={set('titre')} maxLength={200} required />
        </div>
        <div className="field">
          <label htmlFor="d-desc">Description (facultatif)</label>
          <input id="d-desc" value={form.description} onChange={set('description')} maxLength={255} />
        </div>
        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="d-type">Type</label>
            <select id="d-type" value={form.type} onChange={set('type')}>
              <option value="cours">Cours</option>
              <option value="ressource">Ressource</option>
              <option value="video">Vidéo</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-module"><BookOpen size={16} /> Module (facultatif)</label>
            <select id="d-module" value={form.moduleId} onChange={set('moduleId')} required={moduleRequired}>
              <option value="">Aucun</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-classe"><School size={16} /> Classe (facultatif)</label>
            <select id="d-classe" value={form.classeId} onChange={set('classeId')}>
              <option value="">Aucune</option>
              {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="d-file"><Paperclip size={16} /> Fichier ({MAX_MB} Mo max)</label>
          <input id="d-file" type="file" onChange={onFile} />
          {isEdit && item.aFichier && !file && (
            <label className="member-item" style={{ minHeight: 0 }}>
              <input type="checkbox" checked={retirer} onChange={(e) => setRetirer(e.target.checked)} />
              Retirer le fichier actuel ({item.nomOriginal})
            </label>
          )}
        </div>
        <div className="field">
          <label htmlFor="d-lien"><Link2 size={16} /> Ou un lien (https://…)</label>
          <input id="d-lien" type="url" value={form.lien} onChange={set('lien')} maxLength={500} placeholder="https://" />
        </div>
        <small className="hint">Joignez un fichier, un lien, ou les deux. Sans module ni classe, le document est général. S’il cible une classe ou un module, ses étudiants sont notifiés.</small>
      </form>
    </Modal>
  );
}