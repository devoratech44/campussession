// frontend/src/components/common/StatCard.jsx
import { Link } from 'react-router-dom';

export default function StatCard({ icon: Icon, label, value, to, tone = 'default' }) {
  const content = (
    <>
      <span className="ico"><Icon size={26} /></span>
      <div>
        <div className="value">{value ?? '—'}</div>
        <div className="label">{label}</div>
      </div>
    </>
  );
  const className = `card card-hover stat tone-${tone}`;
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}