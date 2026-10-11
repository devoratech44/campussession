// frontend/src/pages/admin/Rapports.jsx
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, School, Layers, BookOpen, CalendarRange, RotateCcw, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { errorMessage } from '../../utils/format';
import { formatDateFr } from '../../utils/schedule';
import Loader from '../../components/common/Loader';
import MoyennesTab from '../../components/evaluations/MoyennesTab';
import ApercuTab from '../../components/reports/ApercuTab';
import PresencesTab from '../../components/reports/PresencesTab';
import ProfesseursTab from '../../components/reports/ProfesseursTab';
import '../../styles/evaluations.css';
import '../../styles/reports.css';

const EMPTY = { classeId: '', filiereId: '', moduleId: '', du: '', au: '' };
const TABS = [['apercu', 'Aperçu'], ['presences', 'Présences'], ['notes', 'Notes'], ['professeurs', 'Professeurs']];

export default function Rapports() {
  const [tab, setTab] = useState('apercu');
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/enseignements/options').then((r) => setOptions(r.data.data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const subtitle = useMemo(() => {
    if (!options) return '';
    return [
      filters.classeId && `Classe : ${options.classes.find((c) => String(c.id) === filters.classeId)?.nom}`,
      filters.filiereId && `Filière : ${options.filieres.find((f) => String(f.id) === filters.filiereId)?.nom}`,
      filters.moduleId && `Module : ${options.modules.find((m) => String(m.id) === filters.moduleId)?.code}`,
      filters.du && `Du ${formatDateFr(filters.du)}`,
      filters.au && `Au ${formatDateFr(filters.au)}`,
    ].filter(Boolean).join('  |  ') || 'Toute la période';
  }, [filters, options]);

  if (!options) return error ? <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div> : <Loader />;

  const set = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><TrendingUp size={24} /></span> Rapports</h1>
      </div>

      <div className="seg" role="tablist" aria-label="Sections" style={{ maxWidth: 520 }}>
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab !== 'notes' && (
        <div className="card">
          <div className="filters-grid">
            {tab !== 'professeurs' && (
              <>
                <div className="field">
                  <label htmlFor="r-classe"><School size={16} /> Classe</label>
                  <select id="r-classe" value={filters.classeId} onChange={set('classeId')}>
                    <option value="">Toutes</option>
                    {options.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="r-filiere"><Layers size={16} /> Filière</label>
                  <select id="r-filiere" value={filters.filiereId} onChange={set('filiereId')}>
                    <option value="">Toutes</option>
                    {options.filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="r-module"><BookOpen size={16} /> Module</label>
                  <select id="r-module" value={filters.moduleId} onChange={set('moduleId')}>
                    <option value="">Tous</option>
                    {options.modules.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="r-du"><CalendarRange size={16} /> Du</label>
              <input id="r-du" type="date" value={filters.du} onChange={set('du')} />
            </div>
            <div className="field">
              <label htmlFor="r-au"><CalendarRange size={16} /> Au</label>
              <input id="r-au" type="date" min={filters.du || undefined} value={filters.au} onChange={set('au')} />
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setFilters(EMPTY)}><RotateCcw size={18} /> Réinitialiser</button>
          </div>
        </div>
      )}

      {tab === 'apercu' && <ApercuTab filters={filters} />}
      {tab === 'presences' && <PresencesTab filters={filters} subtitle={subtitle} />}
      {tab === 'notes' && <MoyennesTab options={options} />}
      {tab === 'professeurs' && <ProfesseursTab filters={filters} subtitle={subtitle} />}
    </section>
  );
}