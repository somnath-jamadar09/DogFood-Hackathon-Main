module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${req.user ? req.user.role : 'none'}`,
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
};
