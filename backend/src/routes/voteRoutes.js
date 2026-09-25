const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { voteRateLimiter } = require('../middleware/rateLimiter');

// Public voting with sliding window rate limiting (5 req/min)
router.post('/', voteRateLimiter, voteController.castVote);

module.exports = router;
