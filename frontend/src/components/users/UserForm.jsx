// frontend/src/components/users/UserForm.jsx
import { useMemo, useState } from 'react';
import {
  UserPlus, Pencil, GraduationCap, Presentation, User, Mail, Phone, Calendar, Landmark, MapPin, Hash, Users,
  BookOpen, Layers, School, BadgeCheck, Award, Activity, CircleAlert, Save,
} from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Modal from '../common/Modal';
import PhotoPicker from '../common/PhotoPicker';
import PasswordField from '../common/PasswordField';

const COMMON = ['prenom', 'nom', 'dateNaissance', 'lieuNaissance', 'adresse', 'genre', 'email', 'telephone', 'matricule'];
const STUDENT = ['niveau', 'filiereId', 'classeId', 'etatAcademique'];
const PROF = ['specialite', 'statut'];

const EMPTY = {
  role: 'etudiant', prenom: '', nom: '', dateNaissance: '', lieuNaissance: '', adresse: '', genre: '', email: '',
  telephone: '', matricule: '', niveau: '', filiereId: '', classeId: '', etatAcademique: '', specialite: '', statut: '', motDePasse: '',
};

const fromUser = (u) => ({
  ...EMPTY,
  role: u.role,
  prenom: u.prenom || '', nom: u.nom || '', dateNaissance: u.dateNaissance || '', lieuNaissance: u.lieuNaissance || '',
  adresse: u.adresse || '', genre: u.genre || '', email: u.email || '', telephone: u.telephone || '', matricule: u.matricule || '',
  niveau: u.niveau || '', filiereId: u.filiereId ? String(u.filiereId) : '', classeId: u.classeId ? String(u.classeId) : '',
  etatAcademique: u.etatAcademique || '', specialite: u.specialite || '', statut: u.statut || '',
});

function Field({ id, label, icon: Icon, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{Icon && <Icon size={16} />} {label}</label>
      {children}
    </div>
  );
}

export default function UserForm({ mode, user, meta, structure, onClose, onSaved }) {
  const isCreate = mode === 'create';
  const [form, setForm] = useState(() => (isCreate ? { ...EMPTY, statut: meta.statutsProfesseur[0] } : fromUser(user)));
  const [file, setFile] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { role } = form;
  const today = new Date().toISOString().slice(0, 10);

  const filieres = useMemo(() => structure.filieres.filter((f) => f.niveau === form.niveau), [structure.filieres, form.niveau]);
  const classes = useMemo(
    () => structure.classes.filter((c) => c.filieres.some((f) => String(f.id) === form.filiereId)),
    [structure.classes, form.filiereId]
  );

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const onNiveau = (e) => setForm((f) => ({ ...f, niveau: e.target.value, filiereId: '', classeId: '' }));
  const onFiliere = (e) => {
    const filiereId = e.target.value;
    setForm((f) => {
      const matching = structure.classes.filter((c) => c.filieres.some((x) => String(x.id) === filiereId));
      return { ...f, filiereId, classeId: matching.length === 1 ? String(matching[0].id) : '' };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      [...COMMON, ...(role === 'etudiant' ? STUDENT : PROF)].forEach((key) => fd.append(key, form[key] ?? ''));
      if (isCreate) { fd.append('role', role); fd.append('motDePasse', form.motDePasse); }
      if (file) fd.append('photo', file);
      if (removed) fd.append('supprimerPhoto', 'true');

      const { data } = isCreate ? await api.post('/users', fd) : await api.put(`/users/${user.id}`, fd);
      onSaved(data.data, isCreate);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const title = isCreate ? 'Nouvel utilisateur' : `Modifier ${user.prenom} ${user.nom}`;

  return (
    <Modal
      title={title} icon={isCreate ? UserPlus : Pencil} wide onClose={onClose} busy={saving}
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" form="user-form" className="btn" disabled={saving}><Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <form id="user-form" onSubmit={onSubmit} className="stack" noValidate={false}>
        <PhotoPicker
          currentName={user?.photo} file={file} removed={removed}
          onPick={(f) => { setFile(f); setRemoved(false); }}
          onRemove={() => { setFile(null); setRemoved(true); }}
          onError={setError}
        />

        {isCreate && (
          <div className="seg" role="group" aria-label="Type de compte">
            <button type="button" className={role === 'etudiant' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, role: 'etudiant' }))}><GraduationCap size={18} /> Étudiant</button>
            <button type="button" className={role === 'professeur' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, role: 'professeur' }))}><Presentation size={18} /> Professeur</button>
          </div>
        )}

        <h4 className="section-title"><User size={16} /> Identité</h4>
        <div className="form-grid cols-2">
          <Field id="prenom" label="Prénom" icon={User}><input id="prenom" value={form.prenom} onChange={set('prenom')} required maxLength={100} /></Field>
          <Field id="nom" label="Nom" icon={User}><input id="nom" value={form.nom} onChange={set('nom')} required maxLength={100} /></Field>
          <Field id="dateNaissance" label="Date de naissance" icon={Calendar}><input id="dateNaissance" type="date" max={today} value={form.dateNaissance} onChange={set('dateNaissance')} required /></Field>
          <Field id="lieuNaissance" label="Lieu de naissance" icon={Landmark}><input id="lieuNaissance" value={form.lieuNaissance} onChange={set('lieuNaissance')} required maxLength={150} /></Field>
          <Field id="adresse" label="Adresse" icon={MapPin}><input id="adresse" value={form.adresse} onChange={set('adresse')} required maxLength={255} /></Field>
          <Field id="genre" label="Genre" icon={Users}>
            <select id="genre" value={form.genre} onChange={set('genre')} required>
              <option value="">Choisir…</option>
              {meta.genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <h4 className="section-title"><Mail size={16} /> Compte</h4>
        <div className="form-grid cols-2">
          <Field id="matricule" label="Matricule (identifiant de connexion)" icon={Hash}><input id="matricule" value={form.matricule} onChange={set('matricule')} required maxLength={50} autoCapitalize="characters" /></Field>
          <Field id="email" label="Email (reçoit le code de vérification)" icon={Mail}><input id="email" type="email" value={form.email} onChange={set('email')} required maxLength={150} autoCapitalize="none" /></Field>
          <Field id="telephone" label="Téléphone (facultatif)" icon={Phone}><input id="telephone" type="tel" value={form.telephone} onChange={set('telephone')} maxLength={30} /></Field>
        </div>

        {role === 'etudiant' ? (
          <>
            <h4 className="section-title"><GraduationCap size={16} /> Parcours académique</h4>
            <div className="form-grid cols-2">
              <Field id="niveau" label="Niveau" icon={Layers}>
                <select id="niveau" value={form.niveau} onChange={onNiveau} required>
                  <option value="">Choisir…</option>
                  {meta.niveaux.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field id="filiereId" label="Filière" icon={BookOpen}>
                <select id="filiereId" value={form.filiereId} onChange={onFiliere} required disabled={!form.niveau}>
                  <option value="">{form.niveau ? 'Choisir…' : "Choisissez d'abord le niveau"}</option>
                  {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </Field>
              <Field id="classeId" label="Classe" icon={School}>
                <select id="classeId" value={form.classeId} onChange={set('classeId')} required disabled={!form.filiereId}>
                  <option value="">{form.filiereId ? 'Choisir…' : "Choisissez d'abord la filière"}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>
              <Field id="etatAcademique" label="État académique" icon={BadgeCheck}>
                <select id="etatAcademique" value={form.etatAcademique} onChange={set('etatAcademique')} required>
                  <option value="">Choisir…</option>
                  {meta.etatsAcademiques.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </>
        ) : (
          <>
            <h4 className="section-title"><Presentation size={16} /> Profil professeur</h4>
            <div className="form-grid cols-2">
              <Field id="specialite" label="Spécialité" icon={Award}><input id="specialite" value={form.specialite} onChange={set('specialite')} maxLength={150} /></Field>
              <Field id="statut" label="Statut" icon={Activity}>
                <select id="statut" value={form.statut} onChange={set('statut')}>
                  {meta.statutsProfesseur.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {isCreate && (
          <>
            <PasswordField id="motDePasse" label="Mot de passe initial" value={form.motDePasse} meta={meta} generator onChange={(v) => setForm((f) => ({ ...f, motDePasse: v }))} />
            <small className="hint">À communiquer à l&apos;utilisateur. Un code à 6 chiffres lui sera envoyé par email à sa première connexion.</small>
          </>
        )}
      </form>
    </Modal>
  );
}