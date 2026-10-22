// frontend/src/pages/admin/Surveillance.jsx
import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Plus, Play, Square, Eye, Ban, CircleAlert, Save } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import StudentPicker from '../../components/common/StudentPicker';

const REFRESH = Number(import.meta.env.VITE_SURV_REFRESH_MS) || 5000;
const ST = { brouillon: 'Brouillon', active: 'Active', terminee: 'Terminée' };
const ET = { attendu: 'Attendu', en_cours: 'En cours', termine: 'Terminé', exclu: 'Exclu' };
const when = (iso) => (iso ? `${new Date(iso).toLocaleTimeString('fr-FR', { timeZone: TIMEZONE })} ${TIMEZONE_LABEL}` : '—');
const EMPTY = { titre: '', type: 'devoir', dureeMinutes: 60, maxAlertes: 3, consignes: '', outils: 'Word, VS Code, Sublime Text, Bloc-notes', classeId: '', extra: [] };

function Detail({ id, onClose }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const load = useCallback(() => api.get(`/surveillance/${id}`).then((r) => setD(r.data.data)).catch(() => {}), [id]);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);
  const exclure = async (eid) => {
    try { await api.put(`/surveillance/${id}/etudiants/${eid}/exclure`); toast.success('Étudiant exclu.'); load(); } catch (err) { toast.error(errorMessage(err)); }
  };
  return (
    <Modal title={d ? `${d.surveillance.titre} · suivi en direct` : 'Suivi'} icon={ShieldAlert} onClose={onClose}>
      {!d ? <Loader /> : (
        <div className="stack">
          <div className="table-wrap"><table>
            <thead><tr><th>Étudiant</th><th>Statut</th><th>Avertissements</th><th>Entré à</th><th /></tr></thead>
            <tbody>{d.etudiants.map((e) => (
              <tr key={e.id}>
                <td>{e.prenom} {e.nom}<small className="muted" style={{ display: 'block' }}>{e.matricule}</small></td>
                <td><span className={`badge ${e.statut === 'exclu' ? 'badge-ko' : 'badge-info'}`}>{ET[e.statut]}</span></td>
                <td>{e.alertes} / {d.surveillance.maxAlertes}</td>
                <td>{when(e.entreAt)}</td>
                <td>{e.statut !== 'exclu' && <button type="button" className="icon-btn danger" title="Exclure" aria-label="Exclure" onClick={() => exclure(e.id)}><Ban size={18} /></button>}</td>
              </tr>))}</tbody>
          </table></div>
          <strong>Journal des entrées et sorties</strong>
          <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto' }}><table>
            <thead><tr><th>Heure</th><th>Étudiant</th><th>Événement</th></tr></thead>
            <tbody>{d.logs.length === 0 && <tr><td colSpan={3} className="empty">Aucun événement.</td></tr>}
              {d.logs.map((l) => (
                <tr key={l.id} style={l.alerte ? { color: 'var(--danger, #ef4444)' } : undefined}>
                  <td>{when(l.createdAt)}</td><td>{l.etudiant}</td><td>{l.type}{l.detail ? ` · ${l.detail}` : ''}</td>
                </tr>))}</tbody>
          </table></div>
          <small className="hint">Pour une fraude avérée, saisissez la note 00/20 dans « Devoirs, examens et notes ».</small>
        </div>
      )}
    </Modal>
  );
}

export default function Surveillance() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(null);
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/surveillance').then((r) => setItems(r.data.data)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); api.get('/enseignements/options').then((r) => setOptions(r.data.data)).catch(() => {}); }, [load]);

  if (!items || !options) return error ? <div className="alert alert-error"><CircleAlert size={18} />{error}</div> : <Loader />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const addExtra = (s) => { if (s && !form.extra.some((x) => x.id === s.id)) setForm((f) => ({ ...f, extra: [...f.extra, s] })); setPicked(null); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/surveillance', { ...form, dureeMinutes: Number(form.dureeMinutes), maxAlertes: Number(form.maxAlertes), classeId: form.classeId || undefined, etudiantIds: form.extra.map((x) => x.id) });
      toast.success('Surveillance créée (non activée).');
      setForm(null);
      load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };
  const act = async (id, what) => { try { await api.put(`/surveillance/${id}/${what}`); toast.success(what === 'activer' ? 'Activée : les étudiants concernés voient le lien.' : 'Terminée.'); load(); } catch (err) { toast.error(errorMessage(err)); } };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><ShieldAlert size={24} /></span> Surveillance des devoirs</h1>
        <button type="button" className="btn" onClick={() => setForm(EMPTY)}><Plus size={20} /> Nouvelle session</button>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Session</th><th>Statut</th><th>Durée</th><th>Étudiants</th><th>En cours</th><th>Avertissements</th><th>Actions</th></tr></thead>
        <tbody>{items.length === 0 && <tr><td colSpan={7} className="empty">Aucune session.</td></tr>}
          {items.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.titre}</strong><small className="muted" style={{ display: 'block' }}>{s.type === 'examen' ? 'Mini-examen' : 'Mini-devoir'}</small></td>
              <td><span className={`badge ${s.statut === 'active' ? 'badge-ok' : ''}`}>{ST[s.statut]}</span></td>
              <td>{s.dureeMinutes} min</td><td>{s.nbEtudiants}</td><td>{s.nbEnCours}</td><td>{s.nbAlertes}</td>
              <td><div className="actions">
                {s.statut === 'brouillon' && <button type="button" className="icon-btn" title="Activer" aria-label="Activer" onClick={() => act(s.id, 'activer')}><Play size={18} /></button>}
                {s.statut === 'active' && <button type="button" className="icon-btn danger" title="Terminer" aria-label="Terminer" onClick={() => act(s.id, 'terminer')}><Square size={18} /></button>}
                <button type="button" className="icon-btn" title="Suivi" aria-label="Suivi" onClick={() => setView(s.id)}><Eye size={18} /></button>
              </div></td>
            </tr>))}</tbody>
      </table></div>

      {form && (
        <Modal title="Nouvelle session surveillée" icon={ShieldAlert} onClose={() => setForm(null)} busy={saving}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Annuler</button><button type="submit" form="surv-form" className="btn" disabled={saving}><Save size={18} /> Créer</button></>}>
          <form id="surv-form" className="stack" onSubmit={save}>
            <div className="field"><label htmlFor="s-t">Titre</label><input id="s-t" value={form.titre} onChange={set('titre')} required maxLength={200} /></div>
            <div className="form-grid cols-2">
              <div className="field"><label htmlFor="s-ty">Type</label><select id="s-ty" value={form.type} onChange={set('type')}><option value="devoir">Mini-devoir</option><option value="examen">Mini-examen</option></select></div>
              <div className="field"><label htmlFor="s-d">Durée (minutes)</label><input id="s-d" type="number" min="5" max="480" value={form.dureeMinutes} onChange={set('dureeMinutes')} required /></div>
              <div className="field"><label htmlFor="s-m">Avertissements avant exclusion</label><input id="s-m" type="number" min="1" max="20" value={form.maxAlertes} onChange={set('maxAlertes')} /></div>
              <div className="field"><label htmlFor="s-c">Classe concernée</label><select id="s-c" value={form.classeId} onChange={set('classeId')}><option value="">Aucune</option>{options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
            </div>
            <div className="field"><label>Ajouter des étudiants</label><StudentPicker value={picked} onChange={addExtra} placeholder="Nom ou matricule…" />
              {form.extra.length > 0 && <small className="hint">{form.extra.map((x) => x.label).join(', ')}</small>}</div>
            <div className="field"><label htmlFor="s-o">Outils autorisés (affichés à l&apos;étudiant)</label><input id="s-o" value={form.outils} onChange={set('outils')} maxLength={500} /></div>
            <div className="field"><label htmlFor="s-co">Consignes</label><textarea id="s-co" rows={4} value={form.consignes} onChange={set('consignes')} /></div>
          </form>
        </Modal>
      )}
      {view && <Detail id={view} onClose={() => setView(null)} />}
    </section>
  );
}