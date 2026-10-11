// frontend/src/pages/admin/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Presentation, School, Layers, UsersRound, BookOpen, Ban, Wifi, CircleAlert, TriangleAlert, ArrowRight,
  ClipboardCheck, NotebookPen, FolderOpen, Star, Bell, MessageSquare, TrendingUp,
} from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';
import { ADMIN_NAV } from '../../config/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage, photoUrl } from '../../utils/format';
import { ROLE_LABEL } from '../../utils/roles';
import StatCard from '../../components/common/StatCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => api.get('/dashboard/admin')
      .then((res) => { if (active) { setData(res.data.data); setError(''); } })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    load();
    const id = setInterval(load, env.sessionCheckMs);
    return () => { active = false; clearInterval(id); };
  }, []);

  const t = data?.totaux;
  const a = data?.activite;
  const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}${suffix}`);

  return (
    <section className="stack rise">
      <div className="card hero-card">
        <h1>Bonjour, {user.prenom}</h1>
        <p className="muted" style={{ margin: 0 }}>Supervision de {env.appName} : comptes, structure académique et suivi des étudiants.</p>
      </div>

      {error && <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>}

      <div className="stat-grid">
        <StatCard icon={GraduationCap} label="Étudiants" value={t?.etudiants} to="/admin/utilisateurs?role=etudiant" />
        <StatCard icon={Presentation} label="Professeurs" value={t?.professeurs} to="/admin/utilisateurs?role=professeur" />
        <StatCard icon={School} label="Classes" value={t?.classes} to="/admin/classes" />
        <StatCard icon={Layers} label="Filières" value={t?.filieres} to="/admin/classes" />
        <StatCard icon={UsersRound} label="Groupes" value={t?.groupes} to="/admin/groupes" />
        <StatCard icon={BookOpen} label="Modules" value={t?.modules} to="/admin/modules" />
        <StatCard icon={Ban} label="Comptes bloqués" value={t?.bloques} to="/admin/utilisateurs?bloques=true" tone="danger" />
        <StatCard icon={Wifi} label="En ligne" value={t?.enLigne} tone="ok" />
      </div>

      <h2 style={{ margin: 0 }}>Activité</h2>
      <div className="stat-grid">
        <StatCard icon={ClipboardCheck} label="Séances du jour" value={a?.seancesDuJour} to="/admin/presences" />
        <StatCard icon={ClipboardCheck} label="Séances ouvertes" value={a?.seancesOuvertes} to="/admin/presences" tone="ok" />
        <StatCard icon={TrendingUp} label="Taux de présence (%)" value={fmt(a?.tauxPresence)} to="/admin/rapports" />
        <StatCard icon={NotebookPen} label="Évaluations" value={a?.evaluations} to="/admin/evaluations" />
        <StatCard icon={NotebookPen} label="Rendus à corriger" value={a?.rendusACorriger} to="/admin/evaluations" tone={a?.rendusACorriger ? 'danger' : undefined} />
        <StatCard icon={FolderOpen} label="Documents" value={a?.documents} to="/admin/documents" />
        <StatCard icon={Star} label={`Avis (moy. ${fmt(a?.avisMoyenne)} / 5)`} value={a?.avis} to="/admin/rapports" />
        <StatCard icon={Bell} label="Notifications envoyées" value={a?.notifications} to="/admin/notifications" />
        <StatCard icon={MessageSquare} label="Messages (7 jours)" value={a?.messages7j} to="/admin/messagerie" />
      </div>

      <div className="split">
        <div className="card stack">
          <h2 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}><TriangleAlert size={22} /> Étudiants à surveiller</h2>
          <p className="muted" style={{ margin: 0 }}>Retards et absences non justifiés.</p>
          {data && data.aSurveiller.length === 0 && <div className="empty">Aucun retard ni absence non justifié.</div>}
          {data && data.aSurveiller.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Étudiant</th><th>Classe</th><th>Retards</th><th>Absences</th></tr></thead>
                <tbody>
                  {data.aSurveiller.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/admin/utilisateurs?search=${encodeURIComponent(s.matricule || s.nom)}`} className="cell-user">
                          <img className="avatar" src={photoUrl(s.photo)} alt="" />
                          <span>{s.prenom} {s.nom}<small>{s.matricule}</small></span>
                        </Link>
                      </td>
                      <td>{s.classe || '—'}</td>
                      <td><span className="badge badge-retard">{s.retards}</span></td>
                      <td><span className="badge badge-absent">{s.absences}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card stack">
          <h2 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}><Wifi size={22} /> En ligne</h2>
          {data && data.enLigne.length === 0 && <div className="empty">Personne en ligne.</div>}
          <ul className="list">
            {data?.enLigne.map((o) => (
              <li key={o.id}>
                <span className="cell-user">
                  <img className="avatar" src={photoUrl(o.photo)} alt="" />
                  <span>{o.prenom} {o.nom}<small>{ROLE_LABEL[o.role]}</small></span>
                </span>
                <span className="status-dot ok" title="En ligne" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Accès rapides</h2>
        <div className="quick-grid">
          {ADMIN_NAV.filter((item) => item.to !== '/admin').map(({ to, label, icon: Icon, soon }) => (
            <Link key={to} to={to} className="quick"><Icon size={22} /><span>{label}</span>{soon ? null : <ArrowRight size={16} style={{ marginLeft: 'auto' }} />}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}