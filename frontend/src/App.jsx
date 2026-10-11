// frontend/src/App.jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { homeForRole } from './utils/roles';
import { ADMIN_NAV } from './config/navigation';
import Loader from './components/common/Loader';
import ProtectedRoute from './components/common/ProtectedRoute';

import AdminLayout from './components/layout/AdminLayout';
import ProfesseurLayout from './components/layout/ProfesseurLayout';
import EtudiantLayout from './components/layout/EtudiantLayout';

import Login from './pages/auth/Login';
import VerifyCode from './pages/auth/VerifyCode';
import Blocked from './pages/auth/Blocked';

import ComingSoon from './pages/shared/ComingSoon';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUtilisateurs from './pages/admin/Utilisateurs';
import AdminClassesFilieres from './pages/admin/ClassesFilieres';
import AdminParametres from './pages/admin/Parametres';
import AdminGroupes from './pages/admin/Groupes';
import AdminModules from './pages/admin/Modules';
import AdminEmploiDuTemps from './pages/admin/EmploiDuTemps';
import AdminPresences from './pages/admin/Presences';
import AdminNotifications from './pages/admin/Notifications';
import AdminEvaluations from './pages/admin/Evaluations';
import AdminDocuments from './pages/admin/Documents';
import AdminMessagerie from './pages/admin/Messagerie';
import AdminRapports from './pages/admin/Rapports';
import ProfesseurDashboard from './pages/professeur/Dashboard';
import EtudiantDashboard from './pages/etudiant/Dashboard';
import ProfesseurPresences from './pages/professeur/Presences';
import ProfesseurSeance from './pages/professeur/Seance';
import ProfesseurParametres from './pages/professeur/Parametres';
import ProfesseurEmploiDuTemps from './pages/professeur/EmploiDuTemps';
import ProfesseurCours from './pages/professeur/Cours';
import ProfesseurMessagerie from './pages/etudiant/Messagerie';
import ProfesseurEvaluations from './pages/professeur/Evaluations';
import ProfesseurDocuments from './pages/professeur/Documents';
import ProfesseurAvis from './pages/professeur/Avis';
import ProfesseurMoyennes from './pages/professeur/Moyennes';
import EtudiantPointage from './pages/etudiant/Pointage';
import EtudiantParametres from './pages/etudiant/Parametres';
import EtudiantPresences from './pages/etudiant/Presences';
import EtudiantEmploiDuTemps from './pages/etudiant/EmploiDuTemps';
import EtudiantMessagerie from './pages/etudiant/Messagerie';
import EtudiantDevoirs from './pages/etudiant/Devoirs';
import EtudiantNotes from './pages/etudiant/Notes';
import EtudiantDocuments from './pages/etudiant/Documents';
import EtudiantAvis from './pages/etudiant/Avis';
import EtudiantContenu from './pages/etudiant/Contenu';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={user ? homeForRole(user.role) : '/connexion'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/verification" element={<VerifyCode />} />
      <Route path="/bloque" element={<Blocked />} />

      <Route element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/utilisateurs" element={<AdminUtilisateurs />} />
        <Route path="/admin/classes" element={<AdminClassesFilieres />} />
        <Route path="/admin/parametres" element={<AdminParametres />} />
        <Route path="/admin/groupes" element={<AdminGroupes />} />
        <Route path="/admin/modules" element={<AdminModules />} />
        <Route path="/admin/emploi-du-temps" element={<AdminEmploiDuTemps />} />
<Route path="/admin/presences" element={<AdminPresences />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/evaluations" element={<AdminEvaluations />} />
        <Route path="/admin/documents" element={<AdminDocuments />} />
        <Route path="/admin/messagerie" element={<AdminMessagerie />} />
        <Route path="/admin/rapports" element={<AdminRapports />} />
        {ADMIN_NAV.filter((item) => item.soon).map((item) => (
          <Route key={item.to} path={item.to} element={<ComingSoon title={item.label} icon={item.icon} />} />
        ))}
      </Route>

      <Route element={<ProtectedRoute roles={['professeur']}><ProfesseurLayout /></ProtectedRoute>}>
        <Route path="/professeur" element={<ProfesseurDashboard />} />
<Route path="/professeur/presences" element={<ProfesseurPresences />} />
<Route path="/professeur/presences/:id" element={<ProfesseurSeance />} />
<Route path="/professeur/parametres" element={<ProfesseurParametres />} />
<Route path="/professeur/emploi-du-temps" element={<ProfesseurEmploiDuTemps />} />
<Route path="/professeur/cours" element={<ProfesseurCours />} />
<Route path="/professeur/messagerie" element={<ProfesseurMessagerie />} />
<Route path="/professeur/evaluations" element={<ProfesseurEvaluations />} />
<Route path="/professeur/documents" element={<ProfesseurDocuments />} />
<Route path="/professeur/avis" element={<ProfesseurAvis />} />
<Route path="/professeur/moyennes" element={<ProfesseurMoyennes />} />
      </Route>

      <Route element={<ProtectedRoute roles={['etudiant']}><EtudiantLayout /></ProtectedRoute>}>
        <Route path="/etudiant" element={<EtudiantDashboard />} />
<Route path="/etudiant/pointage" element={<EtudiantPointage />} />
<Route path="/etudiant/pointage/:token" element={<EtudiantPointage />} />
<Route path="/etudiant/parametres" element={<EtudiantParametres />} />
        <Route path="/etudiant/presences" element={<EtudiantPresences />} />
        <Route path="/etudiant/emploi-du-temps" element={<EtudiantEmploiDuTemps />} />
        <Route path="/etudiant/messagerie" element={<EtudiantMessagerie />} />
        <Route path="/etudiant/devoirs" element={<EtudiantDevoirs />} />
        <Route path="/etudiant/notes" element={<EtudiantNotes />} />
        <Route path="/etudiant/documents" element={<EtudiantDocuments />} />
        <Route path="/etudiant/avis" element={<EtudiantAvis />} />
        <Route path="/etudiant/contenu" element={<EtudiantContenu />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}