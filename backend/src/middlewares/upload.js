// backend/src/middlewares/upload.js
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const ApiError = require('../utils/ApiError');

fs.mkdirSync(cfg.paths.photos, { recursive: true });
fs.mkdirSync(cfg.paths.travaux, { recursive: true });
fs.mkdirSync(cfg.paths.rendus, { recursive: true });
fs.mkdirSync(cfg.paths.documents, { recursive: true });

// Photo par défaut : copiée sur le disque au premier démarrage
const defaultPhoto = require('path').join(cfg.paths.photos, 'default.png');
const bundledPhoto = require('path').join(__dirname, '..', '..', 'uploads', 'profils', 'default.png');
if (!fs.existsSync(defaultPhoto) && fs.existsSync(bundledPhoto)) fs.copyFileSync(bundledPhoto, defaultPhoto);

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cfg.paths.photos),
  // Nom aléatoire : jamais le nom d'origine
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${EXTENSIONS[file.mimetype]}`),
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: env.uploads.maxPhotoMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXTENSIONS[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Photo : formats JPEG ou PNG uniquement.')),
}).single('photo');

const DOC_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'text/plain': '.txt',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const docUploader = (dir) => multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${DOC_EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: cfg.evaluations.maxFileMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    DOC_EXTENSIONS[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Fichier : PDF, Word, Excel, PowerPoint, ZIP, texte ou image uniquement.')),
}).single('fichier');

const uploadTravail = docUploader(cfg.paths.travaux);
const uploadDocument = docUploader(cfg.paths.documents);
const uploadRendu = docUploader(cfg.paths.rendus);

module.exports = { uploadPhoto, uploadTravail, uploadDocument, uploadRendu };