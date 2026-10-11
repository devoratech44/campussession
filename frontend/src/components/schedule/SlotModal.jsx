// frontend/src/components/schedule/SlotModal.jsx
import { useMemo, useState } from 'react';
import { CalendarDays, BookOpen, Clock, DoorOpen, CalendarRange, Save, Trash2, CircleAlert, TriangleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { DAYS, dayLabel, toLabel, toMinutes } from '../../utils/schedule';
import Modal from '../common/Modal';

const REASONS = { professeur: 'même professeur', salle: 'même salle', public: 'même public' };

export default function SlotModal({ item, defaults, enseignements, meta, onClose, onSaved, onDelete }) {
  const { startMinutes, endMinutes, stepMinutes } = meta.schedule;
  const isEdit = Boolean(item);

  const [form, setForm] = useState(() => {
    if (item) {
      return {
        enseignementId: String(item.enseignementId), jour: String(item.jour), heureDebut: item.heureDebut, heureFin: item.heureFin,
        salle: item.salle || '', dateDebut: item.dateDebut || '', dateFin: item.dateFin || '',
      };
    }
    const debut = defaults?.minutes ?? startMinutes;
    return {
      enseignementId: '', jour: String(defaults?.jour || 1), heureDebut: toLabel(debut),
      heureFin: toLabel(Math.min(endMinutes, debut + 2 * stepMinutes)), salle: '', dateDebut: '', dateFin: '',
    };
  });
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [saving, setSaving] = useState(false);

  const times = useMemo(() => {
    const list = [];
    for (let m = startMinutes; m <= endMinutes; m += stepMinutes) list.push(m);
    return list;
  }, [startMinutes, endMinutes, stepMinutes]);

  const debutMin = toMinutes(form.heureDebut);
  const set = (name) => (e) => { setConflicts([]); setForm((f) => ({ ...f, [name]: e.target.value })); };

  const onDebut = (e) => {
    const value = e.target.value;
    setConflicts([]);
    setForm((f) => {
      const fin = toMinutes(f.heureFin) <= toMinutes(value) ? Math.min(endMinutes, toMinutes(value) + stepMinutes) : toMinutes(f.heureFin);
      return { ...f, heureDebut: value, heureFin: toLabel(fin) };
    });
  };

  // Salle de la classe proposée par défaut
  const onEnseignement = (e) => {
    const ens = enseignements.find((x) => String(x.id) === e.target.value);
    setConflicts([]);
    setForm((f) => ({ ...f, enseignementId: e.target.value, salle: f.salle || ens?.salleParDefaut || '' }));
  };

  const save = async (force = false) => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        enseignementId: Number(form.enseignementId),
        jour: Number(form.jour),
        dateDebut: form.dateDebut || null,
        dateFin: form.dateFin || null,
        forcer: force,
      };
      const { data } = isEdit ? await api.put(`/emploi-du-temps/${item.id}`, payload) : await api.post('/emploi-du-temps', payload);
      onSaved(data.data, isEdit);
    } catch (err) {
      const details = err.response?.data?.details;
      if (details?.code === 'SCHEDULE_CONFLICT') setConflicts(details.conflits);
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); save(false); };

  return (
    <Modal
      title={isEdit ? 'Modifier le créneau' : 'Nouveau créneau'} icon={CalendarDays} onClose={onClose} busy={saving}
      footer={(
        <>
          {isEdit && <button type="button" className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => onDelete(item)} disabled={saving}><Trash2 size={18} /> Supprimer</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="slot-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {conflicts.length > 0 && (
        <div className="alert alert-warn conflict-box" role="alert">
          <strong><TriangleAlert size={18} style={{ verticalAlign: 'text-bottom' }} /> Conflit d&apos;horaire détecté</strong>
          <ul>
            {conflicts.map((c) => (
              <li key={c.id}>
                {dayLabel(c.jour)} {c.heureDebut}-{c.heureFin} · {c.module} · {c.professeur} · {c.publicLabel}
                {' '}({c.raisons.map((r) => REASONS[r]).join(', ')})
              </li>
            ))}
          </ul>
          <button type="button" className="btn" onClick={() => save(true)} disabled={saving}>Enregistrer quand même</button>
        </div>
      )}

      <form id="slot-form" onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="s-ens"><BookOpen size={16} /> Enseignement (module, professeur, public)</label>
          <select id="s-ens" value={form.enseignementId} onChange={onEnseignement} required>
            <option value="">Choisir…</option>
            {enseignements.map((x) => (
              <option key={x.id} value={x.id}>
                {x.module.code} · {x.professeur.prenom} {x.professeur.nom} · {x.publicLabel}
              </option>
            ))}
          </select>
          {enseignements.length === 0 && <small className="hint">Aucune assignation : créez-en dans Modules, onglet Assignations.</small>}
        </div>

        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="s-jour"><CalendarDays size={16} /> Jour</label>
            <select id="s-jour" value={form.jour} onChange={set('jour')} required>
              {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-salle"><DoorOpen size={16} /> Salle</label>
            <input id="s-salle" value={form.salle} onChange={set('salle')} maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="s-debut"><Clock size={16} /> Début</label>
            <select id="s-debut" value={form.heureDebut} onChange={onDebut} required>
              {times.filter((m) => m < endMinutes).map((m) => <option key={m} value={toLabel(m)}>{toLabel(m)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-fin"><Clock size={16} /> Fin</label>
            <select id="s-fin" value={form.heureFin} onChange={set('heureFin')} required>
              {times.filter((m) => m > debutMin).map((m) => <option key={m} value={toLabel(m)}>{toLabel(m)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-dd"><CalendarRange size={16} /> Du (facultatif)</label>
            <input id="s-dd" type="date" value={form.dateDebut} onChange={set('dateDebut')} />
          </div>
          <div className="field">
            <label htmlFor="s-df"><CalendarRange size={16} /> Au (facultatif)</label>
            <input id="s-df" type="date" min={form.dateDebut || undefined} value={form.dateFin} onChange={set('dateFin')} />
          </div>
        </div>
        <small className="hint">Sans dates, le créneau se répète chaque semaine.</small>
      </form>
    </Modal>
  );
}