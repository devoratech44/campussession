// backend/src/config/appConfig.js
const path = require('path');
const env = require('./env');

// Dossier des fichiers : le disque Render en production (UPLOAD_ROOT), le dossier backend en local
const ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..');

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

module.exports = {
  appName: process.env.APP_NAME || 'Campus Session',
  academicYear: env.academicYear,

  roles: ['admin', 'professeur', 'etudiant'],
  genres: ['Homme', 'Femme', 'Autre'],
  niveaux: ['Niveau 1', 'Niveau 2'],
  etatsAcademiques: ['Nouveau', 'Réinscrit', 'Redoublant'],
statutsProfesseur: ['Disponible', 'Congé'],
statutConge: 'Congé',

  // Champs gérés par l'administrateur (création / modification d'un compte)
  userFields: {
    common: ['matricule', 'prenom', 'nom', 'email', 'telephone', 'dateNaissance', 'lieuNaissance', 'adresse', 'genre'],
    etudiant: ['niveau', 'filiereId', 'classeId', 'etatAcademique'],
    professeur: ['specialite', 'statut'],
  },

  // Champs que chacun peut modifier dans Paramètres (§ 4.3)
  profileFields: {
    admin: ['prenom', 'nom', 'email', 'telephone'],
    professeur: ['prenom', 'nom', 'email', 'telephone', 'dateNaissance', 'lieuNaissance', 'adresse', 'genre', 'specialite', 'statut'],
    etudiant: ['prenom', 'nom', 'email', 'telephone', 'dateNaissance', 'lieuNaissance', 'adresse', 'genre'],
  },

  blocking: {
    maxLates: num(process.env.BLOCK_MAX_LATES, 5),
    maxAbsences: num(process.env.BLOCK_MAX_ABSENCES, 3),
    mode: (process.env.BLOCK_MODE || 'or').toLowerCase(), // 'or' | 'and'
  },

  verification: {
    validityMinutes: num(process.env.CODE_VALIDITY_MINUTES, 10),
    maxAttempts: num(process.env.CODE_MAX_ATTEMPTS, 5),
    resendSeconds: num(process.env.CODE_RESEND_SECONDS, 60),
    length: 6,
  },

  publicTypes: ['classe', 'filiere', 'groupe', 'etudiant'],
  lookupLimit: num(process.env.LOOKUP_LIMIT, 20),

  // Grille de l'emploi du temps (§ 6) : 11h00 -> minuit, créneaux de 30 minutes
  schedule: {
    startMinutes: num(process.env.SCHEDULE_START_HOUR, 11) * 60,
    endMinutes: num(process.env.SCHEDULE_END_HOUR, 24) * 60,
    stepMinutes: num(process.env.SCHEDULE_STEP_MINUTES, 30),
  },

  pagination: {
    defaultLimit: num(process.env.PAGE_SIZE, 10),
    maxLimit: num(process.env.PAGE_SIZE_MAX, 100),
  },

  dashboard: {
    watchLimit: num(process.env.DASHBOARD_WATCH_LIMIT, 5),
    onlineLimit: num(process.env.DASHBOARD_ONLINE_LIMIT, 8),
  },

  paths: {
    photos: path.join(ROOT, 'uploads', 'profils'),
    travaux: path.join(ROOT, 'private', 'travaux'),
    rendus: path.join(ROOT, 'private', 'rendus'),
    documents: path.join(ROOT, 'private', 'documents'),
  },

  password: { min: 8, max: 72 },
  onlineThresholdSeconds: 90,
  maxTpPerEnseignement: 3,

  evaluations: {
    types: ['devoir', 'examen', 'tp'],
    weights: {
      devoir: num(process.env.EVAL_WEIGHT_DEVOIR, 1),
      tp: num(process.env.EVAL_WEIGHT_TP, 1),
      examen: num(process.env.EVAL_WEIGHT_EXAMEN, 2),
    },
    maxNote: num(process.env.EVAL_MAX_NOTE, 20),
    maxFileMb: num(process.env.UPLOAD_MAX_DOC_MB, 50),
    autoNotify: String(process.env.EVAL_AUTO_NOTIFY || 'true') === 'true',
    lateGraceHours: num(process.env.RENDU_GRACE_HOURS, 0),
  },

  documents: {
    types: ['cours', 'ressource', 'video', 'autre'],
    autoNotify: String(process.env.DOC_AUTO_NOTIFY || 'true') === 'true',
  },

  messagerie: {
    maxLength: num(process.env.MSG_MAX_LENGTH, 2000),
    pageSize: num(process.env.MSG_PAGE_SIZE, 50),
    rateMax: num(process.env.MSG_RATE_MAX, 60),
    groupMax: num(process.env.MSG_GROUP_MAX, 500),
  },

  reports: {
    maxRows: num(process.env.REPORT_MAX_ROWS, 5000),
    chartPoints: num(process.env.REPORT_CHART_POINTS, 60),
  },

  professeur: {
    upcomingMax: num(process.env.PROF_UPCOMING_MAX, 3),
    upcomingDays: num(process.env.PROF_UPCOMING_DAYS, 14),
    canEditNotes: String(process.env.PROF_CAN_EDIT_NOTES || 'false') === 'true',
  },

  etudiant: {
    upcomingMax: num(process.env.STUDENT_UPCOMING_MAX, 3),
    upcomingDays: num(process.env.STUDENT_UPCOMING_DAYS, 14),
    recentNotes: num(process.env.STUDENT_RECENT_NOTES, 5),
  },

    surveillance: {
    graceSeconds: num(process.env.SURV_GRACE_SECONDS, 20),
    autoExclude: String(process.env.SURV_AUTO_EXCLUDE || 'false') === 'true',
  },

  notifications: {
    types: ['information', 'devoir', 'examen', 'notes', 'presences', 'emploi_du_temps', 'systeme'],
    cibleTypes: ['tous', 'classe', 'filiere', 'groupe', 'utilisateur'],
    bellLimit: num(process.env.NOTIF_BELL_LIMIT, 10),
  },

  seanceStatuts: ['planifiee', 'ouverte', 'fermee', 'annulee'],
  presenceStatuts: ['present', 'retard', 'absent'],
  presenceMethodes: ['qr', 'code', 'prof', 'admin', 'auto'],

  // Sessions de présence (QR, code, signatures, mails automatiques)
  sessions: {
    tickSeconds: num(process.env.SESSION_TICK_SECONDS, 30),
    profMailBeforeMin: num(process.env.SESSION_PROF_MAIL_BEFORE_MIN, 30),
    openBeforeMin: num(process.env.SESSION_OPEN_BEFORE_MIN, 5),
    closeAfterMin: num(process.env.SESSION_CLOSE_AFTER_MIN, 5),
    lateGraceMin: num(process.env.LATE_GRACE_MIN, 5),
    lateMailAfterStartMin: num(process.env.LATE_MAIL_AFTER_START_MIN, 5),
    absenceMailBeforeEndMin: num(process.env.ABSENCE_MAIL_BEFORE_END_MIN, 5),
    reopenDefaultMin: num(process.env.REOPEN_DEFAULT_MIN, 15),
    reopenMaxMin: num(process.env.REOPEN_MAX_MIN, 480),
    retardMaxMin: num(process.env.RETARD_MAX_MIN, 240),
    codeLength: num(process.env.ATTENDANCE_CODE_LENGTH, 6),
    signatureMaxKb: num(process.env.SIGNATURE_MAX_KB, 300),
    pointageRateMax: num(process.env.POINTAGE_RATE_MAX, 20),
    publicUrl: (process.env.PUBLIC_APP_URL || (env.clientUrl || '').split(',')[0]).replace(/\/$/, ''),
  },
};