// frontend/src/utils/redirect.js
import { homeForRole } from './roles';

const KEY = 'cs_redirect';

// Mémorise la page demandée (ex. lien du QR code) pour y revenir après connexion
export const rememberRedirect = (path) => {
  try { sessionStorage.setItem(KEY, path); } catch { /* stockage indisponible */ }
};

export const peekRedirect = (role) => {
  const home = homeForRole(role);
  try {
    const saved = sessionStorage.getItem(KEY);
    return saved && saved.startsWith(home) ? saved : home;
  } catch {
    return home;
  }
};

export const clearRedirect = () => {
  try { sessionStorage.removeItem(KEY); } catch { /* stockage indisponible */ }
};