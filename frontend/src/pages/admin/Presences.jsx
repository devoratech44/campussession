// frontend/src/pages/admin/Presences.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck, Plus, Eye, Play, Square, Ban, Trash2, RotateCcw, CircleAlert, ChevronLeft, ChevronRight, Pencil,
  ListChecks, History, GraduationCap,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import { METHODES, PRESENCE_STATUS, SEANCE_STATUS, todayStr } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StudentPicker from '../../components/common/StudentPicker';
import SeancePanel from '../../components/presence/SeancePanel';
import SeanceFormModal from '../../components/presence/SeanceFormModal';
import PresenceEditModal from '../../components/presence/PresenceEditModal';

function Pager({ page, pages, total, onPage }) {
  return (
    <div className="pager">
      <span className="muted">{total} résultat(s) · page {page} / {pages}</span>
      <div className="actions">
        <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={18} /> Précédent</button>
        <button type="button" className="btn btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

const Select = ({ id, label, value, onChange, children }) => (
  <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={onChange}>{children}</select></div>
);

function SeancesTab({ options, meta }) {
  const toast = useToast();
  const EMPTY = { dateDebut: todayStr(), dateFin: todayStr(), statut: '', classeId: '', professeurId: '', moduleId: '' };
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);   // id
  const [form, setForm] = useState(null);       // { item }
  const [confirm, setConfirm] = useState(null); // { kind, item }
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/presences/seances', {
        params: Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v !== '')),
      });
      setResult(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters, page]);

  useEffect(() => {
    load();
    const id = setInterval(load, env.liveRefreshMs * 3);
    return () => clearInterval(id);
  }, [load]);

  const setFilter = (name) => (e) => { setPage(1); setFilters((f) => ({ ...f, [name]: e.target.value })); };

  const run = async (call, ok) => {
    setBusy(true);
    try { await call(); toast.success(ok); await load(); return true; }
    catch (err) { toast.error(errorMessage(err)); return false; }
    finally { setBusy(false); }
  };

  const onConfirm = async () => {
    const { kind, item } = confirm;
    const ok = kind === 'delete'
      ? await run(() => api.delete(`/presences/seances/${item.id}`), 'Séance supprimée.')
      : await run(() => api.post(`/presences/seances/${item.id}/annuler`, { motif }), 'Séance annulée.');
    if (ok) { setConfirm(null); setMotif(''); }
  };

  return (
    <div className="stack">
      <div className="card filters-grid">
        <div className="field"><label htmlFor="p-du">Du</label><input id="p-du" type="date" value={filters.dateDebut} onChange={setFilter('dateDebut')} /></div>
        <div className="field"><label htmlFor="p-au">Au</label><input id="p-au" type="date" value={filters.dateFin} onChange={setFilter('dateFin')} /></div>
        <Select id="p-statut" label="Statut" value={filters.statut} onChange={setFilter('statut')}>
          <option value="">Tous</option>
          {Object.entries(SEANCE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select id="p-classe" label="Classe" value={filters.classeId} onChange={setFilter('classeId')}>
          <option value="">Toutes</option>{options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
        <Select id="p-prof" label="Professeur" value={filters.professeurId} onChange={setFilter('professeurId')}>
          <option value="">Tous</option>{options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
        </Select>
        <Select id="p-module" label="Module" value={filters.moduleId} onChange={setFilter('moduleId')}>
          <option value="">Tous</option>{options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
        </Select>
        <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
        <button type="button" className="btn" onClick={() => setForm({ item: null })}><Plus size={20} /> Nouvelle séance</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Horaire</th><th>Module</th><th>Professeur</th><th>Public</th><th>Salle</th><th>Statut</th><th>P / R / A</th><th>Actions</th></tr></thead>
          <tbody>
            {result.items.length === 0 && <tr><td colSpan={9} className="empty">Aucune séance pour ces filtres.</td></tr>}
            {result.items.map((s) => {
              const st = SEANCE_STATUS[s.statut];
              const e = s.enseignement;
              return (
                <tr key={s.id}>
                  <td>{formatDateFr(s.date)}</td>
                  <td>{s.heureDebut} - {s.heureFin}</td>
                  <td><strong>{e.module.code}</strong></td>
                  <td>{e.professeur.prenom} {e.professeur.nom}</td>
                  <td>{e.publicLabel}</td>
                  <td>{s.salle || '—'}</td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {s.statut === 'ouverte' && !s.signe && <small className="muted" style={{ display: 'block' }}>Attente signature</small>}
                  </td>
                  <td>
                    <div className="badges">
                      <span className="badge badge-present">{s.counts.present}</span>
                      <span className="badge badge-retard">{s.counts.retard}</span>
                      <span className="badge badge-absent">{s.counts.absent}</span>
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <button type="button" className="icon-btn" title="Voir le détail" aria-label="Détail" onClick={() => setDetail(s.id)}><Eye size={18} /></button>
                      {s.statut === 'ouverte'
                        ? <button type="button" className="icon-btn" title="Fermer" aria-label="Fermer" disabled={busy} onClick={() => run(() => api.post(`/presences/seances/${s.id}/fermer`), 'Séance fermée.')}><Square size={18} /></button>
                        : <button type="button" className="icon-btn" title="Ouvrir" aria-label="Ouvrir" disabled={busy} onClick={() => run(() => api.post(`/presences/seances/${s.id}/ouvrir`, {}), 'Séance ouverte.')}><Play size={18} /></button>}
                      {s.statut !== 'annulee' && <button type="button" className="icon-btn danger" title="Annuler" aria-label="Annuler" onClick={() => setConfirm({ kind: 'cancel', item: s })}><Ban size={18} /></button>}
                      <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ kind: 'delete', item: s })}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={result.pages} total={result.total} onPage={setPage} />

      {detail && (
        <Modal title="Séance de présence" icon={ClipboardCheck} wide onClose={() => { setDetail(null); load(); }}>
          <SeancePanel seanceId={detail} role="admin" onChanged={load} onEdit={(s) => setForm({ item: s })} />
        </Modal>
      )}

      {form && (
        <SeanceFormModal
          item={form.item} onClose={() => setForm(null)}
          onSaved={(wasEdit) => { setForm(null); toast.success(wasEdit ? 'Séance modifiée.' : 'Séance créée.'); load(); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'delete' ? 'Supprimer cette séance ?' : 'Annuler cette séance ?'}
          icon={confirm.kind === 'delete' ? Trash2 : Ban} danger busy={busy}
          confirmLabel={confirm.kind === 'delete' ? 'Supprimer' : 'Annuler la séance'}
          message={confirm.kind === 'delete'
            ? 'La séance, ses présences et ses signatures seront supprimées définitivement. Préférez « Annuler » pour garder une trace.'
            : `${confirm.item.enseignement.module.code} du ${formatDateFr(confirm.item.date)} : aucune absence ne sera comptée. Vous pourrez la rouvrir.`}
          onConfirm={onConfirm} onCancel={() => setConfirm(null)}
        />
      )}
      {meta && null}
    </div>
  );
}

function HistoriqueTab({ options, meta }) {
  const toast = useToast();
  const EMPTY = { du: '', au: '', classeId: '', professeurId: '', moduleId: '', statut: '', justifie: '' };
  const [filters, setFilters] = useState(EMPTY);
  const [student, setStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = { ...filters, etudiantId: student?.id || '', page };
      const { data } = await api.get('/presences/historique', { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '')) });
      setResult(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters, student, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (name) => (e) => { setPage(1); setFilters((f) => ({ ...f, [name]: e.target.value })); };

  return (
    <div className="stack">
      <div className="card filters-grid">
        <div className="field"><label htmlFor="h-du">Du</label><input id="h-du" type="date" value={filters.du} onChange={setFilter('du')} /></div>
        <div className="field"><label htmlFor="h-au">Au</label><input id="h-au" type="date" value={filters.au} onChange={setFilter('au')} /></div>
        <div className="field"><label htmlFor="h-etu"><GraduationCap size={16} /> Étudiant</label><StudentPicker id="h-etu" value={student} onChange={(v) => { setStudent(v); setPage(1); }} placeholder="Nom ou matricule…" /></div>
        <Select id="h-classe" label="Classe" value={filters.classeId} onChange={setFilter('classeId')}>
          <option value="">Toutes</option>{options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
        <Select id="h-module" label="Module" value={filters.moduleId} onChange={setFilter('moduleId')}>
          <option value="">Tous</option>{options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
        </Select>
        <Select id="h-prof" label="Professeur" value={filters.professeurId} onChange={setFilter('professeurId')}>
          <option value="">Tous</option>{options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
        </Select>
        <Select id="h-statut" label="Statut" value={filters.statut} onChange={setFilter('statut')}>
          <option value="">Tous</option>{Object.entries(PRESENCE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select id="h-just" label="Justification" value={filters.justifie} onChange={setFilter('justifie')}>
          <option value="">Toutes</option><option value="true">Justifiés</option><option value="false">Non justifiés</option>
        </Select>
        <button type="button" className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setStudent(null); setPage(1); }}><RotateCcw size={18} /> Réinitialiser</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Étudiant</th><th>Classe</th><th>Module</th><th>Professeur</th><th>Statut</th><th>Méthode</th><th>Actions</th></tr></thead>
          <tbody>
            {result.items.length === 0 && <tr><td colSpan={8} className="empty">Aucun résultat (seules les séances fermées apparaissent).</td></tr>}
            {result.items.map((r) => {
              const ps = PRESENCE_STATUS[r.statut];
              return (
                <tr key={`${r.seanceId}-${r.etudiantId}`}>
                  <td>{formatDateFr(r.dateSeance)}<small className="muted" style={{ display: 'block' }}>{r.heureDebut} - {r.heureFin}</small></td>
                  <td>{r.prenom} {r.nom}<small className="muted" style={{ display: 'block' }}>{r.matricule}</small></td>
                  <td>{r.classe || '—'}</td>
                  <td><strong>{r.moduleCode}</strong></td>
                  <td>{r.professeur}</td>
                  <td>
                    <span className={`badge ${ps.cls}`}>{ps.label}{r.statut === 'retard' ? ` ${r.minutesRetard} min` : ''}</span>
                    {r.justifie && <span className="badge badge-ok" style={{ marginLeft: '0.3rem' }}>Justifié</span>}
                  </td>
                  <td>{METHODES[r.methode]}</td>
                  <td><button type="button" className="icon-btn" title="Modifier / justifier" aria-label="Modifier" onClick={() => setEdit(r)}><Pencil size={18} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={result.pages} total={result.total} onPage={setPage} />

      {edit && (
        <PresenceEditModal
          seanceId={edit.seanceId} student={{ id: edit.etudiantId, prenom: edit.prenom, nom: edit.nom }} initial={edit}
          retardMax={meta.sessions.retardMaxMin} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); toast.success('Présence modifiée.'); load(); }}
        />
      )}
    </div>
  );
}

export default function Presences() {
  const meta = useMeta();
  const [tab, setTab] = useState('seances');
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/enseignements/options').then((res) => setOptions(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!meta || !options) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><ClipboardCheck size={24} /></span> Présences</h1>
      </div>
      <div className="seg" role="tablist" style={{ maxWidth: 440 }}>
        <button type="button" role="tab" aria-selected={tab === 'seances'} className={tab === 'seances' ? 'on' : ''} onClick={() => setTab('seances')}><ListChecks size={18} /> Séances</button>
        <button type="button" role="tab" aria-selected={tab === 'historique'} className={tab === 'historique' ? 'on' : ''} onClick={() => setTab('historique')}><History size={18} /> Historique</button>
      </div>
      {tab === 'seances' ? <SeancesTab options={options} meta={meta} /> : <HistoriqueTab options={options} meta={meta} />}
    </section>
  );
}