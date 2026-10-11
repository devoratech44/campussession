// frontend/src/pages/professeur/Moyennes.jsx
import { useEffect, useState } from 'react';
import { TrendingUp, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import Loader from '../../components/common/Loader';
import MoyennesTab from '../../components/evaluations/MoyennesTab';
import '../../styles/evaluations.css';
import '../../styles/reports.css';

export default function Moyennes() {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/professeur/options')
      .then((r) => setOptions({ ...r.data.data, filieres: [] }))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (!options) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><TrendingUp size={24} /></span> Moyennes de mes étudiants</h1>
      </div>
      <MoyennesTab options={options} base="/professeur" />
      <small className="hint">Seules vos évaluations sont comptées : la moyenne générale porte donc sur vos modules uniquement.</small>
    </section>
  );
}