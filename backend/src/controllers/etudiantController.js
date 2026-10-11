// backend/src/controllers/etudiantController.js
const cfg = require('../config/appConfig');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/etudiantService');

exports.pointage = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.overview(req.user) });
});

exports.presences = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await svc.presences(req.user, req.query, { page, limit }) });
});

exports.dashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.dashboard(req.user) });
});

// ----- Devoirs, notes, documents -----
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const travaux = require('../services/etudiantTravauxService');

// Multer lit les noms en latin1 : on les remet en UTF-8
const fileInfo = (f) => (f ? { filename: f.filename, nomOriginal: Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 255) } : null);
const sendFile = (res, f) => {
  if (!fs.existsSync(f.path)) throw new ApiError(404, 'Fichier introuvable sur le serveur.');
  res.download(f.path, f.name);
};

exports.travaux = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await travaux.list(req.user, req.query) });
});
exports.travail = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await travaux.get(req.user, Number(req.params.id)) });
});
exports.rendre = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await travaux.rendre(req.user, Number(req.params.id), fileInfo(req.file), req.body.commentaire) });
});
exports.retirer = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await travaux.retirer(req.user, Number(req.params.id)) });
});
exports.travailFichier = asyncHandler(async (req, res) => sendFile(res, await travaux.travailFile(req.user, Number(req.params.id))));
exports.renduFichier = asyncHandler(async (req, res) => sendFile(res, await travaux.renduFile(req.user, Number(req.params.id))));

exports.notes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await travaux.notes(req.user) });
});

exports.documents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await travaux.docs(req.user, req.query, { page, limit }) });
});
exports.documentFichier = asyncHandler(async (req, res) => sendFile(res, await travaux.docFile(req.user, Number(req.params.id))));

// ----- Avis sur les cours -----
const avisSvc = require('../services/avisService');

exports.avis = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await avisSvc.forStudent(req.user) });
});
exports.saveAvis = asyncHandler(async (req, res) => {
  await avisSvc.save(req.user, Number(req.params.enseignementId), req.body);
  res.json({ success: true, data: await avisSvc.forStudent(req.user) });
});

exports.contenu = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await svc.contenu(req.user, { ...req.query, toutes: req.query.toutes === 'true' }, { page, limit }) });
});