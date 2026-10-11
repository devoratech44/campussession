// backend/src/middlewares/validate.js
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const list = errors.array();
  next(new ApiError(400, list[0].msg, list.map((e) => ({ champ: e.path, message: e.msg }))));
};