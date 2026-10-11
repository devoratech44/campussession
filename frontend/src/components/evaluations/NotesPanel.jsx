// frontend/src/components/evaluations/NotesPanel.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, Download, Paperclip, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage, photoUrl } from '../../utils/format';
import { downloadFile } from '../../utils/files';
import { formatDateFr } from '../../utils/schedule';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';
import Loader from '../common/Loader';

const MAX = Number(import.meta.env.VITE_EVAL_MAX_NOTE) || 20;
const PASS = Number(import.meta.env.VITE_EVAL_PASS_MARK) || 10;
const TYPE = { devoir: 'Devoir', examen: 'Examen', tp: 'TP' };

const original = (e) => ({ valeur: e.note ? String(e.note.valeur) : '', commentaire: e.note?.commentaire || '' });
const num = (v) => Number(String(v).replace(',', '.'));
const when = (iso) => `${new Date(iso).toLocaleString('fr-FR', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' })} ${TIMEZONE_LABEL}`;

export default function NotesPanel({ travailId, onBack, onChanged, base = '/evaluations', lockExisting = false }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = useCallback((d) => {
    setData(d);
    setDraft(Object.fromEntries(d.etudiants.map((e) => [e.id, original(e)])));
  }, []);

  useEffect(() => {
    api.get(`${base}/${travailId}`)
      .then((res) => { apply(res.data.data); setError(''); })
      .catch((err) => setError(errorMessage(err)));
  }, [travailId, apply]);

  const dirty = useMemo(() => {
    if (!data) return [];
    return data.etudiants.filter((e) => {
      const o = original(e);
      const d = draft[e.id];
      return d && (d.valeur.trim() !== o.valeur || d.commentaire.trim() !== o.commentaire);
    });
  }, [data, draft]);

  const stats = useMemo(() => {
    if (!data) return null;
    const values = data.etudiants.map((e) => draft[e.id]?.valeur).filter((v) => v !== undefined && v !== '' && Number.isFinite(num(v))).map(num);
    return {
      saisies: values.length,
      moyenne: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null,
      rendus: data.etudiants.filter((e) => e.rendu).length,
    };
  }, [data, draft]);

  if (!data) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const t = data.travail;
  const label = t.type === 'tp' ? `TP ${t.numeroTp}` : TYPE[t.type];

  const setField = (id, field, value) => setDraft((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  const onValue = (id) => (e) => {
    if (/^\d{0,2}([.,]\d{0,2})?$/.test(e.target.value)) setField(id, 'valeur', e.target.value);
  };

  const save = async () => {
    for (const e of dirty) {
      const v = draft[e.id].valeur.trim();
      if (v !== '' && (!Number.isFinite(num(v)) || num(v) < 0 || num(v) > MAX)) {
        toast.error(`Note invalide pour ${e.prenom} ${e.nom} : entre 0 et ${MAX}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const notes = dirty.map((e) => ({ etudiantId: e.id, valeur: draft[e.id].valeur.trim() || null, commentaire: draft[e.id].commentaire.trim() }));
      const { data: res } = await api.put(`${base}/${travailId}/notes`, { notes });
      apply(res.data);
      toast.success('Notes enregistrées.');
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const download = async (url, name) => {
    try { await downloadFile(url, name); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <section className="stack rise">
      <div className="row row-between">
        <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={18} /> Retour aux évaluations</button>
        <button type="button" className="btn" disabled={saving || dirty.length === 0} onClick={save}>
          <Save size={18} /> {saving ? 'Enregistrement…' : `Enregistrer${dirty.length ? ` (${dirty.length})` : ''}`}
        </button>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>{label} · {t.titre}</h2>
        <div className="meta-line">
          <span>{t.moduleCode} · {t.moduleNom}</span>
          <span>{t.professeur}</span>
          <span>{t.publicLabel}</span>
          {t.dateTravail && <span>{formatDateFr(t.dateTravail)}</span>}
        </div>
        {t.consignes && <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t.consignes}</p>}
        {t.aFichier && (
          <div><button type="button" className="btn btn-ghost" onClick={() => download(`${base}/${t.id}/fichier`, t.nomOriginal || 'consignes')}><Paperclip size={18} /> {t.nomOriginal}</button></div>
        )}
        <div className="eval-stats">
          <span><strong>{data.etudiants.length}</strong> étudiant(s)</span>
          <span><strong>{stats.rendus}</strong> rendu(s)</span>
          <span><strong>{stats.saisies}</strong> note(s) saisie(s)</span>
          <span>Moyenne : <strong>{stats.moyenne === null ? '—' : `${String(stats.moyenne).replace('.', ',')} / ${MAX}`}</strong></span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Étudiant</th><th>Rendu</th><th>Note / {MAX}</th><th>Commentaire</th></tr></thead>
          <tbody>
            {data.etudiants.length === 0 && <tr><td colSpan={4} className="empty">Aucun étudiant concerné.</td></tr>}
            {data.etudiants.map((e) => {
              const d = draft[e.id] || { valeur: '', commentaire: '' };
              const isDirty = dirty.some((x) => x.id === e.id);
              const v = d.valeur !== '' && Number.isFinite(num(d.valeur)) ? num(d.valeur) : null;
              return (
                <tr key={e.id} className={isDirty ? 'dirty-row' : ''}>
                  <td>
                    <div className="cell-user">
                      <img className="avatar" src={photoUrl(e.photo)} alt="" />
                      <span>{e.prenom} {e.nom}<small>{e.matricule}</small></span>
                    </div>
                  </td>
                  <td>
                    {e.rendu ? (
                      <div className="stack" style={{ gap: '0.2rem' }}>
                        <span className={`badge ${e.rendu.enRetard ? 'badge-retard' : 'badge-present'}`}>{e.rendu.enRetard ? 'Rendu en retard' : 'Rendu'}</span>
                        <small className="muted">{when(e.rendu.dateRendu)}</small>
                        {e.rendu.aFichier && (
                          <button type="button" className="icon-btn" title="Télécharger le rendu" aria-label="Télécharger le rendu" onClick={() => download(`${base}/${t.id}/rendus/${e.id}/fichier`, e.rendu.nomOriginal || 'rendu')}><Download size={18} /></button>
                        )}
                      </div>
                    ) : <span className="badge badge-absent">Non rendu</span>}
                  </td>
                  <td>
                    <input
                      className={`note-input ${v === null ? '' : (v >= PASS ? 'mark-ok' : 'mark-ko')}`} inputMode="decimal" placeholder="—"
                      value={d.valeur} onChange={onValue(e.id)} disabled={lockExisting && Boolean(e.note)} aria-label={`Note de ${e.prenom} ${e.nom}`}
                    />
                  </td>
                  <td>
                    <input className="note-comment" value={d.commentaire} maxLength={2000} placeholder="Commentaire (facultatif)"
                      onChange={(ev) => setField(e.id, 'commentaire', ev.target.value)} disabled={lockExisting && Boolean(e.note)} aria-label={`Commentaire pour ${e.prenom} ${e.nom}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <small className="hint">Laisser une note vide supprime la note. Les étudiants sont notifiés de leur première note.</small>
    </section>
  );
}