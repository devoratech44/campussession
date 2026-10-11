// frontend/src/components/academic/AssignationModal.jsx
import { useState } from 'react';
import { Link2, BookOpen, Presentation, School, Layers, UsersRound, User, CalendarRange, Save, CircleAlert, TriangleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { PUBLIC_TYPES } from '../../utils/schedule';
import Modal from '../common/Modal';
import StudentPicker from '../common/StudentPicker';

const TYPE_ICONS = { classe: School, filiere: Layers, groupe: UsersRound, etudiant: User };

export default function AssignationModal({ item, options, meta, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(() => ({
    moduleId: item ? String(item.module.id) : '',
    professeurId: item ? String(item.professeur.id) : '',
    publicType: item?.publicType || 'classe',
    cibleId: item ? String(item.publicId) : '',
    etudiant: null,
    anneeAcademique: item?.anneeAcademique || meta.academicYear,
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const classeName = (id) => options.classes.find((c) => c.id === id)?.nom || '';
  const targets = {
    classe: options.classes.map((c) => ({ id: c.id, label: c.nom })),
    filiere: options.filieres.map((f) => ({ id: f.id, label: f.nom })),
    groupe: options.groupes.map((g) => ({ id: g.id, label: `${g.nom} (${classeName(g.classeId)})` })),
  };

  const prof = options.professeurs.find((p) => String(p.id) === form.professeurId);
  const cible = form.publicType === 'etudiant' ? form.etudiant?.id : form.cibleId;

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const onType = (publicType) => setForm((f) => ({ ...f, publicType, cibleId: '', etudiant: null }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !cible) { setError('Choisissez le public concerné.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = isEdit
        ? { professeurId: form.professeurId, anneeAcademique: form.anneeAcademique }
        : { moduleId: form.moduleId, professeurId: form.professeurId, publicType: form.publicType, cibleId: cible, anneeAcademique: form.anneeAcademique };
      const { data } = isEdit ? await api.put(`/enseignements/${item.id}`, payload) : await api.post('/enseignements', payload);
      onSaved(data.data, data.avertissement);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Modifier l\'assignation' : 'Nouvelle assignation'} icon={Link2} onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="assign-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <form id="assign-form" onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="a-module"><BookOpen size={16} /> Module</label>
          {isEdit ? (
            <input id="a-module" value={`${item.module.code} - ${item.module.nom}`} readOnly />
          ) : (
            <select id="a-module" value={form.moduleId} onChange={set('moduleId')} required>
              <option value="">Choisir…</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.nom}</option>)}
            </select>
          )}
        </div>

        <div className="field">
          <label htmlFor="a-prof"><Presentation size={16} /> Professeur</label>
          <select id="a-prof" value={form.professeurId} onChange={set('professeurId')} required>
            <option value="">Choisir…</option>
            {options.professeurs.map((p) => (
              <option key={p.id} value={p.id}>{p.nom} {p.prenom}{p.enConge ? ' (en congé)' : ''}</option>
            ))}
          </select>
        </div>
        {prof?.enConge && (
          <div className="alert alert-warn" role="status"><TriangleAlert size={18} />{prof.prenom} {prof.nom} est actuellement en congé. L&apos;assignation reste possible.</div>
        )}

        {isEdit ? (
          <div className="field">
            <label htmlFor="a-public">{PUBLIC_TYPES[item.publicType]}</label>
            <input id="a-public" value={item.publicLabel} readOnly />
            <small className="hint">Le public d&apos;une assignation ne se modifie pas : supprimez-la puis recréez-la.</small>
          </div>
        ) : (
          <>
            <div className="seg" role="group" aria-label="Public visé">
              {Object.keys(PUBLIC_TYPES).map((type) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <button key={type} type="button" className={form.publicType === type ? 'on' : ''} onClick={() => onType(type)} title={PUBLIC_TYPES[type]}>
                    <Icon size={18} /><span>{type === 'etudiant' ? 'Individuel' : PUBLIC_TYPES[type]}</span>
                  </button>
                );
              })}
            </div>
            <div className="field">
              <label htmlFor="a-cible">{PUBLIC_TYPES[form.publicType]}</label>
              {form.publicType === 'etudiant' ? (
                <StudentPicker id="a-cible" value={form.etudiant} onChange={(v) => setForm((f) => ({ ...f, etudiant: v }))} />
              ) : (
                <select id="a-cible" value={form.cibleId} onChange={set('cibleId')} required>
                  <option value="">Choisir…</option>
                  {targets[form.publicType].map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              )}
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="a-annee"><CalendarRange size={16} /> Année académique</label>
          <input id="a-annee" value={form.anneeAcademique} onChange={set('anneeAcademique')} maxLength={20} />
        </div>
      </form>
    </Modal>
  );
}