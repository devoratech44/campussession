// frontend/src/components/academic/GroupeModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { UsersRound, School, Layers, FileText, Search, Save, CircleAlert, CheckCheck } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage, photoUrl } from '../../utils/format';
import Modal from '../common/Modal';

export default function GroupeModal({ item, classes, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(() => ({
    nom: item?.nom || '',
    description: item?.description || '',
    classeId: item ? String(item.classeId) : '',
    filiereId: item?.filiereId ? String(item.filiereId) : '',
  }));
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const classe = classes.find((c) => String(c.id) === form.classeId);

  // Membres actuels (modification)
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/groupes/${item.id}`)
      .then((res) => setSelected(new Set(res.data.data.membres.map((m) => m.id))))
      .catch((err) => setError(errorMessage(err)));
  }, [isEdit, item]);

  // Étudiants de la classe choisie
  useEffect(() => {
    if (!form.classeId) { setCandidates([]); return; }
    api.get('/groupes/candidats', { params: { classeId: form.classeId } })
      .then((res) => setCandidates(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, [form.classeId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? candidates.filter((c) => `${c.prenom} ${c.nom} ${c.matricule}`.toLowerCase().includes(q)) : candidates;
  }, [candidates, query]);

  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    shown.forEach((c) => (allShownSelected ? next.delete(c.id) : next.add(c.id)));
    return next;
  });

  const onClasse = (e) => {
    setForm((f) => ({ ...f, classeId: e.target.value, filiereId: '' }));
    setSelected(new Set());
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        nom: form.nom, description: form.description, filiereId: form.filiereId || null, membreIds: [...selected],
        ...(isEdit ? {} : { classeId: form.classeId }),
      };
      const { data } = isEdit ? await api.put(`/groupes/${item.id}`, payload) : await api.post('/groupes', payload);
      onSaved(data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Modifier ${item.nom}` : 'Nouveau groupe'} icon={UsersRound} wide onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="groupe-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="groupe-form" onSubmit={onSubmit} className="stack">
        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="g-nom"><UsersRound size={16} /> Nom du groupe</label>
            <input id="g-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="g-classe"><School size={16} /> Classe</label>
            <select id="g-classe" value={form.classeId} onChange={onClasse} required disabled={isEdit}>
              <option value="">Choisir…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {isEdit && <small className="hint">La classe d&apos;un groupe ne peut plus être modifiée.</small>}
          </div>
          <div className="field">
            <label htmlFor="g-filiere"><Layers size={16} /> Filière (facultative)</label>
            <select id="g-filiere" value={form.filiereId} onChange={(e) => setForm({ ...form, filiereId: e.target.value })} disabled={!classe}>
              <option value="">Aucune</option>
              {classe?.filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-desc"><FileText size={16} /> Description (facultative)</label>
            <input id="g-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={255} />
          </div>
        </div>

        <div className="field">
          <label>Membres ({selected.size} sélectionné(s))</label>
          {!form.classeId ? (
            <div className="empty">Choisissez d&apos;abord une classe.</div>
          ) : (
            <>
              <div className="row">
                <div className="input-icon" style={{ flex: 1, minWidth: 200 }}>
                  <Search size={18} className="lead" />
                  <input type="search" placeholder="Rechercher un étudiant…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <button type="button" className="btn btn-ghost" onClick={toggleAll} disabled={!shown.length}>
                  <CheckCheck size={18} /> {allShownSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="member-list">
                {shown.length === 0 && <div className="empty">Aucun étudiant dans cette classe.</div>}
                {shown.map((c) => (
                  <label key={c.id} className="member-item">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <img className="avatar" src={photoUrl(c.photo)} alt="" style={{ width: 32, height: 32 }} />
                    {c.prenom} {c.nom}
                    <small>{c.matricule}</small>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}