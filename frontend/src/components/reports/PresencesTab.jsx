// frontend/src/components/reports/PresencesTab.jsx
import { useCallback, useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { errorMessage } from '../../utils/format';
import { exportTablePdf, exportTableExcel } from '../../utils/reportExporters';
import Loader from '../common/Loader';

const ALERT = Number(import.meta.env.VITE_REPORT_ALERT_RATE) || 75;
const HEAD = ['Étudiant', 'Matricule', 'Classe', 'Séances', 'Présents', 'Retards', 'Absents', 'Absences non justifiées', 'Retards non justifiés', 'Taux de présence (%)'];
const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v));
const fmt = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const line = (r) => [`${r.prenom} ${r.nom}`, r.matricule || '', r.classe || '', r.seances, r.presents, r.retards, r.absents, r.absentsNJ, r.retardsNJ, r.taux === null ? '' : fmt(r.taux)];

export default function PresencesTab({ filters, subtitle }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setPage(1); }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/rapports/presences', { params: { ...clean(filters), page } });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const onExport = async (kind) => {
    setExporting(true);
    try {
      const { data: res } = await api.get('/rapports/presences', { params: { ...clean(filters), tout: true } });
      const payload = { title: 'Rapport de présences', subtitle, head: HEAD, rows: res.data.items.map(line), filename: 'rapport-presences' };
      if (kind === 'pdf') await exportTablePdf(payload);
      else await exportTableExcel(payload);
      toast.success(`Export ${kind === 'pdf' ? 'PDF' : 'Excel'} prêt.`);
    } catch (err) {
      toast.error(`Export impossible : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-ghost" disabled={exporting || !data?.total} onClick={() => onExport('pdf')}><FileDown size={18} /> PDF</button>
        <button type="button" className="btn btn-ghost" disabled={exporting || !data?.total} onClick={() => onExport('excel')}><FileSpreadsheet size={18} /> Excel</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      {loading && !data ? <Loader /> : (
        <div className="table-wrap">
          <table className="rep-table">
            <thead>
              <tr><th>Étudiant</th><th>Classe</th><th>Séances</th><th>Présents</th><th>Retards</th><th>Absents</th><th>Abs. non just.</th><th>Ret. non just.</th><th>Taux</th></tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && <tr><td colSpan={9} className="empty">Aucune donnée : aucune séance fermée pour ces filtres.</td></tr>}
              {data?.items.map((r) => (
                <tr key={r.etudiantId}>
                  <td>{r.prenom} {r.nom}{r.estBloque && <span className="badge badge-ko" style={{ marginLeft: 6 }}>Bloqué</span>}<small className="muted" style={{ display: 'block' }}>{r.matricule}</small></td>
                  <td>{r.classe || '—'}</td>
                  <td>{r.seances}</td>
                  <td>{r.presents}</td>
                  <td>{r.retards}</td>
                  <td>{r.absents}</td>
                  <td>{r.absentsNJ}</td>
                  <td>{r.retardsNJ}</td>
                  <td className={r.taux !== null && r.taux < ALERT ? 'rate-bad' : 'rate-ok'}>{fmt(r.taux)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="row row-between">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /> Précédent</button>
          <span className="muted">Page {data.page} / {data.pages} · {data.total} étudiant(s)</span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant <ChevronRight size={18} /></button>
        </div>
      )}
      <small className="hint">Trié du plus faible au meilleur taux. En rouge : taux inférieur à {ALERT} %.</small>
    </div>
  );
}