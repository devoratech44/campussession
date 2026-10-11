// backend/src/middlewares/role.js
const ApiError = require('../utils/ApiError');

// Usage : router.use(auth, authorize('admin'))
module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'Accès refusé.'));
  next();
};