// frontend/src/utils/roles.js
export const ROLE_HOME = { admin: '/admin', professeur: '/professeur', etudiant: '/etudiant' };
export const ROLE_LABEL = { admin: 'Administrateur', professeur: 'Professeur', etudiant: 'Étudiant' };

export const homeForRole = (role) => ROLE_HOME[role] || '/connexion';