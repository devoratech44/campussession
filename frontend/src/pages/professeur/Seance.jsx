// frontend/src/pages/professeur/Seance.jsx
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SeancePanel from '../../components/presence/SeancePanel';

export default function Seance() {
  const { id } = useParams();
  return (
    <section className="stack rise">
      <div><Link to="/professeur/presences" className="btn btn-ghost"><ArrowLeft size={18} /> Mes séances</Link></div>
      <SeancePanel key={id} seanceId={id} role="professeur" />
    </section>
  );
}