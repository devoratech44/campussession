// frontend/src/config/env.js
const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME,
  motto: import.meta.env.VITE_APP_MOTTO,
  authorName: import.meta.env.VITE_AUTHOR_NAME,
  authorUrl: import.meta.env.VITE_AUTHOR_URL,
  statusRefreshMs: Number(import.meta.env.VITE_STATUS_REFRESH_MS) || 15000,
  sessionCheckMs: Number(import.meta.env.VITE_SESSION_CHECK_MS) || 30000,
  codeLength: Number(import.meta.env.VITE_CODE_LENGTH) || 6,
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL,
  copyright: import.meta.env.VITE_COPYRIGHT,
  filesUrl: import.meta.env.VITE_FILES_URL,
  defaultPhoto: import.meta.env.VITE_DEFAULT_PHOTO || 'default.png',
  maxPhotoMb: Number(import.meta.env.VITE_MAX_PHOTO_MB) || 2,
  passwordGenLength: Number(import.meta.env.VITE_PASSWORD_GEN_LENGTH) || 12,
  toastMs: Number(import.meta.env.VITE_TOAST_MS) || 4000,
  searchDebounceMs: Number(import.meta.env.VITE_SEARCH_DEBOUNCE_MS) || 350,
  liveRefreshMs: Number(import.meta.env.VITE_LIVE_REFRESH_MS) || 5000,
  signatureWidth: Number(import.meta.env.VITE_SIGNATURE_WIDTH) || 400,
  signatureHeight: Number(import.meta.env.VITE_SIGNATURE_HEIGHT) || 300,
  signatureStroke: Number(import.meta.env.VITE_SIGNATURE_STROKE) || 3,
  qrSize: Number(import.meta.env.VITE_QR_SIZE) || 300,
  reopenChoices: String(import.meta.env.VITE_REOPEN_CHOICES || '15,30,60').split(',').map(Number).filter(Boolean),
};

export default env;