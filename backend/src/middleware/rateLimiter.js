const rateLimit = require('express-rate-limit');

// Rate limiter for public voting: 5 requests per 1 minute window per IP
const voteRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded: Maximum 5 votes per minute. Please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
});

// General API rate limiter: 100 requests per 1 minute
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after a minute.',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
});

module.exports = {
  voteRateLimiter,
  apiRateLimiter,
};
