// frontend/src/components/reports/ProfesseursTab.jsx
import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { exportTablePdf, exportTableExcel } from '../../utils/reportExporters';
import Loader from '../common/Loader';

const HEAD = ['Professeur', 'Spécialité', 'Séances tenues', 'Séances annulées', 'Heures dispensées', 'Évaluations', 'Notes saisies', 'Avis moyen (/5)', 'Nombre d’avis'];
const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v));
const fmt = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const line = (r) => [`${r.prenom} ${r.nom}`, r.specialite || '', r.seancesTenues, r.seancesAnnulees, fmt(r.heures), r.evaluations, r.notesSaisies, r.avis === null ? '' : fmt(r.avis), r.nbAvis];

export default function ProfesseursTab({ filters, subtitle }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setItems(null);
    api.get('/rapports/professeurs', { params: clean({ du: filters.du, au: filters.au }) })
      .then((res) => { setItems(res.data.data); setError(''); })
      .catch((err) => setError(errorMessage(err)));
  }, [filters.du, filters.au]);

  const onExport = async (kind) => {
    setExporting(true);
    try {
      const payload = { title: 'Rapport des professeurs', subtitle, head: HEAD, rows: items.map(line), filename: 'rapport-professeurs' };
      if (kind === 'pdf') await exportTablePdf(payload);
      else await exportTableExcel(payload);
      toast.success(`Export ${kind === 'pdf' ? 'PDF' : 'Excel'} prêt.`);
    } catch (err) {
      toast.error(`Export impossible : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (error) return <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>;
  if (!items) return <Loader />;

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-ghost" disabled={exporting || !items.length} onClick={() => onExport('pdf')}><FileDown size={18} /> PDF</button>
        <button type="button" className="btn btn-ghost" disabled={exporting || !items.length} onClick={() => onExport('excel')}><FileSpreadsheet size={18} /> Excel</button>
      </div>
      <div className="table-wrap">
        <table className="rep-table">
          <thead><tr><th>Professeur</th><th>Séances tenues</th><th>Annulées</th><th>Heures</th><th>Évaluations</th><th>Notes saisies</th><th>Avis moyen</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="empty">Aucun professeur.</td></tr>}
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.prenom} {r.nom}<small className="muted" style={{ display: 'block' }}>{r.specialite || ''}</small></td>
                <td>{r.seancesTenues}</td>
                <td>{r.seancesAnnulees}</td>
                <td>{fmt(r.heures)} h</td>
                <td>{r.evaluations}</td>
                <td>{r.notesSaisies}</td>
                <td>{r.avis === null ? '—' : `${fmt(r.avis)} / 5 (${r.nbAvis})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small className="hint">Seules les dates « Du / Au » s’appliquent à cet onglet. Les évaluations, notes et avis sont comptés sur toute la période.</small>
    </div>
  );
}