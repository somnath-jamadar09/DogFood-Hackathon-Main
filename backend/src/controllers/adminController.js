const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Score = require('../models/Score');
const JudgeAssignment = require('../models/JudgeAssignment');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const { solveJudgeAssignments } = require('../services/assignmentSolver');
const { normalizeScores } = require('../services/fastApiClient');
const { generateStandingsCSV } = require('../services/csvExporter');

exports.assignJudges = async (req, res, next) => {
  try {
    const { targetPerProject = 3 } = req.body;

    const submissions = await Submission.find({ status: { $in: ['submitted', 'locked'] } });
    const judges = await User.find({ role: 'judge' });

    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No submitted projects available to assign.',
      });
    }

    if (judges.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No registered judges found in the system.',
      });
    }

    // Execute greedy assignment engine
    const { assignments, judgeLoad, totalAssigned } = solveJudgeAssignments(
      submissions,
      judges,
      targetPerProject
    );

    // Clear existing pending assignments to prevent duplicates
    await JudgeAssignment.deleteMany({ status: 'pending' });

    // Insert new assignments
    await JudgeAssignment.insertMany(assignments, { ordered: false }).catch(() => {});

    // Audit log
    const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'JUDGES_ASSIGNED',
      targetResource: 'JudgeAssignment',
      resourceId: req.user._id,
      payload: { totalAssigned, judgeLoad },
      ipHash,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${totalAssigned} judge evaluations.`,
      data: { totalAssigned, judgeLoad },
    });
  } catch (error) {
    next(error);
  }
};

exports.runNormalization = async (req, res, next) => {
  try {
    const activeEvent = await Event.findOne({ status: 'active' });
    const eventId = activeEvent?._id || 'hackathon-2026';

    const scores = await Score.find();
    if (scores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No judge score ballots found to normalize.',
      });
    }

    // Call FastAPI normalization microservice
    const result = await normalizeScores(eventId, scores, 3.0);

    // Save normalized score back to each score and submission
    if (result && result.standings) {
      for (const standing of result.standings) {
        await Score.updateMany(
          { submissionId: standing.submission_id },
          { normalizedScore: standing.normalized_score }
        );
      }
    }

    // Audit log
    const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'NORMALIZATION_EXECUTED',
      targetResource: 'Score',
      resourceId: req.user._id,
      payload: { totalProcessed: result.total_scores_processed },
      ipHash,
    });

    return res.status(200).json({
      success: true,
      message: 'Score normalization successfully computed by microservice.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ status: { $in: ['submitted', 'locked'] } })
      .populate('teamId', 'name')
      .lean();

    const scores = await Score.find().lean();

    // Group scores by submissionId
    const scoresBySub = {};
    scores.forEach((s) => {
      const subId = s.submissionId.toString();
      if (!scoresBySub[subId]) scoresBySub[subId] = [];
      scoresBySub[subId].push(s);
    });

    const leaderboard = submissions.map((sub) => {
      const subId = sub._id.toString();
      const subScores = scoresBySub[subId] || [];

      const ballotCount = subScores.length;
      const rawMean =
        ballotCount > 0
          ? subScores.reduce((sum, s) => sum + s.totalRawScore, 0) / ballotCount
          : 0;

      const normalizedScore =
        ballotCount > 0 && subScores[0].normalizedScore != null
          ? subScores[0].normalizedScore
          : null;

      return {
        id: sub._id,
        title: sub.title,
        tagline: sub.tagline,
        track: sub.track,
        teamName: sub.teamId?.name || 'Unknown Team',
        repoUrl: sub.repoUrl,
        demoUrl: sub.demoUrl,
        thumbnailPath: sub.thumbnailPath,
        publicVoteCount: sub.publicVoteCount || 0,
        ballotCount,
        rawMean: Number(rawMean.toFixed(2)),
        normalizedScore: normalizedScore != null ? Number(normalizedScore.toFixed(2)) : null,
      };
    });

    // Default sort: if normalizedScore exists sort by normalizedScore desc, else rawMean desc
    leaderboard.sort((a, b) => {
      if (a.normalizedScore != null && b.normalizedScore != null) {
        return b.normalizedScore - a.normalizedScore;
      }
      return b.rawMean - a.rawMean;
    });

    // Assign rank
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return res.status(200).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ status: { $in: ['submitted', 'locked'] } })
      .populate('teamId', 'name')
      .lean();

    const scores = await Score.find().lean();
    const scoresBySub = {};
    scores.forEach((s) => {
      const subId = s.submissionId.toString();
      if (!scoresBySub[subId]) scoresBySub[subId] = [];
      scoresBySub[subId].push(s);
    });

    const standings = submissions.map((sub) => {
      const subScores = scoresBySub[sub._id.toString()] || [];
      const ballotCount = subScores.length;
      const rawMean =
        ballotCount > 0
          ? subScores.reduce((sum, s) => sum + s.totalRawScore, 0) / ballotCount
          : 0;
      const normalizedScore =
        ballotCount > 0 ? subScores[0].normalizedScore : null;

      return {
        id: sub._id,
        title: sub.title,
        teamName: sub.teamId?.name || 'Unknown Team',
        track: sub.track,
        repoUrl: sub.repoUrl,
        ballotCount,
        rawMean,
        normalizedScore,
        publicVoteCount: sub.publicVoteCount || 0,
      };
    });

    standings.sort((a, b) => (b.normalizedScore || b.rawMean) - (a.normalizedScore || a.rawMean));
    standings.forEach((s, idx) => (s.rank = idx + 1));

    const csvContent = generateStandingsCSV(standings);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dogfood-2026-standings.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actorId', 'fullName email role')
      .sort({ timestamp: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSystemStats = async (req, res, next) => {
  try {
    const [totalUsers, totalTeams, totalSubmissions, totalJudges, totalScores, totalAssignments] =
      await Promise.all([
        User.countDocuments(),
        Team.countDocuments(),
        Submission.countDocuments({ status: { $in: ['submitted', 'locked'] } }),
        User.countDocuments({ role: 'judge' }),
        Score.countDocuments(),
        JudgeAssignment.countDocuments(),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalTeams,
        totalSubmissions,
        totalJudges,
        totalScores,
        totalAssignments,
      },
    });
  } catch (error) {
    next(error);
  }
};
