const crypto = require('crypto');
const Team = require('../models/Team');
const User = require('../models/User');
const Submission = require('../models/Submission');

// Helper to generate random 6-character uppercase alphanumeric join code (e.g. RAPTOR, K9D8W2)
const generateJoinCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(bytes[i] % chars.length);
  }
  return code;
};

exports.generateJoinCode = generateJoinCode;

exports.createTeam = async (req, res, next) => {
  try {
    const { name, track } = req.body;

    if (!name || !name.trim() || !track || !track.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Team name and competition track are required.',
      });
    }

    if (name.trim().length < 3 || name.trim().length > 40) {
      return res.status(400).json({
        success: false,
        error: 'Team name must be between 3 and 40 characters.',
      });
    }

    if (req.user.teamId) {
      const existingTeam = await Team.findById(req.user.teamId);
      if (existingTeam) {
        return res.status(400).json({
          success: false,
          error: 'You are already a member of a team. Leave your current team first.',
        });
      } else {
        // Clean up stale reference
        req.user.teamId = null;
        await User.findByIdAndUpdate(req.user._id, { teamId: null });
      }
    }

    const existingMembership = await Team.findOne({ members: req.user._id });
    if (existingMembership) {
      req.user.teamId = existingMembership._id;
      await req.user.save();
      return res.status(400).json({
        success: false,
        error: 'You are already a member of a team. Leave your current team first.',
      });
    }

    // DB Collision retry loop for unique 6-character uppercase alphanumeric join code
    const MAX_RETRIES = 10;
    let team = null;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      attempts++;
      const joinCode = generateJoinCode();

      // Check DB for join code collision before insert
      const codeExists = await Team.findOne({ joinCode });
      if (codeExists) {
        continue;
      }

      try {
        team = await Team.create({
          name: name.trim(),
          track: track.trim(),
          captain: req.user._id,
          members: [req.user._id],
          joinCode,
        });
        break;
      } catch (err) {
        // If duplicate key error on joinCode (race condition / DB collision), retry
        const isJoinCodeCollision =
          err.code === 11000 &&
          (err.keyPattern?.joinCode ||
            (err.keyValue && 'joinCode' in err.keyValue) ||
            (err.message && err.message.includes('joinCode')));

        if (isJoinCodeCollision && attempts < MAX_RETRIES) {
          continue;
        }

        // Duplicate team name collision
        const isNameCollision =
          err.code === 11000 &&
          (err.keyPattern?.name ||
            (err.keyValue && 'name' in err.keyValue) ||
            (err.message && err.message.includes('name')));

        if (isNameCollision) {
          return res.status(400).json({
            success: false,
            error: 'A team with this name already exists. Please choose another name.',
          });
        }

        throw err;
      }
    }

    if (!team) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate a unique team join code after multiple attempts. Please try again.',
      });
    }

    req.user.teamId = team._id;
    await req.user.save();
    await User.findByIdAndUpdate(req.user._id, { teamId: team._id });

    return res.status(201).json({
      success: true,
      message: 'Team successfully created.',
      data: { team },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A team with this name already exists. Please choose another name.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }
    next(error);
  }
};

exports.joinTeam = async (req, res, next) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode || !joinCode.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Join code is required.',
      });
    }

    if (req.user.teamId) {
      const existingTeam = await Team.findById(req.user.teamId);
      if (existingTeam) {
        return res.status(400).json({
          success: false,
          error: 'You are already in a team. You cannot join another.',
        });
      } else {
        req.user.teamId = null;
        await User.findByIdAndUpdate(req.user._id, { teamId: null });
      }
    }

    const team = await Team.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found with the provided join code.',
      });
    }

    if (team.members.length >= 4) {
      return res.status(400).json({
        success: false,
        error: 'This team has already reached the maximum limit of 4 members.',
      });
    }

    if (team.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this team.',
      });
    }

    team.members.push(req.user._id);
    await team.save();

    req.user.teamId = team._id;
    await req.user.save();
    await User.findByIdAndUpdate(req.user._id, { teamId: team._id });

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${team.name}.`,
      data: { team },
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

exports.getMyTeam = async (req, res, next) => {
  try {
    if (!req.user.teamId) {
      return res.status(200).json({
        success: true,
        data: { team: null, submission: null },
      });
    }

    const team = await Team.findById(req.user.teamId).populate('members', 'name fullName email role');
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found.',
      });
    }

    const submission = await Submission.findOne({ teamId: team._id });

    return res.status(200).json({
      success: true,
      data: {
        team,
        submission,
      },
    });
  } catch (error) {
    next(error);
  }
};
