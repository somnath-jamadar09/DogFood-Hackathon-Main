const Submission = require('../models/Submission');
const Team = require('../models/Team');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

exports.upsertSubmission = async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(400).json({
        success: false,
        error: 'You must form or join a team before creating a submission.',
      });
    }

    const team = await Team.findById(req.user.teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const {
      title,
      tagline,
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

    if (!submission) {
      submission = await Submission.create({
        team: team._id,
        title: title || `${team.name}'s Project`,
        tagline: tagline || 'Work in progress',
        track: team.track,
        githubUrl: gitUrl || 'https://github.com',
        demoVideoUrl: videoUrl || '',
        description: desc || '# Project Overview\nDescribe your project here.',
        thumbnailUrl: thumb || '/uploads/default-thumbnail.webp',
        status: 'draft',
      });
    } else {
      if (title !== undefined) submission.title = title;
      if (tagline !== undefined) submission.tagline = tagline;
      if (gitUrl !== undefined) submission.githubUrl = gitUrl;
      if (videoUrl !== undefined) submission.demoVideoUrl = videoUrl;
      if (desc !== undefined) submission.description = desc;
      if (thumb !== undefined) submission.thumbnailUrl = thumb;
      await submission.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Submission successfully saved.',
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

    const filePath = `/uploads/${req.file.filename}`;
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
    if (!req.user.teamId) {
      return res.status(400).json({ success: false, error: 'User does not belong to a team.' });
    }

    const team = await Team.findById(req.user.teamId);
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
