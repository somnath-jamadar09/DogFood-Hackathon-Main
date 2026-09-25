const Team = require('../models/Team');
const User = require('../models/User');
const Submission = require('../models/Submission');

// Helper to generate random 6-character uppercase alphanumeric join code
const generateJoinCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

exports.createTeam = async (req, res, next) => {
  try {
    const { name, track } = req.body;

    if (!name || !track) {
      return res.status(400).json({
        success: false,
        error: 'Team name and competition track are required.',
      });
    }

    if (req.user.teamId) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of a team. Leave your current team first.',
      });
    }

    let joinCode = generateJoinCode();
    let collision = await Team.findOne({ joinCode });
    while (collision) {
      joinCode = generateJoinCode();
      collision = await Team.findOne({ joinCode });
    }

    const team = await Team.create({
      name: name.trim(),
      track,
      captain: req.user._id,
      members: [req.user._id],
      joinCode,
    });

    req.user.teamId = team._id;
    await req.user.save();

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
    next(error);
  }
};

exports.joinTeam = async (req, res, next) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({
        success: false,
        error: 'Join code is required.',
      });
    }

    if (req.user.teamId) {
      return res.status(400).json({
        success: false,
        error: 'You are already in a team. You cannot join another.',
      });
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

    team.members.push(req.user._id);
    await team.save();

    req.user.teamId = team._id;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${team.name}.`,
      data: { team },
    });
  } catch (error) {
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

    const team = await Team.findById(req.user.teamId).populate('members', 'fullName email role');
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
