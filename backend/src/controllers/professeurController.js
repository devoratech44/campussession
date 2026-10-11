// backend/src/controllers/professeurController.js
const cfg = require('../config/appConfig');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/professeurService');
const evaluations = require('../services/evaluationService');
const documents = require('../services/documentService');
const avis = require('../services/avisService');

const paging = (q) => ({
  page: Math.max(1, parseInt(q.page, 10) || 1),
  limit: Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(q.limit, 10) || cfg.pagination.defaultLimit)),
});

exports.dashboard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.dashboard(req.user) });
});
exports.cours = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.cours(req.user) });
});
exports.options = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.options(req.user) });
});

// Le filtre « professeur » est imposé : il ne voit que ses évaluations et ses documents
exports.evaluations = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await evaluations.list({ ...req.query, professeurId: String(req.user.id) }, paging(req.query)) });
});
exports.documents = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await documents.list({ ...req.query, uploaderId: String(req.user.id) }, paging(req.query)) });
});

exports.avis = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await avis.forProf(req.user) });
});

exports.moyennes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await evaluations.moyennes({ ...req.query, professeurId: String(req.user.id) }) });
});

