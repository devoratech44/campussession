// frontend/src/pages/professeur/Avis.jsx
import { useEffect, useState } from 'react';
import { Star, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { TIMEZONE } from '../../utils/presence';
import Loader from '../../components/common/Loader';
import '../../styles/reports.css';

const fmt = (v) => (v === null ? '—' : String(v).replace('.', ','));

export default function Avis() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/professeur/avis').then((r) => setItems(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!items) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><Star size={24} /></span> Avis des étudiants</h1>
      </div>
      {items.length === 0 && <div className="empty">Aucun cours ne vous est assigné.</div>}

      {items.map((c) => (
        <div className="card stack" key={c.id}>
          <div className="row row-between">
            <strong style={{ fontSize: '1.1rem' }}>{c.moduleCode} · {c.moduleNom} <small className="muted">({c.publicLabel})</small></strong>
            <span className="badge badge-info"><Star size={14} /> {fmt(c.moyenne)} / 5 · {c.total} avis</span>
          </div>

          {c.total > 0 && (
            <div className="stack" style={{ gap: '0.3rem' }}>
              {[...c.repartition].reverse().map((r) => (
                <div key={r.note} className="row" style={{ gap: '0.6rem', alignItems: 'center' }}>
                  <span style={{ width: 34 }}>{r.note} ★</span>
                  <div className="gauge__bar" style={{ flex: 1 }}><div className="gauge__fill" style={{ width: `${(r.nb / c.total) * 100}%`, background: 'var(--primary)' }} /></div>
                  <span style={{ width: 28, textAlign: 'right' }}>{r.nb}</span>
                </div>
              ))}
            </div>
          )}

          {c.commentaires.length === 0 && c.total === 0 && <div className="empty">Aucun avis pour le moment.</div>}
          {c.commentaires.map((m, i) => (
            <div key={i} className="alert alert-info" style={{ display: 'block' }}>
              <strong>{m.appreciation} ★</strong> <small className="muted">· {new Date(m.updatedAt).toLocaleDateString('fr-FR', { timeZone: TIMEZONE })}</small>
              <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{m.commentaire}</p>
            </div>
          ))}
        </div>
      ))}
      <small className="hint">Les avis sont anonymes : les noms des étudiants ne sont pas affichés.</small>
    </section>
  );
}