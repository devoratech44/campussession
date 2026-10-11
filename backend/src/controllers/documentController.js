// backend/src/controllers/documentController.js
const fs = require('fs');
const cfg = require('../config/appConfig');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/documentService');

// Multer lit les noms en latin1 : on les remet en UTF-8
const fileInfo = (f) => (f ? {
  filename: f.filename,
  size: f.size,
  nomOriginal: Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 255),
} : null);

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await svc.list(req.query, { page, limit }) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.create(req.body, fileInfo(req.file), req.user) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await svc.update(Number(req.params.id), req.body, fileInfo(req.file), req.body.retirerFichier === 'true');
  res.json({ success: true, data });
});

exports.archive = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.setArchive(Number(req.params.id), req.body.archive === true || req.body.archive === 'true') });
});

exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id));
  res.json({ success: true });
});

exports.fichier = asyncHandler(async (req, res) => {
  const f = await svc.fileOf(Number(req.params.id));
  if (!fs.existsSync(f.path)) throw new ApiError(404, 'Fichier introuvable sur le serveur.');
  res.download(f.path, f.name);
});