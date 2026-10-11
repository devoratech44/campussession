// frontend/src/config/accountRequest.js
import env from './env';

const NL = '\r\n';

// Listes proposées à titre indicatif dans le mail (cahier des charges § 4)
const OPTIONS = {
  niveaux: 'Niveau 1 / Niveau 2',
  filieres: 'CIITN 1 / CIITN 2 / LISD 1 / LISD 2 / CIST 1 / ICC 1',
  etats: 'Nouveau / Réinscrit / Redoublant',
  genres: 'Homme / Femme / Autre',
};

const BODY = [
  'Bonjour,',
  '',
  `Je souhaite obtenir un compte sur ${env.appName}. Voici mes informations :`,
  '',
  '=== À REMPLIR PAR LE DEMANDEUR ===',
  'Rôle (Étudiant ou Professeur) : ',
  'Nom : ',
  'Prénom : ',
  'Date de naissance (JJ/MM/AAAA) : ',
  'Lieu de naissance : ',
  'Adresse : ',
  `Genre (${OPTIONS.genres}) : `,
  'Email (celui qui recevra le code de vérification) : ',
  'Téléphone (facultatif) : ',
  '',
  '--- Si vous êtes ÉTUDIANT ---',
  `Niveau (${OPTIONS.niveaux}) : `,
  `Filière (${OPTIONS.filieres}) : `,
  `Classe (${OPTIONS.filieres}) : `,
  `État académique (${OPTIONS.etats}) : `,
  '',
  '--- Si vous êtes PROFESSEUR ---',
  'Spécialité : ',
  '',
  '=== NE PAS REMPLIR (attribué par l\'administration) ===',
  'Matricule et mot de passe initial : fournis par l\'administrateur après validation.',
  '',
  'Pièce jointe : ma photo de profil (JPEG ou PNG, 2 Mo maximum), facultative.',
  '',
  'Cordialement.',
].join(NL);

export function buildAccountRequestMailto() {
  const subject = encodeURIComponent(`Demande de création de compte – ${env.appName}`);
  const body = encodeURIComponent(BODY);
  return `mailto:${env.contactEmail}?subject=${subject}&body=${body}`;
}