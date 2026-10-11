// backend/src/controllers/messagerieController.js
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/messagerieService');

exports.contacts = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.contacts(req.user, req.query.q) });
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.listConversations(req.user) });
});

exports.unread = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { unread: await svc.unread(req.user.id) } });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.createConversation(req.user, req.body) });
});

exports.messages = asyncHandler(async (req, res) => {
  const after = parseInt(req.query.after, 10);
  res.json({ success: true, data: await svc.messages(req.user, Number(req.params.id), { after: Number.isInteger(after) && after > 0 ? after : null }) });
});

exports.send = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.send(req.user, Number(req.params.id), req.body.contenu) });
});

exports.remove = asyncHandler(async (req, res) => {
  await svc.removeConversation(req.user, Number(req.params.id));
  res.json({ success: true });
});