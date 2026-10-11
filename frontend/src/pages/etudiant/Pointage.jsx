// frontend/src/pages/etudiant/Pointage.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ScanLine, Keyboard, PenLine, ShieldCheck, CircleAlert, CircleCheck, Clock, DoorOpen, Presentation,
  CalendarDays, ArrowLeft, Hourglass, Smartphone, Monitor, Check, Camera, Lock, ListChecks,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import useMeta from '../../hooks/useMeta';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import { METHODES, TIMEZONE_LABEL, timeOf } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import SignaturePad from '../../components/common/SignaturePad';
import SuccessCelebration from '../../components/presence/SuccessCelebration';
import QrScanner from '../../components/presence/QrScanner';
import UpcomingList, { dayWord } from '../../components/etudiant/UpcomingList';
import '../../styles/etudiant.css';

const toCelebration = (r) => ({
  prenom: r.prenom, module: r.module, professeur: r.professeur, salle: r.salle,
  heure: timeOf(r.pointeAt), methode: METHODES[r.methode], statut: r.statut, retardMin: r.minutesRetard,
});

const SEANCE_BADGE = {
  ouverte: { label: 'Ouverte', cls: 'badge-ok' },
  fermee: { label: 'Fermée', cls: '' },
  annulee: { label: 'Annulée', cls: 'badge-ko' },
};

function presenceBadge(c) {
  if (c.statut === 'annulee') return { label: 'Aucune absence comptée', cls: '' };
  if (c.dejaPointe) {
    return c.presence.statut === 'retard'
      ? { label: `Pointé · retard ${c.presence.minutesRetard} min`, cls: 'badge-retard' }
      : { label: 'Pointé · présent', cls: 'badge-present' };
  }
  if (c.statut === 'fermee') {
    const st = c.presence?.statut;
    if (st === 'present') return { label: 'Présent', cls: 'badge-present' };
    if (st === 'retard') return { label: `Retard ${c.presence.minutesRetard} min`, cls: 'badge-retard' };
    return { label: c.presence?.justifie ? 'Absent · justifié' : 'Absent', cls: 'badge-absent' };
  }
  if (c.presence?.signatureFaite) return { label: 'Signé · à valider', cls: 'badge-info' };
  return { label: 'À pointer', cls: 'badge-info' };
}

function CourseCard({ c, active, onSelect }) {
  const sb = SEANCE_BADGE[c.statut];
  const pb = presenceBadge(c);
  return (
    <div
      className={`course ${active ? 'on' : ''} ${onSelect ? 'clickable' : ''}`}
      role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect} onKeyDown={onSelect ? (e) => { if (e.key === 'Enter') onSelect(); } : undefined}
    >
      <div className="course__time">{c.heureDebut}<small>{c.heureFin}</small></div>
      <div className="course__body">
        <strong>{c.moduleCode} · {c.moduleNom}</strong>
        <span className="meta-line">
          <span><DoorOpen size={14} /> {c.salle || '—'}</span>
          <span><Presentation size={14} /> {c.professeur}</span>
        </span>
      </div>
      <div className="course__badges">
        <span className={`badge ${sb.cls}`}>{sb.label}</span>
        <span className={`badge ${pb.cls}`}>{pb.label}</span>
      </div>
    </div>
  );
}

// ======================================================================
// Arrivée par QR code (téléphone) : /etudiant/pointage/:token
// ======================================================================
function PointageQr({ token }) {
  const [params] = useSearchParams();
  const k = params.get('k');
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState(null);
  const [padKey, setPadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const auto = useRef(false);

  useEffect(() => {
    api.get('/presences/pointage/info', { params: { token, k } })
      .then((res) => setState(res.data.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, k]);

  const submit = useCallback(async (payload) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/presences/pointage', payload);
      setResult(data.data);
    } catch (err) {
      setError(errorMessage(err));
      setSignature(null);
      setPadKey((x) => x + 1);
    } finally {
      setBusy(false);
    }
  }, []);

  // Signature déjà enregistrée : le scan valide directement
  useEffect(() => {
    if (state?.peutPointer && state.signatureFaite && !auto.current) {
      auto.current = true;
      submit({ token, proof: state.proof });
    }
  }, [token, state, submit]);

  if (loading) return <Loader />;

  if (result && !result.dejaPointe) return <SuccessCelebration open info={toCelebration(result)} onClose={() => navigate('/etudiant')} />;

  const done = state?.dejaPointe ? state.resume : (result?.dejaPointe ? result : null);
  if (done) {
    const late = done.statut === 'retard';
    return (
      <section className="card rise result-box" style={{ maxWidth: 520, margin: '0 auto' }}>
        <span className={`ico ${late ? 'late' : ''}`}>{late ? <Clock size={42} /> : <CircleCheck size={42} />}</span>
        <h1 style={{ margin: 0 }}>Vous avez déjà pointé</h1>
        <p className="muted" style={{ margin: 0 }}>{done.module} : {late ? `${done.minutesRetard} minute(s) de retard.` : 'vous êtes présent.'}</p>
        <Link className="btn" to="/etudiant"><ArrowLeft size={18} /> Retour au tableau de bord</Link>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="card rise stack" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error || 'QR code invalide.'}</div>
        <p className="muted" style={{ margin: 0 }}>Le QR code change toutes les quelques secondes. Scannez à nouveau celui affiché par le professeur.</p>
        <Link className="btn" to="/etudiant/pointage"><ArrowLeft size={18} /> Retour au pointage</Link>
      </section>
    );
  }

  const s = state.seance;
  const e = s.enseignement;
  return (
    <section className="stack rise" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <div className="page-head"><h1 className="page-title"><span className="ico"><ScanLine size={24} /></span> Valider ma présence</h1></div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      <div className="card stack">
        <h2 style={{ margin: 0 }}>{e.module.code} · {e.module.nom}</h2>
        <div className="meta-line">
          <span><CalendarDays size={16} /> {formatDateFr(s.date)} · {s.heureDebut} - {s.heureFin}</span>
          <span><DoorOpen size={16} /> {s.salle || '—'}</span>
          <span><Presentation size={16} /> {e.professeur.prenom} {e.professeur.nom}</span>
        </div>
        {!state.peutPointer && state.raison && <div className="alert alert-info"><Hourglass size={18} />{state.raison}</div>}
      </div>
      {state.peutPointer && state.signatureFaite && !error && <div className="card"><Loader /></div>}
      {state.peutPointer && !state.signatureFaite && (
        <form className="card stack" onSubmit={(ev) => { ev.preventDefault(); submit({ token, proof: state.proof, signature }); }}>
          <div className="field"><label><PenLine size={16} /> Votre signature</label><SignaturePad key={padKey} onChange={setSignature} /></div>
          <button type="submit" className="btn" disabled={!signature || busy}><ShieldCheck size={20} /> {busy ? 'Validation…' : 'Signer et valider ma présence'}</button>
          <small className="hint">Le QR a bien été scanné : il ne manque que votre signature.</small>
        </form>
      )}
    </section>
  );
}

// ======================================================================
// Page « Pointer ma présence » : en cours, à venir, terminées
// ======================================================================
function PointageManuel() {
  const navigate = useNavigate();
  const meta = useMeta();
  const [ov, setOv] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [code, setCode] = useState('');
  const [signature, setSignature] = useState(null);
  const [padKey, setPadKey] = useState(0);
  const [redo, setRedo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/etudiant/pointage');
      setOv(data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, env.liveRefreshMs);
    return () => clearInterval(timer);
  }, [load]);

  const submit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/presences/pointage', payload);
      setResult(data.data);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!ov || !meta) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  if (result && !result.dejaPointe) {
    return <SuccessCelebration open info={toCelebration(result)} onClose={() => { setResult(null); setCode(''); navigate('/etudiant'); }} />;
  }

  const c = ov.enCours.find((x) => x.seanceId === selectedId) || ov.enCours[0] || null;
  const step1Done = Boolean(c?.presence?.signatureFaite) && !redo;
  const codeLength = meta.sessions.codeLength;
  const next = ov.aVenir[0];

  const select = (id) => { setSelectedId(id); setCode(''); setRedo(false); setSignature(null); setError(''); };

  const saveSignature = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/presences/pointage/signature', { seanceId: c.seanceId, signature });
      setSignature(null);
      setRedo(false);
      setPadKey((x) => x + 1);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const flow = () => {
    if (c.dejaPointe) {
      return <div className="alert alert-info"><CircleCheck size={18} />Vous avez déjà pointé pour ce cours : {presenceBadge(c).label.toLowerCase()}.</div>;
    }
    if (!c.signe) return <div className="alert alert-info"><Hourglass size={18} />Le professeur n’a pas encore signé : le pointage s’ouvrira dès sa signature.</div>;
    if (c.delaiDepasse) return <div className="alert alert-error"><Lock size={18} />Le délai de pointage est dépassé pour ce cours.</div>;
    if (!c.peutPointer) return null;

    return (
      <>
        <div className="card stack">
          <h3 className="step-title"><PenLine size={18} /> 1. Signez</h3>
          {step1Done ? (
            <>
              <div className="alert alert-info"><Check size={18} />Signature enregistrée. Passez à l’étape 2 pour valider.</div>
              <div><button type="button" className="btn btn-ghost" onClick={() => setRedo(true)}>Refaire ma signature</button></div>
            </>
          ) : (
            <>
              <SignaturePad key={padKey} onChange={setSignature} />
              <div><button type="button" className="btn" disabled={!signature || busy} onClick={saveSignature}><ShieldCheck size={18} /> {busy ? 'Enregistrement…' : 'Enregistrer ma signature'}</button></div>
            </>
          )}
        </div>

        <div className="card stack" style={{ opacity: step1Done ? 1 : 0.55 }}>
          <h3 className="step-title">2. Validez votre présence</h3>
          <div className="stack">
            <strong><Smartphone size={16} style={{ verticalAlign: 'text-bottom' }} /> Avec un téléphone</strong>
            <p className="muted" style={{ margin: 0 }}>Appuyez sur le bouton, puis scannez le QR code affiché par le professeur : votre présence est validée dès le scan.</p>
            <div><button type="button" className="btn" disabled={!step1Done || busy} onClick={() => setScanning(true)}><Camera size={20} /> Scanner le QR code</button></div>
          </div>
          <form className="stack" onSubmit={(ev) => { ev.preventDefault(); submit({ code: code.trim().toUpperCase() }); }}>
            <strong><Monitor size={16} style={{ verticalAlign: 'text-bottom' }} /> Avec un ordinateur</strong>
            <div className="field">
              <label htmlFor="code"><Keyboard size={16} /> Code de présence donné par le professeur</label>
              <input id="code" className="code-input" value={code} maxLength={codeLength} autoComplete="off" autoCapitalize="characters" disabled={!step1Done}
                onChange={(ev) => setCode(ev.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} placeholder={'•'.repeat(codeLength)} />
            </div>
            <button type="submit" className="btn" disabled={!step1Done || code.trim().length !== codeLength || busy}><ShieldCheck size={20} /> {busy ? 'Validation…' : 'Valider ma présence'}</button>
          </form>
          {scanning && <QrScanner onResult={({ token, k }) => { setScanning(false); submit({ token, k }); }} onClose={() => setScanning(false)} />}
          <small className="hint">Sans validation (scan ou code), vous restez absent. Après {meta.sessions.lateGraceMin} minutes de cours, le pointage compte comme un retard.</small>
        </div>
      </>
    );
  };

  return (
    <section className="stack rise" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Keyboard size={24} /></span> Pointer ma présence</h1>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <section className="stack">
        <h3 className="step-title"><ListChecks size={20} /> Cours en cours</h3>
        {ov.enCours.length === 0 ? (
          <div className="card result-box">
            <span className="ico"><Hourglass size={36} /></span>
            <strong>Aucun cours ouvert en ce moment.</strong>
            <p className="muted" style={{ margin: 0 }}>
              {next
                ? `Prochain cours : ${next.moduleCode} · ${dayWord(next.date)} à ${next.heureDebut}. Le pointage s’ouvre à ${next.ouvreA} (${TIMEZONE_LABEL}).`
                : 'Aucun cours à venir prochainement.'}
            </p>
          </div>
        ) : ov.enCours.map((x) => (
          <CourseCard key={x.seanceId} c={x} active={ov.enCours.length > 1 && x.seanceId === c.seanceId} onSelect={ov.enCours.length > 1 ? () => select(x.seanceId) : undefined} />
        ))}
      </section>

      {c && flow()}

      <UpcomingList items={ov.aVenir} title="À venir (3 prochains cours)" />

      <section className="stack">
        <h3 className="step-title"><CircleCheck size={20} /> Séances d’aujourd’hui terminées</h3>
        {ov.terminees.length === 0 && <div className="empty">Aucune séance terminée aujourd’hui.</div>}
        {ov.terminees.map((x) => <CourseCard key={x.seanceId} c={x} />)}
        <Link className="btn btn-ghost" to="/etudiant/presences">Voir toutes mes présences</Link>
      </section>
    </section>
  );
}

export default function Pointage() {
  const { token } = useParams();
  return token ? <PointageQr token={token} /> : <PointageManuel />;
}