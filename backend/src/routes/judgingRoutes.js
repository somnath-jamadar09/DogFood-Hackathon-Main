const express = require('express');
const router = express.Router();
const judgingController = require('../controllers/judgingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { verifyScoreOwnership, verifyJudgeQueueAssignment } = require('../middleware/isolationGuard');

router.use(authMiddleware);

// Get event rubric & tracks
router.get('/rubric', judgingController.getEventRubric);

// Judge assigned queue
router.get(
  '/assigned',
  roleGuard('judge', 'organizer', 'admin'),
  judgingController.getAssignedQueue
);

// Submit score (enforced by queue assignment verification)
router.post(
  '/scores',
  roleGuard('judge', 'organizer', 'admin'),
  verifyJudgeQueueAssignment,
  judgingController.submitScore
);

// Inspect score (enforced by score ownership isolation guard)
router.get(
  '/scores/:scoreId',
  roleGuard('judge', 'organizer', 'admin'),
  verifyScoreOwnership,
  judgingController.getScoreById
);

module.exports = router;
