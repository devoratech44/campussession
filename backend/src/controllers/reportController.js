// backend/src/controllers/reportController.js
const cfg = require('../config/appConfig');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/reportService');

exports.apercu = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.apercu(req.query) });
});

exports.presences = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(req.query.limit, 10) || cfg.pagination.defaultLimit));
  res.json({ success: true, data: await svc.presences(req.query, { page, limit, tout: req.query.tout === 'true' }) });
});

exports.professeurs = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.professeurs(req.query) });
});