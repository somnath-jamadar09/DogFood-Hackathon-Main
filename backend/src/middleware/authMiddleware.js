const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token required.',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'raptors-offline-cryptographic-master-key-2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User record no longer exists.',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token signature invalid or expired.',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }
};
