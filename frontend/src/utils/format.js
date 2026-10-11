// frontend/src/utils/format.js
import env from '../config/env';

export const errorMessage = (err, fallback = 'Une erreur est survenue.') => {
  if (!err?.response) return 'Serveur injoignable. Vérifiez votre connexion.';
  return err.response.data?.message || fallback;
};

export const photoUrl = (name) => `${env.filesUrl}/profils/${name}`;