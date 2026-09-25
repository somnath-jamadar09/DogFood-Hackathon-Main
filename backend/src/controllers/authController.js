const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

exports.register = async (req, res, next) => {
  try {
    const { email, password, fullName, name, role, judgeTracks, trackPreferences, conflictsOfInterest } = req.body;
    const resolvedName = name || fullName;

    if (!email || !password || !resolvedName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const validRoles = ['participant', 'judge', 'organizer', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'participant';
    const tracks = trackPreferences || judgeTracks || [];

    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: resolvedName.trim(),
      role: assignedRole,
      trackPreferences: assignedRole === 'judge' ? tracks : [],
      conflictsOfInterest: conflictsOfInterest || [],
    });

    const token = generateAccessToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000,
    });

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          fullName: user.name,
          role: user.role,
          trackPreferences: user.trackPreferences,
          judgeTracks: user.trackPreferences,
          conflictsOfInterest: user.conflictsOfInterest,
          teamId: user.teamId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    const token = generateAccessToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000,
    });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          fullName: user.name,
          role: user.role,
          trackPreferences: user.trackPreferences,
          judgeTracks: user.trackPreferences,
          conflictsOfInterest: user.conflictsOfInterest,
          teamId: user.teamId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('teamId');
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          fullName: user.name,
          role: user.role,
          trackPreferences: user.trackPreferences,
          judgeTracks: user.trackPreferences,
          conflictsOfInterest: user.conflictsOfInterest,
          team: user.teamId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('jwt');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
