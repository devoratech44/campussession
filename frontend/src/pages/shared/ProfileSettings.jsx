// frontend/src/pages/shared/ProfileSettings.jsx
import { useState } from 'react';
import {
  Settings, User, Mail, Phone, Calendar, Landmark, MapPin, Users, Award, Activity, Hash, GraduationCap,
  School, BookOpen, Layers, BadgeCheck, Save, Lock, ShieldCheck, CircleAlert,
} from 'lucide-react';
import api from '../../api/axios';
import useMeta from '../../hooks/useMeta';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { ROLE_LABEL } from '../../utils/roles';
import Loader from '../../components/common/Loader';
import PhotoPicker from '../../components/common/PhotoPicker';
import PasswordField from '../../components/common/PasswordField';

function Field({ id, label, icon: Icon, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{Icon && <Icon size={16} />} {label}</label>
      {children}
    </div>
  );
}

const ReadOnly = ({ id, label, icon, value }) => (
  <Field id={id} label={label} icon={icon}><input id={id} value={value || '—'} readOnly /></Field>
);

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const meta = useMeta();
  const toast = useToast();

  const isAdmin = user.role === 'admin';
  const isProf = user.role === 'professeur';
  const isStudent = user.role === 'etudiant';

  const [form, setForm] = useState(() => ({
    prenom: user.prenom || '', nom: user.nom || '', email: user.email || '', telephone: user.telephone || '',
    dateNaissance: user.dateNaissance || '', lieuNaissance: user.lieuNaissance || '', adresse: user.adresse || '',
    genre: user.genre || '', specialite: user.specialite || '', statut: user.statut || '',
  }));
  const [file, setFile] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  if (!meta) return <Loader />;

  const today = new Date().toISOString().slice(0, 10);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setSaving(true);
    try {
      const keys = ['prenom', 'nom', 'email', 'telephone', ...(!isAdmin ? ['dateNaissance', 'lieuNaissance', 'adresse', 'genre'] : []), ...(isProf ? ['specialite', 'statut'] : [])];
      const fd = new FormData();
      keys.forEach((k) => fd.append(k, form[k] ?? ''));
      if (file) fd.append('photo', file);
      if (removed) fd.append('supprimerPhoto', 'true');

      const { data } = await api.put('/settings/profile', fd);
      updateUser(data.data);
      setFile(null);
      setRemoved(false);
      toast.success('Profil mis à jour.');
    } catch (err) {
      setProfileError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSaving(true);
    try {
      await api.put('/settings/password', {
        ancienMotDePasse: pwd.ancien, nouveauMotDePasse: pwd.nouveau, confirmation: pwd.confirmation,
      });
      setPwd({ ancien: '', nouveau: '', confirmation: '' });
      toast.success('Mot de passe modifié.');
    } catch (err) {
      setPwdError(errorMessage(err));
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Settings size={24} /></span> Paramètres</h1>
        <span className="badge badge-info">{ROLE_LABEL[user.role]}</span>
      </div>

      <form className="card stack" onSubmit={onSaveProfile}>
        <h2 style={{ margin: 0 }}>Mon profil</h2>
        {profileError && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{profileError}</div>}

        <PhotoPicker
          currentName={user.photo} file={file} removed={removed}
          onPick={(f) => { setFile(f); setRemoved(false); }}
          onRemove={() => { setFile(null); setRemoved(true); }}
          onError={setProfileError}
        />

        <div className="form-grid cols-2">
          <Field id="s-prenom" label="Prénom" icon={User}><input id="s-prenom" value={form.prenom} onChange={set('prenom')} required maxLength={100} /></Field>
          <Field id="s-nom" label="Nom" icon={User}><input id="s-nom" value={form.nom} onChange={set('nom')} required maxLength={100} /></Field>
          <Field id="s-email" label="Email" icon={Mail}><input id="s-email" type="email" value={form.email} onChange={set('email')} required maxLength={150} autoCapitalize="none" /></Field>
          <Field id="s-tel" label="Téléphone" icon={Phone}><input id="s-tel" type="tel" value={form.telephone} onChange={set('telephone')} maxLength={30} /></Field>

          {!isAdmin && (
            <>
              <Field id="s-naiss" label="Date de naissance" icon={Calendar}><input id="s-naiss" type="date" max={today} value={form.dateNaissance} onChange={set('dateNaissance')} required /></Field>
              <Field id="s-lieu" label="Lieu de naissance" icon={Landmark}><input id="s-lieu" value={form.lieuNaissance} onChange={set('lieuNaissance')} required maxLength={150} /></Field>
              <Field id="s-adresse" label="Adresse" icon={MapPin}><input id="s-adresse" value={form.adresse} onChange={set('adresse')} required maxLength={255} /></Field>
              <Field id="s-genre" label="Genre" icon={Users}>
                <select id="s-genre" value={form.genre} onChange={set('genre')} required>
                  <option value="">Choisir…</option>
                  {meta.genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </>
          )}

          {isProf && (
            <>
              <Field id="s-spec" label="Spécialité" icon={Award}><input id="s-spec" value={form.specialite} onChange={set('specialite')} maxLength={150} /></Field>
              <Field id="s-statut" label="Statut" icon={Activity}>
                <select id="s-statut" value={form.statut} onChange={set('statut')}>
                  {meta.statutsProfesseur.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
        </div>

        {!isAdmin && (
          <>
            <h4 className="section-title"><Lock size={16} /> Informations gérées par l&apos;administration</h4>
            <div className="form-grid cols-2">
              <ReadOnly id="r-mat" label="Matricule" icon={Hash} value={user.matricule} />
              {isStudent && (
                <>
                  <ReadOnly id="r-classe" label="Classe" icon={School} value={user.classe?.nom} />
                  <ReadOnly id="r-filiere" label="Filière" icon={BookOpen} value={user.filiere?.nom} />
                  <ReadOnly id="r-niveau" label="Niveau" icon={Layers} value={user.niveau} />
                  <ReadOnly id="r-etat" label="État académique" icon={BadgeCheck} value={user.etatAcademique} />
                </>
              )}
            </div>
            {isStudent && <small className="hint"><GraduationCap size={14} style={{ verticalAlign: 'text-bottom' }} /> Contactez l&apos;administrateur pour modifier ces informations.</small>}
          </>
        )}

        <div><button type="submit" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer le profil'}</button></div>
      </form>

      <form className="card stack" onSubmit={onChangePassword}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={22} /> Mot de passe</h2>
        {pwdError && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{pwdError}</div>}
        <div className="form-grid">
          <PasswordField id="p-old" label="Mot de passe actuel" value={pwd.ancien} onChange={(v) => setPwd((p) => ({ ...p, ancien: v }))} strength={false} autoComplete="current-password" />
          <PasswordField id="p-new" label="Nouveau mot de passe" value={pwd.nouveau} onChange={(v) => setPwd((p) => ({ ...p, nouveau: v }))} meta={meta} />
          <PasswordField id="p-conf" label="Confirmation" value={pwd.confirmation} onChange={(v) => setPwd((p) => ({ ...p, confirmation: v }))} strength={false} />
        </div>
        <div><button type="submit" className="btn" disabled={pwdSaving || !pwd.ancien || !pwd.nouveau || !pwd.confirmation}><ShieldCheck size={18} /> {pwdSaving ? 'Modification…' : 'Changer le mot de passe'}</button></div>
      </form>
    </section>
  );
}