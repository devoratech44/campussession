// frontend/src/contexts/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import env from '../config/env';

const AuthContext = createContext(null);
const TOKEN_KEY = 'cs_token';
const PENDING_KEY = 'cs_pending';

const readPending = () => {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY)); } catch { return null; }
};
const tempHeaders = (pending) => ({ headers: { Authorization: `Bearer ${pending?.tempToken}` } });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [blocage, setBlocage] = useState(null); // compteurs et seuils (étudiant)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [pending, setPendingState] = useState(readPending); // vérification par code en cours
  const [blocked, setBlocked] = useState(null);
  const [notice, setNotice] = useState('');

  const setPending = useCallback((value) => {
    if (value) sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDING_KEY);
    setPendingState(value);
  }, []);

  const endSession = useCallback((message) => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setBlocage(null);
    if (message) setNotice(message);
  }, []);

  const applySession = useCallback((data) => {
    setUser(data.user);
    setBlocage(data.blocage || null);
  }, []);

  // Erreur renvoyée par le contrôle de session
  const handleSessionError = useCallback((err) => {
    const status = err.response?.status;
    if (!status) return; // réseau coupé : on garde la session
    const info = err.response.data?.details;
    if (info?.code === 'ACCOUNT_BLOCKED') {
      setBlocked({ motif: info.motif });
      endSession();
    } else if (info?.code === 'CODE_REQUIRED') {
      endSession('Un nouveau code de vérification est requis. Reconnectez-vous.');
    } else if (status === 401) {
      endSession('Votre session a expiré. Reconnectez-vous.');
    }
  }, [endSession]);

  // Restauration de la session au chargement
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me')
      .then((res) => applySession(res.data.data))
      .catch(handleSessionError)
      .finally(() => setLoading(false));
  }, [applySession, handleSessionError]);

  // Contrôle de session périodique : en ligne, blocage, code forcé
  const loggedIn = Boolean(user);
  useEffect(() => {
    if (!loggedIn) return undefined;
    const id = setInterval(() => {
      api.get('/auth/me').then((res) => applySession(res.data.data)).catch(handleSessionError);
    }, env.sessionCheckMs);
    return () => clearInterval(id);
  }, [loggedIn, applySession, handleSessionError]);

  const login = async (identifiant, motDePasse) => {
    localStorage.removeItem(TOKEN_KEY);
    setNotice('');
    setBlocked(null);
    try {
      const { data } = await api.post('/auth/login', { identifiant, motDePasse });
      const d = data.data;
      if (d.requiresVerification) {
        setPending({
          tempToken: d.tempToken,
          emailMasque: d.emailMasque,
          expiresAt: new Date(d.expiresAt).getTime(),
          resendAt: Date.now() + d.resendSeconds * 1000,
        });
        return { requiresVerification: true };
      }
      localStorage.setItem(TOKEN_KEY, d.token);
      setPending(null);
      setUser(d.user);
      return { user: d.user };
    } catch (err) {
      const info = err.response?.data?.details;
      if (info?.code === 'ACCOUNT_BLOCKED') {
        setBlocked({ motif: info.motif });
        return { blocked: true };
      }
      throw err;
    }
  };

  const verify = async (code) => {
    try {
      const { data } = await api.post('/auth/verify', { code }, tempHeaders(pending));
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setPending(null);
      setNotice('');
      setUser(data.data.user);
      return { user: data.data.user };
    } catch (err) {
      const info = err.response?.data?.details;
      if (info?.code === 'ACCOUNT_BLOCKED') {
        setPending(null);
        setBlocked({ motif: info.motif });
        return { blocked: true };
      }
      throw err;
    }
  };

  const resend = async () => {
    const { data } = await api.post('/auth/resend', {}, tempHeaders(pending));
    const d = data.data;
    setPending({
      ...pending,
      emailMasque: d.emailMasque,
      expiresAt: new Date(d.expiresAt).getTime(),
      resendAt: Date.now() + d.resendSeconds * 1000,
    });
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* session déjà invalide */ }
    endSession();
    setNotice('');
  };

  const value = {
    user, blocage, loading, pending, blocked, notice,
    login, verify, resend, logout,
    clearPending: () => setPending(null),
    clearBlocked: () => setBlocked(null),
    updateUser: (next) => setUser(next),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);