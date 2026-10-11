// frontend/src/pages/professeur/Cours.jsx
import { useEffect, useState } from 'react';
import { BookOpen, CircleAlert, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage, photoUrl } from '../../utils/format';
import { PUBLIC_TYPES } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import '../../styles/reports.css';
import '../../styles/etudiant.css';

const ALERT = Number(import.meta.env.VITE_REPORT_ALERT_RATE) || 75;
const fmt = (v) => (v === null || v === undefined ? '—' : String(v).replace('.', ','));

export default function Cours() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/professeur/cours').then((res) => setItems(res.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!items) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><BookOpen size={24} /></span> Mes cours et étudiants</h1>
      </div>

      {items.length === 0 && <div className="empty">Aucun cours ne vous est assigné pour le moment.</div>}

      {items.map((c) => {
        const isOpen = open === c.id;
        return (
          <div className="card stack" key={c.id}>
            <button type="button" className="row row-between" style={{ border: 0, background: 'none', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}>
              <span className="stack" style={{ gap: '0.25rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>{c.module.code} · {c.module.nom}</strong>
                <span className="meta-line">
                  <span><Layers size={14} /> {PUBLIC_TYPES[c.publicType]} : {c.publicLabel}</span>
                  <span>Coef. {fmt(Number(c.module.coefficient))}</span>
                  <span>{c.module.volumeHoraire} h prévues</span>
                </span>
              </span>
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <div className="row">
              <span className="badge badge-info">{c.etudiants.length} étudiant(s)</span>
              <span className="badge">{c.nbSeances} séance(s) tenue(s)</span>
              <span className="badge">{c.nbEvaluations} évaluation(s)</span>
            </div>

            {isOpen && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Étudiant</th><th>Séances</th><th>Abs. non just.</th><th>Taux de présence</th></tr></thead>
                  <tbody>
                    {c.etudiants.length === 0 && <tr><td colSpan={4} className="empty">Aucun étudiant concerné.</td></tr>}
                    {c.etudiants.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="cell-user">
                            <img className="avatar" src={photoUrl(e.photo)} alt="" />
                            <span>{e.prenom} {e.nom}{e.estBloque && <span className="badge badge-ko" style={{ marginLeft: 6 }}>Bloqué</span>}<small>{e.matricule}</small></span>
                          </div>
                        </td>
                        <td>{e.seances}</td>
                        <td>{e.absentsNJ}</td>
                        <td className={e.taux !== null && e.taux < ALERT ? 'rate-bad' : 'rate-ok'}>{fmt(e.taux)}{e.taux === null ? '' : ' %'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      <small className="hint">Les taux ne comptent que les séances terminées de ce cours.</small>
    </section>
  );
}