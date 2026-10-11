// frontend/src/components/etudiant/Gauges.jsx
import { CircleAlert, ShieldAlert } from 'lucide-react';
import '../../styles/etudiant.css';
import '../../styles/reports.css';

function Gauge({ label, count, max }) {
  const pct = Math.min(100, Math.round((count / Math.max(1, max)) * 100));
  const level = count >= max ? 'bad' : (pct >= 60 ? 'warn' : '');
  return (
    <div className={`gauge ${level}`}>
      <div className="gauge__top"><small className="muted">{label}</small><strong>{count} / {max}</strong></div>
      <div className="gauge__bar" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={max}><div className="gauge__fill" style={{ width: `${pct}%` }} /></div>
      <small className="muted">{count >= max ? 'Limite atteinte : un de plus et le blocage s’applique.' : `${max - count} avant la limite.`}</small>
    </div>
  );
}

export default function Gauges({ blocage }) {
  const b = blocage;
  return (
    <div className="stack">
      {b.estBloque && <div className="alert alert-error" role="alert"><ShieldAlert size={18} />Votre compte est bloqué. Contactez l’administration.</div>}
      <div className="kpi-grid">
        <Gauge label="Retards non justifiés" count={b.retards} max={b.maxRetards} />
        <Gauge label="Absences non justifiées" count={b.absences} max={b.maxAbsences} />
      </div>
      <small className="hint"><CircleAlert size={14} style={{ verticalAlign: 'text-bottom' }} /> Blocage automatique au-delà de {b.maxRetards} retard(s) {b.mode === 'and' ? 'et' : 'ou'} {b.maxAbsences} absence(s) non justifié(s). Seules les séances terminées comptent.</small>
    </div>
  );
}