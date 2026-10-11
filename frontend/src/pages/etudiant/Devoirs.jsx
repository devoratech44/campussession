// frontend/src/pages/etudiant/Devoirs.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  NotebookPen, Paperclip, Upload, Trash2, Download, CircleAlert, RotateCcw, CalendarDays, Presentation, BookOpen, Save,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { downloadFile } from '../../utils/files';
import { formatDateFr } from '../../utils/schedule';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import '../../styles/etudiant.css';
import '../../styles/evaluations.css';

const MAX_MB = Number(import.meta.env.VITE_MAX_DOC_MB) || 50;
const PASS = Number(import.meta.env.VITE_EVAL_PASS_MARK) || 10;
const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };
const STATUT = {
  a_rendre: { label: 'À rendre', cls: 'badge-info' },
  en_retard: { label: 'Délai dépassé', cls: 'badge-ko' },
  rendu: { label: 'Rendu', cls: 'badge-present' },
  rendu_retard: { label: 'Rendu en retard', cls: 'badge-retard' },
  note: { label: 'Noté', cls: 'badge-ok' },
  examen: { label: 'Examen', cls: 'badge-info' },
};
const label = (t) => (t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE[t.type]);
const when = (iso) => `${new Date(iso).toLocaleString('fr-FR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' })} ${TIMEZONE_LABEL}`;
const fmt = (v) => String(v).replace('.', ',');
const limite = (t) => (t.dateLimite
  ? `${formatDateFr(t.dateLimite.slice(0, 10))} à ${t.dateLimite.slice(11)} ${TIMEZONE_LABEL}`
  : (t.dateTravail ? formatDateFr(t.dateTravail) : null));

function DevoirModal({ id, onClose, onChanged }) {
  const toast = useToast();
  const [t, setT] = useState(null);
  const [file, setFile] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileKey, setFileKey] = useState(0);

  const apply = useCallback((d) => { setT(d); setCommentaire(d.rendu?.commentaire || ''); }, []);

  useEffect(() => {
    api.get(`/etudiant/travaux/${id}`).then((res) => apply(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, [id, apply]);

  const guard = async (fn) => { try { await fn(); } catch (err) { toast.error(errorMessage(err)); } };

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > MAX_MB * 1024 * 1024) { setError(`Fichier trop volumineux (${MAX_MB} Mo maximum).`); e.target.value = ''; return; }
    setError('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    fd.append('commentaire', commentaire);
    if (file) fd.append('fichier', file);
    setBusy(true);
    try {
      const { data } = await api.post(`/etudiant/travaux/${id}/rendu`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      apply(data.data);
      setFile(null);
      setFileKey((k) => k + 1);
      toast.success(data.data.rendu?.enRetard ? 'Rendu enregistré (en retard).' : 'Rendu enregistré.');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const { data } = await api.delete(`/etudiant/travaux/${id}/rendu`);
      apply(data.data);
      toast.success('Rendu retiré.');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t ? `${label(t)} · ${t.titre}` : 'Évaluation'} icon={NotebookPen} onClose={onClose} busy={busy}>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}
      {!t ? <Loader /> : (
        <div className="stack">
          <div className="meta-line">
            <span><BookOpen size={16} /> {t.moduleCode} · {t.moduleNom}</span>
            <span><Presentation size={16} /> {t.professeur}</span>
            {limite(t) && <span><CalendarDays size={16} /> À rendre avant le {limite(t)}</span>}
            <span className={`badge ${STATUT[t.statut].cls}`}>{STATUT[t.statut].label}</span>
          </div>

          {t.consignes && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t.consignes}</p>}
          {t.aFichier && (
            <div><button type="button" className="btn btn-ghost" onClick={() => guard(() => downloadFile(`/etudiant/travaux/${t.id}/fichier`, t.nomOriginal || 'consignes'))}><Paperclip size={18} /> {t.nomOriginal}</button></div>
          )}

          {t.note && (
            <div className="card stack">
              <strong>Votre note</strong>
              <span className={t.note.valeur >= PASS ? 'mark-ok' : 'mark-ko'} style={{ fontSize: '1.6rem' }}>{fmt(t.note.valeur)} / 20</span>
              {t.note.commentaire && <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t.note.commentaire}</p>}
            </div>
          )}

          {t.rendu && (
            <div className="card stack">
              <strong>Votre rendu</strong>
              <small className="muted">Déposé le {when(t.rendu.dateRendu)}{t.rendu.enRetard ? ' · en retard' : ''}</small>
              {t.rendu.commentaire && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t.rendu.commentaire}</p>}
              <div className="row">
                {t.rendu.aFichier && (
                  <button type="button" className="btn btn-ghost" onClick={() => guard(() => downloadFile(`/etudiant/travaux/${t.id}/rendu/fichier`, t.rendu.nomOriginal || 'rendu'))}><Download size={18} /> {t.rendu.nomOriginal}</button>
                )}
                {t.peutRendre && <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}><Trash2 size={18} /> Retirer mon rendu</button>}
              </div>
            </div>
          )}

          {!t.rendable && <div className="alert alert-info">Les examens ne se rendent pas sur la plateforme.</div>}

          {t.peutRendre && (
            <form className="stack" onSubmit={submit}>
              <strong><Upload size={16} style={{ verticalAlign: 'text-bottom' }} /> {t.rendu ? 'Remplacer mon rendu' : 'Rendre ce travail'}</strong>
              {t.depasse && <div className="alert alert-error"><CircleAlert size={18} />La date limite est dépassée : votre rendu sera marqué « en retard ».</div>}
              <div className="field">
                <label htmlFor="r-file"><Paperclip size={16} /> Fichier ({MAX_MB} Mo max)</label>
                <input key={fileKey} id="r-file" type="file" onChange={onFile} />
              </div>
              <div className="field">
                <label htmlFor="r-com">Commentaire (facultatif)</label>
                <textarea id="r-com" rows={3} value={commentaire} maxLength={5000} onChange={(e) => setCommentaire(e.target.value)} />
              </div>
              <div><button type="submit" className="btn" disabled={busy || (!file && !commentaire.trim())}><Save size={18} /> {busy ? 'Envoi…' : 'Envoyer'}</button></div>
              <small className="hint">Vous pouvez modifier votre rendu tant que le professeur n’a pas saisi de note.</small>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Devoirs() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ statut: '', moduleId: '', type: '' });
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/etudiant/travaux', { params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const set = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><NotebookPen size={24} /></span> Devoirs, TP et examens</h1>
      </div>
      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="card">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="d-statut">Statut</label>
            <select id="d-statut" value={filters.statut} onChange={set('statut')}>
              <option value="">Tous</option>
              {Object.entries(STATUT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-type">Type</label>
            <select id="d-type" value={filters.type} onChange={set('type')}>
              <option value="">Tous</option>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="d-module">Module</label>
            <select id="d-module" value={filters.moduleId} onChange={set('moduleId')}>
              <option value="">Tous</option>
              {data.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setFilters({ statut: '', moduleId: '', type: '' })}><RotateCcw size={18} /> Réinitialiser</button>
        </div>
      </div>

      <div className="stack">
        {data.items.length === 0 && <div className="empty">Aucun devoir, TP ou examen pour ces filtres.</div>}
        {data.items.map((t) => {
          const st = STATUT[t.statut];
          return (
            <div key={t.id} className="course clickable" role="button" tabIndex={0} onClick={() => setOpenId(t.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(t.id); }}>
              <div className="course__time" style={{ fontSize: '0.8rem' }}>{t.moduleCode}</div>
              <div className="course__body">
                <strong>{label(t)} · {t.titre}</strong>
                <span className="meta-line">
                  <span><Presentation size={14} /> {t.professeur}</span>
                  {limite(t) && <span><CalendarDays size={14} /> Avant le {limite(t)}</span>}
                  {t.aFichier && <span><Paperclip size={14} /> Consignes jointes</span>}
                </span>
              </div>
              <div className="course__badges">
                <span className={`badge ${st.cls}`}>{st.label}</span>
                {t.note && <span className={`course__note ${t.note.valeur >= PASS ? 'mark-ok' : 'mark-ko'}`}>{fmt(t.note.valeur)} / 20</span>}
              </div>
            </div>
          );
        })}
      </div>

      {openId && <DevoirModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </section>
  );
}