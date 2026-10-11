// frontend/src/pages/admin/Utilisateurs.jsx
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, UserPlus, Search, RotateCcw, Pencil, KeyRound, Ban, ShieldCheck, Trash2, MailCheck,
  ChevronLeft, ChevronRight, CircleAlert, GraduationCap, Presentation, BadgeCheck, Wifi,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage, photoUrl } from '../../utils/format';
import Loader from '../../components/common/Loader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import UserForm from '../../components/users/UserForm';
import PasswordModal from '../../components/users/PasswordModal';
import BlockModal from '../../components/users/BlockModal';

export default function Utilisateurs() {
  const meta = useMeta();
  const toast = useToast();
  const [params] = useSearchParams();

  const [role, setRole] = useState(params.get('role') || '');
  const [classeId, setClasseId] = useState('');
  const [bloques, setBloques] = useState(params.get('bloques') === 'true');
  const [search, setSearch] = useState(params.get('search') || '');
  const [debounced, setDebounced] = useState(search.trim());
  const [page, setPage] = useState(1);

  const [result, setResult] = useState({ items: [], total: 0, pages: 1, limit: 0 });
  const [structure, setStructure] = useState({ classes: [], filieres: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(null);       // { mode, user }
  const [pwdUser, setPwdUser] = useState(null);
  const [blockUser, setBlockUser] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'code', user }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, env.searchDebounceMs);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/filieres')])
      .then(([c, f]) => setStructure({ classes: c.data.data, filieres: f.data.data }))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: { role: role || undefined, classeId: classeId || undefined, bloques: bloques || undefined, search: debounced || undefined, page },
      });
      setResult(data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [role, classeId, bloques, debounced, page]);

  useEffect(() => { load(); }, [load]);

  if (!meta) return <Loader />;

  const reset = () => { setRole(''); setClasseId(''); setBloques(false); setSearch(''); setPage(1); };

  const run = async (action, okMessage) => {
    setBusy(true);
    try {
      await action();
      toast.success(okMessage);
      await load();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onUnblock = (u) => run(() => api.put(`/users/${u.id}/unblock`), `${u.prenom} ${u.nom} a été débloqué.`);

  const onConfirm = async () => {
    const { type, user } = confirm;
    const ok = type === 'delete'
      ? await run(() => api.delete(`/users/${user.id}`), 'Compte supprimé.')
      : await run(() => api.put(`/users/${user.id}/force-code`), 'Code forcé : un nouveau code sera demandé à la prochaine connexion.');
    if (ok) {
      if (type === 'delete' && result.items.length === 1 && page > 1) setPage((p) => p - 1);
      setConfirm(null);
    }
  };

  const onSaved = (saved, created) => {
    setForm(null);
    toast.success(created ? `Compte créé : ${saved.prenom} ${saved.nom}.` : 'Modifications enregistrées.');
    load();
  };

  const { maxLates, maxAbsences } = meta.blocking;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Users size={24} /></span> Utilisateurs</h1>
        <button type="button" className="btn" onClick={() => setForm({ mode: 'create', user: null })}><UserPlus size={20} /> Nouvel utilisateur</button>
      </div>

      <div className="card toolbar">
        <div className="field">
          <label htmlFor="search"><Search size={16} /> Recherche</label>
          <input id="search" type="search" placeholder="Nom, email, matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="roleFilter">Rôle</label>
          <select id="roleFilter" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            <option value="etudiant">Étudiants</option>
            <option value="professeur">Professeurs</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="classeFilter">Classe</label>
          <select id="classeFilter" value={classeId} onChange={(e) => { setClasseId(e.target.value); setPage(1); }}>
            <option value="">Toutes</option>
            {structure.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={bloques} onChange={(e) => { setBloques(e.target.checked); setPage(1); }} /> Bloqués
        </label>
        <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={18} /> Réinitialiser</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Utilisateur</th><th>Matricule</th><th>Rôle</th><th>Classe / Spécialité</th><th>Non justifiés</th><th>État</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="empty">Chargement…</td></tr>}
            {!loading && result.items.length === 0 && <tr><td colSpan={7} className="empty">Aucun utilisateur trouvé.</td></tr>}
            {!loading && result.items.map((u) => {
              const student = u.role === 'etudiant';
              return (
                <tr key={u.id}>
                  <td>
                    <div className="cell-user">
                      <img className="avatar" src={photoUrl(u.photo)} alt="" />
                      <span>{u.prenom} {u.nom}<small>{u.email}</small></span>
                    </div>
                  </td>
                  <td>{u.matricule}</td>
                  <td>
                    <span className="badge badge-info">
                      {student ? <GraduationCap size={12} /> : <Presentation size={12} />} {student ? 'Étudiant' : 'Professeur'}
                    </span>
                  </td>
                  <td>
                    {student
                      ? <span>{u.classe?.nom || '—'}<small className="muted" style={{ display: 'block' }}>{u.filiere?.nom} · {u.niveau}</small></span>
                      : <span>{u.specialite || '—'}<small className="muted" style={{ display: 'block' }}>{u.statut}</small></span>}
                  </td>
                  <td>
                    {student ? (
                      <div className="badges">
                        <span className={`badge ${u.retardsNonJustifies > maxLates ? 'badge-absent' : 'badge-retard'}`}>{u.retardsNonJustifies} retard(s)</span>
                        <span className={`badge ${u.absencesNonJustifies > maxAbsences ? 'badge-absent' : 'badge-retard'}`}>{u.absencesNonJustifies} absence(s)</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="badges">
                      {u.estBloque && <span className="badge badge-ko"><Ban size={12} /> Bloqué</span>}
                      {!u.estVerifie && <span className="badge badge-warn"><MailCheck size={12} /> Code requis</span>}
                      {u.estVerifie && !u.estBloque && <span className="badge badge-ok"><BadgeCheck size={12} /> Vérifié</span>}
                      {u.enLigne && <span className="badge badge-present"><Wifi size={12} /> En ligne</span>}
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <button type="button" className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setForm({ mode: 'edit', user: u })}><Pencil size={18} /></button>
                      <button type="button" className="icon-btn" title="Nouveau mot de passe" aria-label="Nouveau mot de passe" onClick={() => setPwdUser(u)}><KeyRound size={18} /></button>
                      <button type="button" className="icon-btn" title="Forcer le code à 6 chiffres" aria-label="Forcer le code" onClick={() => setConfirm({ type: 'code', user: u })}><MailCheck size={18} /></button>
                      {u.estBloque
                        ? <button type="button" className="icon-btn" title="Débloquer" aria-label="Débloquer" disabled={busy} onClick={() => onUnblock(u)}><ShieldCheck size={18} /></button>
                        : <button type="button" className="icon-btn danger" title="Bloquer" aria-label="Bloquer" onClick={() => setBlockUser(u)}><Ban size={18} /></button>}
                      <button type="button" className="icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => setConfirm({ type: 'delete', user: u })}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span className="muted">{result.total} utilisateur(s) · page {page} / {result.pages}</span>
        <div className="actions">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <button type="button" className="btn btn-ghost" disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      </div>

      {form && <UserForm mode={form.mode} user={form.user} meta={meta} structure={structure} onClose={() => setForm(null)} onSaved={onSaved} />}
      {pwdUser && <PasswordModal user={pwdUser} meta={meta} onClose={() => setPwdUser(null)} onDone={() => { setPwdUser(null); toast.success('Nouveau mot de passe défini.'); }} />}
      {blockUser && <BlockModal user={blockUser} onClose={() => setBlockUser(null)} onDone={() => { setBlockUser(null); toast.success('Compte bloqué.'); load(); }} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'delete' ? 'Supprimer ce compte ?' : 'Forcer le code de vérification ?'}
          icon={confirm.type === 'delete' ? Trash2 : MailCheck}
          danger={confirm.type === 'delete'}
          confirmLabel={confirm.type === 'delete' ? 'Supprimer' : 'Forcer le code'}
          message={confirm.type === 'delete'
            ? `${confirm.user.prenom} ${confirm.user.nom} sera supprimé définitivement, avec ses présences, notes, rendus et assignations. Cette action est irréversible.`
            : `${confirm.user.prenom} ${confirm.user.nom} sera déconnecté dans les 30 secondes et devra saisir un nouveau code à 6 chiffres reçu par email.`}
          busy={busy}
          onConfirm={onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}