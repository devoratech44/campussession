// frontend/src/pages/admin/Notifications.jsx
import { useCallback, useEffect, useState } from 'react';
import { Bell, Plus, Send, Trash2, Eye, CircleAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StudentPicker from '../../components/common/StudentPicker';

const TYPES = {
  information: 'Information', devoir: 'Devoir', examen: 'Examen', notes: 'Notes',
  presences: 'Présences', emploi_du_temps: 'Emploi du temps', systeme: 'Système',
};
const CIBLES = { tous: 'Tous', classe: 'Une classe', filiere: 'Une filière', groupe: 'Un groupe', utilisateur: 'Une personne' };

const EMPTY = { titre: '', message: '', type: 'information', cibleType: 'tous', role: 'tous', cibleId: '', kind: 'etudiant' };

const when = (iso) => (iso
  ? `${new Date(iso).toLocaleString('fr-FR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' })} ${TIMEZONE_LABEL}`
  : '—');

export default function Notifications() {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(null);       // modal d'envoi
  const [student, setStudent] = useState(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/enseignements/options').then((r) => setOptions(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/notifications', { params: { page, type: type || undefined } });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => { load(); }, [load]);

  if (!options || (loading && !data)) return <Loader />;

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value, ...(name === 'cibleType' ? { cibleId: '' } : {}) }));

  const openForm = () => { setForm(EMPTY); setStudent(null); setFormError(''); };

  const send = async (e) => {
    e.preventDefault();
    setFormError('');
    const cibleId = form.cibleType === 'utilisateur' && form.kind === 'etudiant' ? student?.id : form.cibleId;
    setSending(true);
    try {
      const { data: res } = await api.post('/notifications', {
        titre: form.titre, message: form.message, type: form.type, cibleType: form.cibleType,
        role: form.cibleType === 'tous' ? form.role : undefined,
        cibleId: form.cibleType === 'tous' ? undefined : Number(cibleId) || undefined,
      });
      toast.success(`Notification envoyée à ${res.data.destinataires} destinataire(s).`);
      setForm(null);
      setPage(1);
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const openDetail = async (n) => {
    try {
      const { data: res } = await api.get(`/notifications/${n.id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/notifications/${confirm.id}`);
      toast.success('Notification supprimée.');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const picker = () => {
    if (!form || form.cibleType === 'tous') return null;
    if (form.cibleType === 'utilisateur') {
      return (
        <>
          <div className="field">
            <label htmlFor="n-kind">Type de personne</label>
            <select id="n-kind" value={form.kind} onChange={set('kind')}>
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="n-user">{form.kind === 'etudiant' ? 'Étudiant' : 'Professeur'}</label>
            {form.kind === 'etudiant'
              ? <StudentPicker id="n-user" value={student} onChange={setStudent} placeholder="Nom ou matricule…" />
              : (
                <select id="n-user" value={form.cibleId} onChange={set('cibleId')} required>
                  <option value="">Choisir…</option>
                  {options.professeurs.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              )}
          </div>
        </>
      );
    }
    const list = { classe: options.classes, filiere: options.filieres, groupe: options.groupes }[form.cibleType];
    return (
      <div className="field">
        <label htmlFor="n-cible">{CIBLES[form.cibleType]}</label>
        <select id="n-cible" value={form.cibleId} onChange={set('cibleId')} required>
          <option value="">Choisir…</option>
          {list.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </div>
    );
  };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Bell size={24} /></span> Notifications</h1>
        <button type="button" className="btn" onClick={openForm}><Plus size={20} /> Nouvelle notification</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="n-filter">Type</label>
          <select id="n-filter" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Notification</th><th>Type</th><th>Cible</th><th>Lues</th><th>Envoyée</th><th>Actions</th></tr></thead>
          <tbody>
            {data?.items.length === 0 && <tr><td colSpan={6} className="empty">Aucune notification envoyée.</td></tr>}
            {data?.items.map((n) => (
              <tr key={n.id}>
                <td><strong>{n.titre}</strong><small className="muted" style={{ display: 'block' }}>{n.auteur || 'Système'}</small></td>
                <td><span className="badge badge-info">{TYPES[n.type]}</span></td>
                <td>{n.cibleLabel || '—'}</td>
                <td>{n.lues} / {n.total}</td>
                <td>{when(n.createdAt)}</td>
                <td>
                  <div className="actions">
                    <button type="button" className="icon-btn" title="Voir" aria-label="Voir" onClick={() => openDetail(n)}><Eye size={18} /></button>
                    <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm(n)}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} notification(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}

      {form && (
        <Modal
          title="Nouvelle notification" icon={Send} onClose={() => setForm(null)} busy={sending}
          footer={(
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)} disabled={sending}>Annuler</button>
              <button type="submit" form="notif-form" className="btn" disabled={sending}><Send size={18} /> {sending ? 'Envoi…' : 'Envoyer'}</button>
            </>
          )}
        >
          {formError && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{formError}</div>}
          <form id="notif-form" className="stack" onSubmit={send}>
            <div className="field">
              <label htmlFor="n-titre">Titre</label>
              <input id="n-titre" value={form.titre} onChange={set('titre')} maxLength={200} required />
            </div>
            <div className="field">
              <label htmlFor="n-msg">Message</label>
              <textarea id="n-msg" value={form.message} onChange={set('message')} maxLength={5000} rows={5} required />
            </div>
            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="n-type">Type</label>
                <select id="n-type" value={form.type} onChange={set('type')}>
                  {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="n-cibletype">Destinataires</label>
                <select id="n-cibletype" value={form.cibleType} onChange={set('cibleType')}>
                  {Object.entries(CIBLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {form.cibleType === 'tous' && (
              <div className="field">
                <label htmlFor="n-role">Qui ?</label>
                <select id="n-role" value={form.role} onChange={set('role')}>
                  <option value="tous">Étudiants et professeurs</option>
                  <option value="etudiant">Étudiants uniquement</option>
                  <option value="professeur">Professeurs uniquement</option>
                </select>
              </div>
            )}
            {picker()}
            <small className="hint">Les classes, filières et groupes concernent leurs étudiants.</small>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.titre} icon={Bell} onClose={() => setDetail(null)}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detail.message}</p>
          <small className="hint">{TYPES[detail.type]} · {detail.cibleLabel} · {when(detail.createdAt)}</small>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Destinataire</th><th>Rôle</th><th>Statut</th></tr></thead>
              <tbody>
                {detail.destinataires.map((d) => (
                  <tr key={d.id}>
                    <td>{d.prenom} {d.nom}<small className="muted" style={{ display: 'block' }}>{d.matricule || ''}</small></td>
                    <td>{d.role === 'etudiant' ? 'Étudiant' : 'Professeur'}</td>
                    <td>{d.estLue ? <span className="badge badge-ok">Lue {when(d.lueAt)}</span> : <span className="badge badge-ko">Non lue</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Supprimer cette notification ?" icon={Trash2} danger confirmLabel="Supprimer" busy={busy}
          message={`« ${confirm.titre} » sera retirée de la cloche des ${confirm.total} destinataire(s).`}
          onConfirm={onDelete} onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}