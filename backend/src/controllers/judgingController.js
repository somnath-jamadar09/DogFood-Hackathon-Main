const Score = require('../models/Score');
const JudgeAssignment = require('../models/JudgeAssignment');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const Rubric = require('../models/Rubric');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

exports.getAssignedQueue = async (req, res, next) => {
  try {
    const assignments = await JudgeAssignment.find({ judgeId: req.user._id })
      .populate({
        path: 'submissionId',
        populate: { path: 'teamId', select: 'name' },
      })
      .sort({ status: 1, createdAt: 1 });

    // Attach existing scores if any
    const submissionIds = assignments.map((a) => a.submissionId?._id).filter(Boolean);
    const existingScores = await Score.find({
      judgeId: req.user._id,
      submissionId: { $in: submissionIds },
    });

    const scoreMap = {};
    existingScores.forEach((s) => {
      scoreMap[s.submissionId.toString()] = s;
    });

    const queue = assignments.map((assignment) => {
      const sub = assignment.submissionId;
      const score = sub ? scoreMap[sub._id.toString()] || null : null;
      return {
        assignmentId: assignment._id,
        track: assignment.track,
        status: assignment.status,
        submission: sub,
        score,
      };
    });

    return res.status(200).json({
      success: true,
      data: { queue },
    });
  } catch (error) {
    next(error);
  }
};

exports.submitScore = async (req, res, next) => {
  try {
    const { submissionId, criteriaScores, privateNotes } = req.body;

    if (!submissionId || !criteriaScores || !Array.isArray(criteriaScores) || criteriaScores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'submissionId and criteriaScores array are required.',
      });
    }

    // Calculate total weighted raw score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const item of criteriaScores) {
      if (item.rawScore < 1.0 || item.rawScore > 10.0) {
        return res.status(400).json({
          success: false,
          error: `Raw score for ${item.criteriaName} must be between 1.0 and 10.0.`,
        });
      }
      totalWeightedScore += item.rawScore * item.weight;
      totalWeight += item.weight;
    }

    const totalRawScore = Number((totalWeightedScore / totalWeight).toFixed(3));

    // Upsert score
    const score = await Score.findOneAndUpdate(
      { judgeId: req.user._id, submissionId: submissionId },
      {
        judgeId: req.user._id,
        submissionId: submissionId,
        criteriaScores,
        totalRawScore,
        privateNotes: privateNotes || '',
        isFinal: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update assignment status
    await JudgeAssignment.findOneAndUpdate(
      { judgeId: req.user._id, submissionId: submissionId },
      { status: 'completed' }
    );

    // Log to audit log
    const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SCORE_SUBMITTED',
      targetResource: 'Score',
      resourceId: score._id,
      payload: { submissionId, totalRawScore },
      ipHash,
    });

    return res.status(201).json({
      success: true,
      message: 'Evaluation ballot successfully recorded.',
      data: { score },
    });
  } catch (error) {
    next(error);
  }
};

exports.getScoreById = async (req, res, next) => {
  try {
    // req.score is attached by isolationGuard.verifyScoreOwnership
    return res.status(200).json({
      success: true,
      data: { score: req.score },
    });
  } catch (error) {
    next(error);
  }
};

exports.getEventRubric = async (req, res, next) => {
  try {
    let event = await Event.findOne({ status: 'active' });
    if (!event) {
      event = await Event.findOne().sort({ createdAt: -1 });
    }

    const defaultRubric = [
      { name: 'Technical Execution', weight: 0.3, scaleMin: 1, scaleMax: 10 },
      { name: 'Innovation & Originality', weight: 0.25, scaleMin: 1, scaleMax: 10 },
      { name: 'Practical Impact', weight: 0.25, scaleMin: 1, scaleMax: 10 },
      { name: 'Polish & Presentation', weight: 0.2, scaleMin: 1, scaleMax: 10 },
    ];

    let rubric = event?.rubric?.length ? event.rubric : defaultRubric;

    if (event) {
      const rubricDoc = await Rubric.findOne({ eventId: event._id });
      if (rubricDoc && rubricDoc.criteria && rubricDoc.criteria.length > 0) {
        rubric = rubricDoc.criteria.map((c) => ({
          name: c.label || c.key,
          key: c.key,
          weight: c.weight,
          scaleMin: c.minScore !== undefined ? c.minScore : 1,
          scaleMax: c.maxScore !== undefined ? c.maxScore : 10,
        }));
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        rubric,
        tracks: event?.tracks || ['AI/ML', 'Web3 & Blockchain', 'FinTech', 'HealthTech'],
      },
    });
  } catch (error) {
    next(error);
  }
};
