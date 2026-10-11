// frontend/src/pages/admin/EmploiDuTemps.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Plus, FileDown, FileSpreadsheet, RotateCcw, CircleAlert, School, Layers, Presentation, BookOpen,
  UsersRound, User, Tags, DoorOpen, CalendarRange, Clock,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { DAYS, formatHours, moduleColor, slotInWeek, todayDayId, toLabel, totalHours, weekBounds } from '../../utils/schedule';
import { exportSchedulePdf, exportScheduleExcel } from '../../utils/exporters';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StudentPicker from '../../components/common/StudentPicker';
import ScheduleGrid from '../../components/schedule/ScheduleGrid';
import SlotModal from '../../components/schedule/SlotModal';

const EMPTY_FILTERS = { classeId: '', filiereId: '', professeurId: '', moduleId: '', groupeId: '', type: '' };

export default function EmploiDuTemps() {
  const meta = useMeta();
  const toast = useToast();

  const [options, setOptions] = useState(null);
  const [enseignements, setEnseignements] = useState([]);
  const [slots, setSlots] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [student, setStudent] = useState(null);
  const [salle, setSalle] = useState('');
  const [salleDebounced, setSalleDebounced] = useState('');
  const [semaine, setSemaine] = useState('');
  const [view, setView] = useState(() => (window.matchMedia('(max-width: 760px)').matches ? 'jour' : 'semaine'));
  const [day, setDay] = useState(todayDayId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [modal, setModal] = useState(null);     // { item, defaults }
  const [confirm, setConfirm] = useState(null); // créneau
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSalleDebounced(salle.trim()), env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [salle]);

  useEffect(() => {
    Promise.all([api.get('/enseignements/options'), api.get('/enseignements')])
      .then(([o, e]) => { setOptions(o.data.data); setEnseignements(e.data.data); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const loadSlots = useCallback(async () => {
    try {
      const { data } = await api.get('/emploi-du-temps', {
        params: {
          classeId: filters.classeId || undefined, filiereId: filters.filiereId || undefined,
          professeurId: filters.professeurId || undefined, moduleId: filters.moduleId || undefined,
          groupeId: filters.groupeId || undefined, type: filters.type || undefined,
          etudiantId: student?.id || undefined, salle: salleDebounced || undefined,
        },
      });
      setSlots(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, student, salleDebounced]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const week = useMemo(() => (semaine ? weekBounds(semaine) : null), [semaine]);
  const visible = useMemo(() => slots.filter((s) => slotInWeek(s, week)), [slots, week]);
  const inView = useMemo(() => (view === 'jour' ? visible.filter((s) => s.jour === day) : visible), [visible, view, day]);

  const legend = useMemo(() => {
    const map = new Map();
    inView.forEach((s) => map.set(s.enseignement.module.id, s.enseignement.module));
    return [...map.values()];
  }, [inView]);

  if (!meta || !options) return <Loader />;

  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));
  const reset = () => { setFilters(EMPTY_FILTERS); setStudent(null); setSalle(''); setSemaine(''); };

  const summary = [
    filters.classeId && `Classe : ${options.classes.find((c) => String(c.id) === filters.classeId)?.nom}`,
    filters.filiereId && `Filière : ${options.filieres.find((f) => String(f.id) === filters.filiereId)?.nom}`,
    filters.professeurId && `Professeur : ${(() => { const p = options.professeurs.find((x) => String(x.id) === filters.professeurId); return p && `${p.prenom} ${p.nom}`; })()}`,
    filters.moduleId && `Module : ${options.modules.find((m) => String(m.id) === filters.moduleId)?.code}`,
    filters.groupeId && `Groupe : ${options.groupes.find((g) => String(g.id) === filters.groupeId)?.nom}`,
    student && `Étudiant : ${student.label}`,
    filters.type && `Type : ${filters.type}`,
    salleDebounced && `Salle : ${salleDebounced}`,
    week && `Semaine du ${week.start.split('-').reverse().join('/')}`,
  ].filter(Boolean).join('  |  ') || 'Tous les cours';

  const onExport = async (kind) => {
    setExporting(true);
    try {
      const payload = { slots: visible, title: 'Emploi du temps', subtitle: summary };
      if (kind === 'pdf') await exportSchedulePdf(payload);
      else await exportScheduleExcel(payload);
      toast.success(`Export ${kind === 'pdf' ? 'PDF' : 'Excel'} prêt.`);
    } catch (err) {
      toast.error(`Export impossible : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const onSaved = (saved, wasEdit) => {
    toast.success(wasEdit ? 'Créneau modifié.' : 'Créneau créé.');
    setModal(null);
    loadSlots();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/emploi-du-temps/${confirm.id}`);
      toast.success('Créneau supprimé.');
      setConfirm(null);
      setModal(null);
      await loadSlots();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const days = view === 'jour' ? DAYS.filter((d) => d.id === day) : DAYS;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><CalendarDays size={24} /></span> Emploi du temps</h1>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => onExport('pdf')} disabled={exporting || visible.length === 0}><FileDown size={18} /> PDF</button>
          <button type="button" className="btn btn-ghost" onClick={() => onExport('excel')} disabled={exporting || visible.length === 0}><FileSpreadsheet size={18} /> Excel</button>
          <button type="button" className="btn" onClick={() => setModal({ item: null, defaults: { jour: view === 'jour' ? day : 1 } })}><Plus size={20} /> Nouveau créneau</button>
        </div>
      </div>

      <div className="card stack">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="e-classe"><School size={16} /> Classe</label>
            <select id="e-classe" value={filters.classeId} onChange={setFilter('classeId')}>
              <option value="">Toutes</option>
              {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-filiere"><Layers size={16} /> Filière</label>
            <select id="e-filiere" value={filters.filiereId} onChange={setFilter('filiereId')}>
              <option value="">Toutes</option>
              {options.filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-prof"><Presentation size={16} /> Professeur</label>
            <select id="e-prof" value={filters.professeurId} onChange={setFilter('professeurId')}>
              <option value="">Tous</option>
              {options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-module"><BookOpen size={16} /> Module</label>
            <select id="e-module" value={filters.moduleId} onChange={setFilter('moduleId')}>
              <option value="">Tous</option>
              {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-groupe"><UsersRound size={16} /> Groupe</label>
            <select id="e-groupe" value={filters.groupeId} onChange={setFilter('groupeId')}>
              <option value="">Tous</option>
              {options.groupes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-type"><Tags size={16} /> Type de cours</label>
            <select id="e-type" value={filters.type} onChange={setFilter('type')}>
              <option value="">Tous</option>
              <option value="collectif">Collectif</option>
              <option value="individuel">Individuel</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-salle"><DoorOpen size={16} /> Salle</label>
            <input id="e-salle" value={salle} onChange={(e) => setSalle(e.target.value)} placeholder="Ex. Salle 3" />
          </div>
          <div className="field">
            <label htmlFor="e-semaine"><CalendarRange size={16} /> Semaine du</label>
            <input id="e-semaine" type="date" value={semaine} onChange={(e) => setSemaine(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-etudiant"><User size={16} /> Étudiant</label>
            <StudentPicker id="e-etudiant" value={student} onChange={setStudent} placeholder="Nom ou matricule…" />
          </div>
          <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="row row-between">
        <div className="seg" role="group" aria-label="Affichage" style={{ minWidth: 220 }}>
          <button type="button" className={view === 'semaine' ? 'on' : ''} onClick={() => setView('semaine')}>Semaine</button>
          <button type="button" className={view === 'jour' ? 'on' : ''} onClick={() => setView('jour')}>Jour</button>
        </div>
        <span className="badge badge-info"><Clock size={14} /> {visible.length} créneau(x) · {formatHours(totalHours(visible))} / semaine</span>
      </div>

      {view === 'jour' && (
        <div className="seg" role="tablist" aria-label="Jour">
          {DAYS.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={day === d.id} className={day === d.id ? 'on' : ''} onClick={() => setDay(d.id)}>{d.short}</button>
          ))}
        </div>
      )}

      {legend.length > 0 && (
        <div className="legend">
          {legend.map((m) => (
            <span key={m.id} className="legend-item"><span className="legend-dot" style={{ background: moduleColor(m.id) }} />{m.code} · {m.nom}</span>
          ))}
        </div>
      )}

      {loading ? <Loader /> : (
        <ScheduleGrid
          slots={inView}
          days={days}
          schedule={meta.schedule}
          onSlotClick={(slot) => setModal({ item: slot })}
          onEmptyClick={({ jour, minutes }) => setModal({ item: null, defaults: { jour, minutes } })}
        />
      )}
      <small className="hint">Cliquez sur une case libre pour créer un créneau, ou sur un cours pour le modifier. Plage : {toLabel(meta.schedule.startMinutes)} - {toLabel(meta.schedule.endMinutes)}, par créneaux de {meta.schedule.stepMinutes} minutes.</small>

      {modal && (
        <SlotModal
          item={modal.item} defaults={modal.defaults} enseignements={enseignements} meta={meta}
          onClose={() => setModal(null)} onSaved={onSaved} onDelete={(slot) => setConfirm(slot)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Supprimer ce créneau ?" icon={CalendarDays} danger confirmLabel="Supprimer" busy={busy}
          message={`${confirm.enseignement.module.code} le ${DAYS.find((d) => d.id === confirm.jour)?.label.toLowerCase()} de ${confirm.heureDebut} à ${confirm.heureFin} sera retiré de l'emploi du temps. L'assignation et ses séances ne sont pas supprimées.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}