// backend/src/controllers/surveillanceController.js
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/surveillanceService');

const ok = (res, data) => res.json({ success: true, data });
const id = (req) => Number(req.params.id);

exports.list = asyncHandler(async (req, res) => ok(res, await svc.list()));
exports.create = asyncHandler(async (req, res) => ok(res, await svc.create(req.body, req.user)));
exports.activer = asyncHandler(async (req, res) => { await svc.setStatus(id(req), 'active', req.user); ok(res, true); });
exports.terminerAdmin = asyncHandler(async (req, res) => { await svc.setStatus(id(req), 'terminee', req.user); ok(res, true); });
exports.detail = asyncHandler(async (req, res) => ok(res, await svc.detail(id(req))));
exports.exclure = asyncHandler(async (req, res) => { await svc.exclure(id(req), Number(req.params.eid), req.user); ok(res, true); });

exports.mine = asyncHandler(async (req, res) => ok(res, await svc.mine(req.user)));
exports.entrer = asyncHandler(async (req, res) => ok(res, await svc.enter(req.user, id(req))));
exports.event = asyncHandler(async (req, res) => ok(res, await svc.event(req.user, id(req), req.body)));
exports.terminer = asyncHandler(async (req, res) => ok(res, await svc.terminer(req.user, id(req))));