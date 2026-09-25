const Score = require('../models/Score');
const JudgeAssignment = require('../models/JudgeAssignment');

/**
 * Ensures judges can only inspect their own submitted scores.
 * Organizers and Admins have global audit access.
 */
exports.verifyScoreOwnership = async (req, res, next) => {
  try {
    const { scoreId } = req.params;
    const score = await Score.findById(scoreId);

    if (!score) {
      return res.status(404).json({
        success: false,
        error: 'Score ballot not found.',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    // Organizers and Admins have global audit access
    if (['organizer', 'admin'].includes(req.user.role)) {
      req.score = score;
      return next();
    }

    // Judges can ONLY view their own submitted score ballots
    if (req.user.role === 'judge') {
      if (score.judgeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: "Security Violation: You are strictly prohibited from inspecting other judges' scores.",
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
      }
      req.score = score;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Unauthorized access.',
      statusCode: 403,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Ensures a judge can only score submissions in their assigned queue.
 */
exports.verifyJudgeQueueAssignment = async (req, res, next) => {
  try {
    const submissionId = req.body.submissionId || req.params.submissionId;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required.',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }

    if (['organizer', 'admin'].includes(req.user.role)) {
      return next();
    }

    const assignment = await JudgeAssignment.findOne({
      judgeId: req.user._id,
      submissionId: submissionId,
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: This project is not in your assigned evaluation queue.',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
};
