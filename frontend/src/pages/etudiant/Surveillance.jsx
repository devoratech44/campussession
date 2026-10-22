// frontend/src/pages/etudiant/Surveillance.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Timer, CircleAlert, Ban, CheckCircle2, ArrowLeft, Eye } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { formatCountdown } from '../../utils/presence';
import Loader from '../../components/common/Loader';

function alarm() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 8; i += 1) {
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = i % 2 ? 660 : 880; g.gain.value = 0.25;
      o.start(c.currentTime + i * 0.5); o.stop(c.currentTime + i * 0.5 + 0.35);
    }
  } catch { /* son indisponible */ }
}

export default function Surveillance() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('intro'); // intro | running | ended
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [warn, setWarn] = useState(null);
  const [away, setAway] = useState(false);
  const [exclu, setExclu] = useState(false);
  const [reason, setReason] = useState('');
  const idRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/surveillance/mine');
      setData(res.data);
      if (res.data.surveillance) {
        idRef.current = res.data.surveillance.id;
        const st = res.data.etat.statut;
        if (st === 'en_cours' && res.data.etat.restantMs > 0) { setEndAt(Date.now() + res.data.etat.restantMs); setPhase('running'); }
        else if (st === 'termine' || st === 'exclu') { setExclu(st === 'exclu'); setPhase('ended'); }
      }
    } catch (err) { setError(errorMessage(err)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = useCallback(async (type, dureeSec) => {
    try {
      const { data: r } = await api.post(`/surveillance/${idRef.current}/event`, { type, dureeSec });
      setWarn(r.data);
      if (r.data.statut === 'exclu') { setExclu(true); setPhase('ended'); }
    } catch { /* ignoré */ }
  }, []);

  const finish = useCallback(async (why) => {
    try { await api.post(`/surveillance/${idRef.current}/terminer`); } catch { /* déjà terminé */ }
    setReason(why); setPhase('ended');
  }, []);

  // Chronomètre
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const t = setInterval(() => {
      const ms = endAt - Date.now();
      setLeft(ms);
      if (ms <= 0) { clearInterval(t); alarm(); finish('Le temps est écoulé : arrêtez de travailler.'); }
    }, 500);
    return () => clearInterval(t);
  }, [phase, endAt, finish]);

  // Détection des sorties et gestes suspects
  useEffect(() => {
    if (phase !== 'running') return undefined;
    let leftAt = null;
    const out = () => { if (leftAt === null) { leftAt = Date.now(); setAway(true); } };
    const back = () => { if (leftAt !== null) { const s = Math.round((Date.now() - leftAt) / 1000); leftAt = null; setAway(false); send('sortie', s); } };
    const onVis = () => (document.hidden ? out() : back());
    const onKey = (e) => {
      const k = e.key;
      if (k === 'F12' || k === 'PrintScreen' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k.toUpperCase()))) send('raccourci', 0);
    };
    const onCopy = () => send('copie_collage', 0);
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('blur', out); window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', onVis); document.addEventListener('keydown', onKey);
    ['copy', 'paste', 'cut', 'contextmenu'].forEach((n) => document.addEventListener(n, onCopy));
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('blur', out); window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', onVis); document.removeEventListener('keydown', onKey);
      ['copy', 'paste', 'cut', 'contextmenu'].forEach((n) => document.removeEventListener(n, onCopy));
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [phase, send]);

  const start = async () => {
    try {
      const { data: res } = await api.post(`/surveillance/${idRef.current}/entrer`);
      setEndAt(Date.now() + res.data.etat.restantMs); setPhase('running');
    } catch (err) { setError(errorMessage(err)); }
  };

  if (!data) return error ? <div className="alert alert-error"><CircleAlert size={18} />{error}</div> : <Loader />;

  if (!data.surveillance) {
    return (
      <section className="card rise result-box" style={{ maxWidth: 520, margin: '0 auto' }}>
        <span className="ico"><ShieldAlert size={40} /></span>
        <h1 style={{ margin: 0 }}>Aucun devoir surveillé</h1>
        <p className="muted" style={{ margin: 0 }}>Vous n&apos;avez pas de devoir ou d&apos;examen surveillé en ce moment, ou la session est terminée.</p>
        <Link className="btn" to="/etudiant"><ArrowLeft size={18} /> Retour au tableau de bord</Link>
      </section>
    );
  }
  const s = data.surveillance;

  if (phase === 'ended') {
    return (
      <section className="card rise result-box" style={{ maxWidth: 560, margin: '0 auto' }}>
        <span className="ico">{exclu ? <Ban size={40} /> : <CheckCircle2 size={40} />}</span>
        <h1 style={{ margin: 0 }}>{exclu ? 'Vous avez été exclu' : 'Session terminée'}</h1>
        <p className="muted" style={{ margin: 0 }}>{exclu ? 'Trop d’avertissements : une fraude est sanctionnée par la note de 00/20. L’administration examine le journal.' : (reason || 'Votre travail est terminé. Ne modifiez plus rien.')}</p>
        <Link className="btn" to="/etudiant"><ArrowLeft size={18} /> Retour</Link>
      </section>
    );
  }

  if (phase === 'running') {
    return (
      <section className="stack rise" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="card row row-between" style={{ position: 'sticky', top: 8, zIndex: 5 }}>
          <strong>{s.titre}</strong>
          <span className="countdown-big"><Timer size={22} style={{ verticalAlign: 'text-bottom' }} /> {formatCountdown(left)}</span>
        </div>
        {away && <div className="alert alert-error"><CircleAlert size={18} />Vous avez quitté la page : la sortie est enregistrée.</div>}
        {warn && warn.alertes > 0 && <div className="alert alert-error"><CircleAlert size={18} />Avertissement {warn.alertes} / {warn.maxAlertes}. Au-delà, vous serez exclu et la note sera de 00/20.</div>}
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Consignes</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.consignes || 'Aucune consigne particulière.'}</p>
          <small className="hint"><Eye size={14} /> Outils autorisés : {s.outils || 'précisés par l’administrateur'}. Gardez cette page ouverte pendant tout le travail.</small>
        </div>
      </section>
    );
  }

  return (
    <section className="stack rise" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-head"><h1 className="page-title"><span className="ico"><ShieldAlert size={24} /></span> {s.titre}</h1></div>
      {error && <div className="alert alert-error"><CircleAlert size={18} />{error}</div>}
      <div className="card stack">
        <p style={{ margin: 0 }}>{s.type === 'examen' ? 'Mini-examen' : 'Mini-devoir'} · durée <strong>{s.dureeMinutes} minutes</strong>. Le chronomètre démarre quand vous cliquez sur « Commencer ».</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li>Outils autorisés : <strong>{s.outils || 'précisés par l’administrateur'}</strong>. Ni intelligence artificielle, ni recherche sur internet.</li>
          <li>Toute photo du sujet avec un téléphone est interdite et sanctionnée.</li>
          <li>Quitter cette page est enregistré. Après {data.graceSeconds} secondes hors de la page, vous recevez un avertissement ({s.maxAlertes} maximum).</li>
          <li>En cas de fraude : note de <strong>00/20</strong> et exclusion.</li>
          <li><strong>L&apos;administrateur consulte le journal de vos entrées et sorties</strong>, même sans avertissement.</li>
          <li>À la fin du temps, une sonnerie retentit : vous devez vous arrêter immédiatement.</li>
        </ul>
        <div><button type="button" className="btn" onClick={start}>Commencer</button></div>
      </div>
    </section>
  );
}