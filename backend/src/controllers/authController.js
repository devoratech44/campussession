// backend/src/controllers/authController.js
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const logger = require('../utils/logger');

exports.login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body.identifiant, req.body.motDePasse);
  res.json({ success: true, data });
});

exports.verify = asyncHandler(async (req, res) => {
  const data = await authService.verifyCode(req.tempUserId, req.body.code);
  res.json({ success: true, data });
});

exports.resend = asyncHandler(async (req, res) => {
  const data = await authService.resendCode(req.tempUserId);
  res.json({ success: true, data });
});

exports.me = asyncHandler(async (req, res) => {
  const data = await authService.getSession(req.user);
  res.json({ success: true, data });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  logger.info('AUTH', `Déconnexion : ${req.user.email}`);
  res.json({ success: true });
});