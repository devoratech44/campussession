// backend/src/controllers/notificationController.js
const cfg = require('../config/appConfig');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/notificationService');

const paging = (q, def) => ({
  page: Math.max(1, parseInt(q.page, 10) || 1),
  limit: Math.min(cfg.pagination.maxLimit, Math.max(1, parseInt(q.limit, 10) || def)),
});

// ----- Administrateur -----
exports.list = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query, cfg.pagination.defaultLimit);
  res.json({ success: true, data: await svc.listAdmin({ type: req.query.type, page, limit }) });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.detail(Number(req.params.id)) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const result = await svc.send({
    titre: b.titre, message: b.message, type: b.type || 'information',
    cibleType: b.cibleType, cibleId: b.cibleType === 'tous' ? null : Number(b.cibleId),
    role: b.role, createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: result });
});

exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(Number(req.params.id));
  res.json({ success: true });
});

// ----- Tous les rôles (cloche) -----
exports.mine = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query, cfg.notifications.bellLimit);
  res.json({ success: true, data: await svc.mine(req.user.id, { page, limit, nonLues: req.query.nonLues === 'true' }) });
});

exports.read = asyncHandler(async (req, res) => {
  await svc.markRead(req.user.id, Number(req.params.id));
  res.json({ success: true });
});

exports.readAll = asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user.id);
  res.json({ success: true });
});