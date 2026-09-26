const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Team = require('../models/Team');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

/**
 * Helper to resolve team from req.user
 */
const resolveUserTeam = async (reqUser) => {
  if (!reqUser) return null;
  const userId = (reqUser._id || reqUser.id)?.toString();
  const teamId = reqUser.teamId?._id || reqUser.teamId || reqUser.team;
  let team = null;

  if (teamId) {
    team = await Team.findById(teamId);
  }

  if (!team && userId) {
    team = await Team.findOne({
      $or: [{ members: userId }, { captain: userId }],
    });
    if (team) {
      reqUser.teamId = team._id;
      if (typeof reqUser.save === 'function') {
        try {
          await reqUser.save();
        } catch (_) {}
      }
    }
  }

  return team;
};

exports.upsertSubmission = async (req, res, next) => {
  try {
    const team = await resolveUserTeam(req.user);
    if (!team) {
      return res.status(400).json({
        success: false,
        error: 'You must form or join a team before creating a submission.',
      });
    }

    const {
      title,
      tagline,
      track,
      repoUrl,
      githubUrl,
      demoUrl,
      demoVideoUrl,
      descriptionMarkdown,
      description,
      thumbnailPath,
      thumbnailUrl,
    } = req.body;

    const gitUrl = githubUrl !== undefined ? githubUrl : repoUrl;
    const videoUrl = demoVideoUrl !== undefined ? demoVideoUrl : demoUrl;
    const desc = description !== undefined ? description : descriptionMarkdown;
    const thumb = thumbnailUrl !== undefined ? thumbnailUrl : thumbnailPath;

    let submission = await Submission.findOne({ team: team._id });

    if (submission && (submission.status === 'submitted' || submission.status === 'locked')) {
      return res.status(423).json({
        success: false,
        error: 'This submission is locked and can no longer be edited.',
      });
    }

    let isNew = false;
    if (!submission) {
      isNew = true;
      submission = await Submission.create({
        team: team._id,
        title: title || `${team.name}'s Project`,
        tagline: tagline || 'Work in progress',
        track: track || team.track,
        githubUrl: gitUrl || 'https://github.com',
        demoVideoUrl: videoUrl || '',
        description: desc || '# Project Overview\nDescribe your project here.',
        thumbnailUrl: thumb || '/uploads/default-thumbnail.webp',
        status: 'draft',
      });
    } else {
      if (title !== undefined) submission.title = title;
      if (tagline !== undefined) submission.tagline = tagline;
      if (track !== undefined) submission.track = track;
      if (gitUrl !== undefined) submission.githubUrl = gitUrl;
      if (videoUrl !== undefined) submission.demoVideoUrl = videoUrl;
      if (desc !== undefined) submission.description = desc;
      if (thumb !== undefined) submission.thumbnailUrl = thumb;
      await submission.save();
    }

    return res.status(200).json({
      success: true,
      message: isNew ? 'Submission draft created successfully.' : 'Submission successfully saved.',
      data: { submission },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

exports.getMySubmission = async (req, res, next) => {
  try {
    const team = await resolveUserTeam(req.user);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'User does not belong to a team.',
      });
    }

    const submission = await Submission.findOne({ team: team._id })
      .populate('team', 'name members track')
      .populate('teamId', 'name members track');

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'No submission found for this team.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file.',
      });
    }

    const filePath = `/uploads/thumbnails/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: 'Thumbnail uploaded successfully.',
      data: { filePath },
    });
  } catch (error) {
    next(error);
  }
};

exports.finalizeSubmission = async (req, res, next) => {
  try {
    const team = await resolveUserTeam(req.user);
    if (!team) {
      return res.status(400).json({ success: false, error: 'User does not belong to a team.' });
    }

    const submission = await Submission.findOne({ team: team._id });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'No submission found to finalize.' });
    }

    if (
      !submission.title ||
      (!submission.githubUrl && !submission.repoUrl) ||
      (!submission.description && !submission.descriptionMarkdown)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Title, repository URL, and project markdown description are required to finalize.',
      });
    }

    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    team.hasSubmitted = true;
    await team.save();

    // Log action to AuditLog
    const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex');
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SUBMISSION_LOCKED',
      targetResource: 'Submission',
      resourceId: submission._id,
      payload: { submissionId: submission._id, title: submission.title },
      ipHash,
    });

    return res.status(200).json({
      success: true,
      message: 'Submission successfully submitted and locked for judging evaluation.',
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};

exports.getGallery = async (req, res, next) => {
  try {
    const { track, search } = req.query;
    const filter = { status: { $in: ['submitted', 'locked'] } };

    if (track && track !== 'All') {
      filter.track = track;
    }

    if (search && search.trim() !== '') {
      filter.$text = { $search: search.trim() };
    }

    const submissions = await Submission.find(filter)
      .populate('team', 'name members')
      .populate('teamId', 'name members')
      .sort({ publicVoteCount: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: { submissions, total: submissions.length },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: 'Project submission not found.' });
    }

    const submission = await Submission.findById(id)
      .populate('team', 'name members')
      .populate('teamId', 'name members');

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Project submission not found.' });
    }

    return res.status(200).json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};
