// frontend/src/pages/admin/Modules.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Link2, Plus, Pencil, Trash2, Search, CircleAlert, Scale, Clock, GraduationCap, RotateCcw, Umbrella,
} from 'lucide-react';
import api from '../../api/axios';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { PUBLIC_TYPES } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ModuleModal from '../../components/academic/ModuleModal';
import AssignationModal from '../../components/academic/AssignationModal';

export default function Modules() {
  const meta = useMeta();
  const toast = useToast();
  const [tab, setTab] = useState('modules');

  const [modules, setModules] = useState([]);
  const [assignations, setAssignations] = useState([]);
  const [options, setOptions] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ moduleId: '', professeurId: '', publicType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [moduleModal, setModuleModal] = useState(null); // { item }
  const [assignModal, setAssignModal] = useState(null); // { item }
  const [confirm, setConfirm] = useState(null);         // { kind: 'module' | 'assignation', item }
  const [busy, setBusy] = useState(false);

  const loadModules = useCallback(async () => {
    const { data } = await api.get('/modules');
    setModules(data.data);
  }, []);

  const loadAssignations = useCallback(async () => {
    const { data } = await api.get('/enseignements', {
      params: {
        moduleId: filters.moduleId || undefined,
        professeurId: filters.professeurId || undefined,
        publicType: filters.publicType || undefined,
      },
    });
    setAssignations(data.data);
  }, [filters]);

  const loadOptions = useCallback(async () => {
    const { data } = await api.get('/enseignements/options');
    setOptions(data.data);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadModules(), loadAssignations(), loadOptions()]);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadModules, loadAssignations, loadOptions]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? modules.filter((m) => `${m.code} ${m.nom}`.toLowerCase().includes(q)) : modules;
  }, [modules, search]);

  if (!meta || loading || !options) return <Loader />;

  const isModules = tab === 'modules';

  const onModuleSaved = () => {
    toast.success(moduleModal.item ? 'Module modifié.' : 'Module créé.');
    setModuleModal(null);
    loadAll();
  };

  const onAssignSaved = (saved, warning) => {
    toast.success(assignModal.item ? 'Assignation modifiée.' : 'Assignation créée.');
    if (warning) toast.info(warning);
    setAssignModal(null);
    loadAll();
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/${confirm.kind === 'module' ? 'modules' : 'enseignements'}/${confirm.item.id}`);
      toast.success(confirm.kind === 'module' ? 'Module supprimé.' : 'Assignation supprimée.');
      setConfirm(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><BookOpen size={24} /></span> Modules</h1>
        {isModules ? (
          <button type="button" className="btn" onClick={() => setModuleModal({ item: null })}><Plus size={20} /> Nouveau module</button>
        ) : (
          <button type="button" className="btn" onClick={() => setAssignModal({ item: null })}><Plus size={20} /> Nouvelle assignation</button>
        )}
      </div>

      <div className="seg" role="tablist" style={{ maxWidth: 460 }}>
        <button type="button" role="tab" aria-selected={isModules} className={isModules ? 'on' : ''} onClick={() => setTab('modules')}><BookOpen size={18} /> Modules ({modules.length})</button>
        <button type="button" role="tab" aria-selected={!isModules} className={!isModules ? 'on' : ''} onClick={() => setTab('assignations')}><Link2 size={18} /> Assignations ({assignations.length})</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {isModules ? (
        <>
          <div className="card" style={{ maxWidth: 420 }}>
            <div className="field">
              <label htmlFor="m-search"><Search size={16} /> Recherche</label>
              <input id="m-search" type="search" placeholder="Code ou nom du module…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Module</th><th><Scale size={14} /> Coef.</th><th><Clock size={14} /> Volume</th><th>Assignations</th><th>Actions</th></tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={6} className="empty">Aucun module.</td></tr>}
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.code}</strong></td>
                    <td>{m.nom}{m.description && <small className="muted" style={{ display: 'block', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</small>}</td>
                    <td>{m.coefficient}</td>
                    <td>{m.volumeHoraire} h</td>
                    <td><span className="badge badge-info">{m.nbAssignations}</span></td>
                    <td>
                      <div className="actions">
                        <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setModuleModal({ item: m })}><Pencil size={18} /></button>
                        <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ kind: 'module', item: m })}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="card filters-grid">
            <div className="field">
              <label htmlFor="fa-module">Module</label>
              <select id="fa-module" value={filters.moduleId} onChange={setFilter('moduleId')}>
                <option value="">Tous</option>
                {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.nom}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fa-prof">Professeur</label>
              <select id="fa-prof" value={filters.professeurId} onChange={setFilter('professeurId')}>
                <option value="">Tous</option>
                {options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fa-type">Public</label>
              <select id="fa-type" value={filters.publicType} onChange={setFilter('publicType')}>
                <option value="">Tous</option>
                {meta.publicTypes.map((t) => <option key={t} value={t}>{PUBLIC_TYPES[t]}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setFilters({ moduleId: '', professeurId: '', publicType: '' })}><RotateCcw size={18} /> Réinitialiser</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Module</th><th>Professeur</th><th>Public</th><th><GraduationCap size={14} /> Étudiants</th><th>Année</th><th>Actions</th></tr></thead>
              <tbody>
                {assignations.length === 0 && <tr><td colSpan={6} className="empty">Aucune assignation.</td></tr>}
                {assignations.map((a) => {
                  const conge = options.professeurs.find((p) => p.id === a.professeur.id)?.enConge;
                  return (
                    <tr key={a.id}>
                      <td><strong>{a.module.code}</strong><small className="muted" style={{ display: 'block' }}>{a.module.nom}</small></td>
                      <td>
                        {a.professeur.prenom} {a.professeur.nom}
                        {conge && <span className="badge badge-warn" style={{ marginLeft: '0.4rem' }}><Umbrella size={12} /> Congé</span>}
                      </td>
                      <td><span className="badge badge-info">{PUBLIC_TYPES[a.publicType]}</span><small style={{ display: 'block' }}>{a.publicLabel}</small></td>
                      <td>{a.nbEtudiants}</td>
                      <td>{a.anneeAcademique}</td>
                      <td>
                        <div className="actions">
                          <button type="button" className="icon-btn" title="Changer le professeur" aria-label="Modifier" onClick={() => setAssignModal({ item: a })}><Pencil size={18} /></button>
                          <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ kind: 'assignation', item: a })}><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {moduleModal && <ModuleModal item={moduleModal.item} onClose={() => setModuleModal(null)} onSaved={onModuleSaved} />}
      {assignModal && <AssignationModal item={assignModal.item} options={options} meta={meta} onClose={() => setAssignModal(null)} onSaved={onAssignSaved} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'module' ? `Supprimer ${confirm.item.code} ?` : 'Supprimer cette assignation ?'}
          icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={confirm.kind === 'module'
            ? `Le module et ses ${confirm.item.nbAssignations} assignation(s) seront supprimés, avec les créneaux, séances, devoirs, notes et avis qui en dépendent. Cette action est irréversible.`
            : `${confirm.item.module.code} avec ${confirm.item.professeur.prenom} ${confirm.item.professeur.nom} (${confirm.item.publicLabel}) sera supprimée, avec ses créneaux, séances, devoirs, notes et avis. Cette action est irréversible.`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}