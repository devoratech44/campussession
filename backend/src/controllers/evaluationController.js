// backend/src/controllers/evaluationController.js
const fs = require('fs');
const cfg = require('../config/appConfig');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/evaluationService');

// Multer lit les noms en latin1 : on les remet en UTF-8
const fileInfo = (f) => (f ? { filename: f.filename, nomOriginal: Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 255) } : null);

const sendFile = (res, f) => {
  if (!fs.existsSync(f.path)) throw new ApiError(404, 'Fichier introuvable sur le serveur.');
  res.download(f.path, f.name);
};

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await svc.list(req.query, { page, limit }) });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.detail(Number(req.params.id)) });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.create(req.body, fileInfo(req.file), req.user) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await svc.update(Number(req.params.id), req.body, fileInfo(req.file), req.body.retirerFichier === 'true');
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id));
  res.json({ success: true });
});

exports.saveNotes = asyncHandler(async (req, res) => {
  await svc.saveNotes(Number(req.params.id), req.body.notes, req.user);
  res.json({ success: true, data: await svc.detail(Number(req.params.id)) });
});

exports.moyennes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.moyennes(req.query) });
});

exports.fichier = asyncHandler(async (req, res) => sendFile(res, await svc.travailFile(Number(req.params.id))));

exports.fichierRendu = asyncHandler(async (req, res) => {
  sendFile(res, await svc.renduFile(Number(req.params.id), Number(req.params.etudiantId)));
});