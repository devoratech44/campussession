// frontend/src/components/presence/SeancePanel.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays, DoorOpen, Presentation, Layers, PenLine, ShieldCheck, Eye, Play, Square, Ban, Pencil, RotateCcw,
  Check, Save, CircleAlert, Keyboard, ScanLine, Hourglass, Timer, Lock, UserCheck,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import useMeta from '../../hooks/useMeta';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage, photoUrl } from '../../utils/format';
import { PUBLIC_TYPES, formatDateFr } from '../../utils/schedule';
import { METHODES, PRESENCE_STATUS, SEANCE_STATUS, formatCountdown, timeOf } from '../../utils/presence';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import SignaturePad from '../common/SignaturePad';
import LiveQr from './LiveQr';
import PresenceEditModal from './PresenceEditModal';

export default function SeancePanel({ seanceId, role, onChanged, onEdit }) {
  const isAdmin = role === 'admin';
  const meta = useMeta();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [, setTick] = useState(0);
  const [signature, setSignature] = useState(null);
  const [padKey, setPadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState('');
  const pointsDirty = useRef(false);
  const [draft, setDraft] = useState({});
  const [duree, setDuree] = useState('');
  const [viewer, setViewer] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [motif, setMotif] = useState('');
  const [proxyRow, setProxyRow] = useState(null);
  const [proxySig, setProxySig] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/presences/seances/${seanceId}`);
      setData(res.data);
      setOffset(new Date(res.data.serverNow).getTime() - Date.now());
      if (!pointsDirty.current) setPoints(res.data.seance.pointsAbordes || '');
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [seanceId]);

  useEffect(() => {
    load();
    const refresh = setInterval(load, env.liveRefreshMs);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [load]);

  if (!data || !meta) {
    return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <div className="empty">Chargement…</div>;
  }

  const { seance: s, etudiants, acces } = data;
  const e = s.enseignement;
  const st = SEANCE_STATUS[s.statut];
  const showList = isAdmin || s.signe || s.statut === 'fermee';
  const remaining = s.scanJusqua ? new Date(s.scanJusqua).getTime() - (Date.now() + offset) : null;
  const openAt = new Date(`${s.date}T${s.heureDebut}:00Z`).getTime() - meta.sessions.openBeforeMin * 60000;

  const act = async (call, okMessage) => {
    setBusy(true);
    try {
      const res = await call();
      if (res?.data?.data) setData(res.data.data);
      if (okMessage) toast.success(okMessage);
      onChanged?.();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const base = `/presences/seances/${seanceId}`;
  const onSign = async () => {
    const ok = await act(() => api.post(`${base}/signature`, { signature }), 'Signature enregistrée : la session est lancée.');
    if (ok) { setSignature(null); setPadKey((k) => k + 1); }
  };
  const onSavePoints = async () => {
    const ok = await act(() => api.put(`${base}/points`, { pointsAbordes: points }), 'Points abordés enregistrés.');
    if (ok) pointsDirty.current = false;
  };
  const onRetard = (student) => {
    const minutes = Number(draft[student.id] ?? student.minutesRetard);
    return act(() => api.put(`${base}/retard`, { etudiantId: student.id, minutes }), `Retard enregistré pour ${student.prenom}.`);
  };
  const onConfirm = async () => {
    const ok = confirm === 'fermer'
      ? await act(() => api.post(`${base}/fermer`), 'Session terminée : les non-pointés sont absents.')
      : await act(() => api.post(`${base}/annuler`, { motif }), 'Session annulée.');
    if (ok) { setConfirm(null); setMotif(''); }
  };

  const onProxy = async (useSessionSignature) => {
    const ok = await act(
      () => api.post(`${base}/etudiants/${proxyRow.id}/pointer`, useSessionSignature ? {} : { signature: proxySig }),
      `${proxyRow.prenom} est pointé(e).`
    );
    if (ok) { setProxyRow(null); setProxySig(null); }
  };

  const viewSignature = async (url, title) => {
    try {
      const { data: r } = await api.get(url);
      setViewer({ title, src: r.data.signature, at: r.data.at });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="stack">
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card live-head">
        <div className="stack" style={{ gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>{e.module.code} · {e.module.nom}</h2>
          <div className="meta-line">
            <span><CalendarDays size={16} /> {formatDateFr(s.date)} · {s.heureDebut} - {s.heureFin}</span>
            <span><DoorOpen size={16} /> {s.salle || 'Salle non définie'}</span>
            <span><Presentation size={16} /> {e.professeur.prenom} {e.professeur.nom}</span>
            <span><Layers size={16} /> {PUBLIC_TYPES[e.publicType]} : {e.publicLabel}</span>
          </div>
        </div>
        <div className="live-status">
          <span className={`badge ${st.cls}`}>{st.label}</span>
          {s.statut === 'ouverte' && remaining !== null && (
            <span className="countdown-big" title="Temps restant pour pointer"><Timer size={20} style={{ verticalAlign: 'text-bottom' }} /> {formatCountdown(remaining)}</span>
          )}
        </div>
      </div>

      {s.statut === 'annulee' && <div className="alert alert-error"><Ban size={18} />Session annulée{s.motifAnnulation ? ` : ${s.motifAnnulation}` : '.'}</div>}
      {s.statut === 'planifiee' && (
        <div className="alert alert-info"><Hourglass size={18} />
          {isAdmin ? 'La session s’ouvrira automatiquement' : 'La session s’ouvrira automatiquement'} à {timeOf(new Date(openAt))} ({meta.sessions.openBeforeMin} min avant le début).
        </div>
      )}

      {isAdmin && (
        <div className="card row">
          {(s.statut !== 'ouverte') && (
            <>
              <select value={duree} onChange={(ev) => setDuree(ev.target.value)} style={{ width: 'auto' }} aria-label="Durée d'ouverture">
                <option value="">Jusqu’à la fin du cours</option>
                {env.reopenChoices.map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
              <button type="button" className="btn" disabled={busy} onClick={() => act(() => api.post(`${base}/ouvrir`, { duree: duree || undefined }), 'Session ouverte.')}><Play size={18} /> {s.statut === 'planifiee' ? 'Ouvrir' : 'Rouvrir'}</button>
            </>
          )}
          {s.statut === 'ouverte' && (
            <>
              <select value={duree} onChange={(ev) => setDuree(ev.target.value)} style={{ width: 'auto' }} aria-label="Prolongation">
                <option value="">Prolonger de…</option>
                {env.reopenChoices.map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
              <button type="button" className="btn btn-ghost" disabled={busy || !duree} onClick={() => act(() => api.post(`${base}/ouvrir`, { duree }), 'Pointage prolongé.')}><Timer size={18} /> Prolonger</button>
              <button type="button" className="btn" disabled={busy} onClick={() => setConfirm('fermer')}><Square size={18} /> Fermer</button>
            </>
          )}
          {s.statut !== 'annulee' && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirm('annuler')}><Ban size={18} /> Annuler</button>}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onEdit?.(s)}><Pencil size={18} /> Modifier</button>
        </div>
      )}

      {s.statut === 'ouverte' && !s.signe && (
        <section className="card stack">
          <h3 style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}><PenLine size={20} /> {isAdmin ? 'Signature du professeur (saisie par l’administrateur)' : 'Signez pour lancer la session'}</h3>
          <p className="muted" style={{ margin: 0 }}>Après validation, le QR code et la liste des étudiants s&apos;affichent. Tous les étudiants sont absents tant qu&apos;ils n&apos;ont pas pointé.</p>
          <SignaturePad key={padKey} onChange={setSignature} />
          <div><button type="button" className="btn" disabled={!signature || busy} onClick={onSign}><ShieldCheck size={18} /> Valider la signature</button></div>
        </section>
      )}

      {s.signe && (
        <div className="card row row-between">
          <span><ShieldCheck size={18} style={{ verticalAlign: 'text-bottom', color: 'var(--success)' }} /> Session signée à {timeOf(s.signeAt)}</span>
          <button type="button" className="btn btn-ghost" onClick={() => viewSignature(`${base}/signatures/professeur`, 'Signature du professeur')}><Eye size={18} /> Voir la signature</button>
        </div>
      )}

      {acces && (
        <section className="card qr-box">
          <LiveQr seanceId={seanceId} />
          <div className="stack" style={{ maxWidth: 340 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ScanLine size={22} /> Scannez pour valider</h3>
            <p className="muted" style={{ margin: 0 }}>Les étudiants signent d’abord dans l’application, puis scannent ce QR code avec leur téléphone pour valider leur présence. Le QR change toutes les quelques secondes : une photo ne sert à rien. Le pointage reste possible jusqu&apos;à la fin du cours{remaining !== null ? ` (encore ${formatCountdown(remaining)})` : ''}.</p>
            <p className="muted" style={{ margin: 0 }}>Au-delà de {meta.sessions.lateGraceMin} min après le début, le pointage compte comme un retard.</p>
          </div>
        </section>
      )}

      {showList && (
        <section className="stack">
          <div className="count-grid">
            <div className="count-box"><strong>{s.counts.total}</strong>Étudiants</div>
            <div className="count-box present"><strong>{s.counts.present}</strong>Présents</div>
            <div className="count-box retard"><strong>{s.counts.retard}</strong>Retards</div>
            <div className="count-box absent"><strong>{s.counts.absent}</strong>Absents</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Étudiant</th><th>Statut</th><th>Retard (min)</th><th>Pointage</th><th>Signature</th>{isAdmin && <th>Actions</th>}</tr></thead>
              <tbody>
                {etudiants.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="empty">Aucun étudiant concerné.</td></tr>}
                {etudiants.map((x) => {
                  const ps = PRESENCE_STATUS[x.statut];
                  const canSetRetard = !isAdmin && s.statut === 'ouverte' && s.signe;
                  return (
                    <tr key={x.id}>
                      <td>
                        <div className="cell-user">
                          <img className="avatar" src={photoUrl(x.photo)} alt="" />
                          <span>{x.prenom} {x.nom}<small>{x.matricule}</small></span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ps.cls}`}>{ps.label}</span>
                        {x.justifie && <span className="badge badge-ok" style={{ marginLeft: '0.3rem' }}>Justifié</span>}
                      </td>
                      <td>
                        {canSetRetard ? (
                          <div className="retard-input">
                            <input
                              type="number" min="1" max={meta.sessions.retardMaxMin} placeholder="min"
                              value={draft[x.id] ?? (x.minutesRetard || '')}
                              onChange={(ev) => setDraft((d) => ({ ...d, [x.id]: ev.target.value }))}
                              aria-label={`Minutes de retard de ${x.prenom} ${x.nom}`}
                            />
                            <button type="button" className="icon-btn" disabled={busy || !Number(draft[x.id] ?? x.minutesRetard)} onClick={() => onRetard(x)} aria-label="Enregistrer le retard" title="Enregistrer le retard"><Check size={18} /></button>
                          </div>
                        ) : (x.statut === 'retard' ? `${x.minutesRetard} min` : '—')}
                      </td>
                      <td>{x.scannedAt ? <>{timeOf(x.scannedAt)}<small className="muted" style={{ display: 'block' }}>{METHODES[x.methode]}</small></> : (x.enAttente ? 'Signé, en attente' : (x.methode ? METHODES[x.methode] : '—'))}</td>
                      <td>
                        {x.aSigne
                          ? <button type="button" className="icon-btn" title="Voir la signature" aria-label="Voir la signature" onClick={() => viewSignature(`${base}/signatures/etudiants/${x.id}`, `Signature de ${x.prenom} ${x.nom}`)}><Eye size={18} /></button>
                          : '—'}
                        {!x.scannedAt && s.statut === 'ouverte' && s.signe && (
                          <button type="button" className="icon-btn" title="Pointer à sa place" aria-label="Pointer à sa place" onClick={() => setProxyRow(x)}><UserCheck size={18} /></button>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="actions">
                            <button type="button" className="icon-btn" title="Modifier / justifier" aria-label="Modifier" onClick={() => setEditRow(x)}><Pencil size={18} /></button>
                            <button type="button" className="icon-btn danger" title="Réinitialiser (absent d'office)" aria-label="Réinitialiser" disabled={busy} onClick={() => act(() => api.delete(`${base}/etudiants/${x.id}`), 'Ligne réinitialisée.')}><RotateCcw size={18} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!showList && s.statut === 'ouverte' && <div className="alert alert-info"><Lock size={18} />La liste des étudiants s&apos;affichera après votre signature.</div>}

      {(s.signe || s.statut === 'fermee') && (
        <section className="card stack">
          <h3 style={{ margin: 0 }}>Points abordés en séance</h3>
          <textarea value={points} onChange={(ev) => { pointsDirty.current = true; setPoints(ev.target.value); }} maxLength={5000} placeholder="Notions vues, exercices, travail demandé… (visible ensuite par les étudiants pour réviser)" />
          <div><button type="button" className="btn" disabled={busy} onClick={onSavePoints}><Save size={18} /> Enregistrer</button></div>
        </section>
      )}

      {!isAdmin && s.statut === 'ouverte' && s.signe && (
        <div><button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirm('fermer')}><Square size={18} /> Terminer la session</button></div>
      )}

      {acces && (
        <section className="card code-box stack">
          <h3 style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}><Keyboard size={22} /> Code de présence (sans téléphone)</h3>
          <div className="code-big">{acces.code}</div>
          <p className="muted" style={{ margin: 0 }}>À donner aux étudiants qui utilisent un ordinateur : ils signent dans « Pointer ma présence », puis saisissent ce code. Ce code ne vaut que pour ce cours.</p>
        </section>
      )}

      {proxyRow && (
        <Modal title={`Pointer ${proxyRow.prenom} ${proxyRow.nom}`} icon={UserCheck} onClose={() => { setProxyRow(null); setProxySig(null); }}>
          <p className="muted" style={{ margin: 0 }}>À utiliser quand l’étudiant ne peut pas pointer lui-même. Signez à sa place : il sera marqué présent (ou en retard selon l’heure) et la ligne indiquera « {isAdmin ? 'Administrateur' : 'Professeur'} ».</p>
          <SignaturePad onChange={setProxySig} />
          <div className="row">
            <button type="button" className="btn" disabled={!proxySig || busy} onClick={() => onProxy(false)}><ShieldCheck size={18} /> Signer et pointer</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onProxy(true)}>Utiliser ma signature de séance</button>
          </div>
        </Modal>
      )}

      {viewer && (
        <Modal title={viewer.title} icon={PenLine} onClose={() => setViewer(null)}>
          <img className="sig-img" src={viewer.src} alt={viewer.title} />
          {viewer.at && <small className="hint">Signé à {timeOf(viewer.at)}.</small>}
        </Modal>
      )}

      {editRow && (
        <PresenceEditModal
          seanceId={seanceId} student={editRow} initial={editRow} retardMax={meta.sessions.retardMaxMin}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); toast.success('Présence modifiée.'); load(); onChanged?.(); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm === 'fermer' ? 'Terminer la session ?' : 'Annuler la session ?'}
          icon={confirm === 'fermer' ? Square : Ban}
          danger={confirm === 'annuler'}
          confirmLabel={confirm === 'fermer' ? 'Terminer' : 'Annuler la session'}
          busy={busy}
          message={confirm === 'fermer'
            ? `Les ${s.counts.absent} étudiant(s) qui n'ont pas pointé seront marqués absents. Le blocage automatique sera ensuite vérifié.`
            : 'Aucune absence ne sera comptée pour cette séance. Vous pourrez la rouvrir ensuite.'}
          onConfirm={onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}