// backend/src/controllers/badgeController.js
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/badgeService');

exports.get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await svc.get(req.user) });
});