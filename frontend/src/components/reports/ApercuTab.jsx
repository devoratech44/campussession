// frontend/src/components/reports/ApercuTab.jsx
import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../api/axios';
import brand from '../../config/brand';
import { errorMessage } from '../../utils/format';
import Loader from '../common/Loader';

const H = Number(import.meta.env.VITE_REPORT_CHART_HEIGHT) || 280;
const RED = '#ef4444';
const BLUE = '#3b82f6';
const tick = { fill: 'var(--text-muted)', fontSize: 12 };
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' } };
const fmt = (n, suffix = '') => (n === null || n === undefined ? '—' : `${String(n).replace('.', ',')}${suffix}`);
const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v));

function Chart({ title, empty, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {empty ? <div className="empty">Pas encore de données.</div> : <div style={{ height: H }}>{children}</div>}
    </div>
  );
}

export default function ApercuTab({ filters }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/rapports/apercu', { params: clean(filters) })
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  if (error) return <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>;
  if (loading || !data) return <Loader />;

  const k = data.kpis;
  const pie = [
    { name: 'Présents', value: k.presents, color: brand.green },
    { name: 'Retards', value: k.retards, color: brand.gold },
    { name: 'Absents', value: k.absents, color: RED },
  ].filter((x) => x.value > 0);
  const alertRate = Number(import.meta.env.VITE_REPORT_ALERT_RATE) || 75;

  return (
    <div className="stack">
      <div className="kpi-grid">
        <div className="kpi"><small>Étudiants</small><strong>{k.nbEtudiants}</strong></div>
        <div className="kpi"><small>Professeurs</small><strong>{k.nbProfesseurs}</strong></div>
        <div className="kpi"><small>Séances tenues</small><strong>{k.seancesTenues}</strong><small>{k.seancesAnnulees} annulée(s)</small></div>
        <div className={`kpi ${k.tauxPresence === null ? '' : (k.tauxPresence >= alertRate ? 'good' : 'bad')}`}><small>Taux de présence</small><strong>{fmt(k.tauxPresence, ' %')}</strong></div>
        <div className="kpi"><small>Retards</small><strong>{k.retards}</strong><small>{k.retardsNJ} non justifié(s)</small></div>
        <div className="kpi"><small>Absences</small><strong>{k.absents}</strong><small>{k.absentsNJ} non justifiée(s)</small></div>
        <div className="kpi"><small>Moyenne des notes</small><strong>{fmt(k.moyenneNotes)}</strong><small>{k.nbNotes} note(s)</small></div>
        <div className={`kpi ${k.nbBloques ? 'bad' : ''}`}><small>Étudiants bloqués</small><strong>{k.nbBloques}</strong></div>
      </div>

      <div className="chart-grid">
        <Chart title="Répartition des pointages" empty={pie.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
                {pie.map((x) => <Cell key={x.name} fill={x.color} />)}
              </Pie>
              <Tooltip {...tip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Taux de présence par module (%)" empty={data.presenceParModule.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.presenceParModule}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="code" tick={tick} />
              <YAxis domain={[0, 100]} tick={tick} />
              <Tooltip {...tip} />
              <Bar dataKey="taux" name="Présence (%)" fill={brand.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Évolution par séance (par jour)" empty={data.presenceParJour.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.presenceParJour}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="jour" tick={tick} tickFormatter={(d) => d.slice(5).split('-').reverse().join('/')} />
              <YAxis tick={tick} allowDecimals={false} />
              <Tooltip {...tip} />
              <Legend />
              <Bar dataKey="presents" name="Présents" stackId="a" fill={brand.green} />
              <Bar dataKey="retards" name="Retards" stackId="a" fill={brand.gold} />
              <Bar dataKey="absents" name="Absents" stackId="a" fill={RED} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Moyenne des notes par module" empty={data.notesParModule.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.notesParModule}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="code" tick={tick} />
              <YAxis domain={[0, 20]} tick={tick} />
              <Tooltip {...tip} />
              <Bar dataKey="moyenne" name="Moyenne /20" fill={BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Distribution des notes" empty={k.nbNotes === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.distributionNotes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="tranche" tick={tick} />
              <YAxis tick={tick} allowDecimals={false} />
              <Tooltip {...tip} />
              <Bar dataKey="nb" name="Notes" fill={brand.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </div>
      <small className="hint">Seules les séances fermées sont comptées. Les retards et absences non justifiés sont ceux qui comptent pour le blocage automatique.</small>
    </div>
  );
}