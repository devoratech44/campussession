// frontend/src/components/common/ProtectedRoute.jsx
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { homeForRole } from '../../utils/roles';
import { clearRedirect, rememberRedirect } from '../../utils/redirect';
import Loader from './Loader';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading, blocked } = useAuth();
  const location = useLocation();
  const allowed = Boolean(user) && (!roles || roles.includes(user.role));

  useEffect(() => { if (allowed) clearRedirect(); }, [allowed]);

  if (loading) return <Loader />;
  if (!user) {
    // Lien d'un QR code scanné sans être connecté : retour automatique après connexion
    if (location.pathname.includes('/pointage/')) rememberRedirect(location.pathname);
    return <Navigate to={blocked ? '/bloque' : '/connexion'} replace />;
  }
  if (!allowed) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
}