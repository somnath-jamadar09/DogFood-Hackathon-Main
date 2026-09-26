const crypto = require('crypto');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { withTransaction, TransactionHttpError } = require('../utils/transaction');

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

    const userId = (req.user._id || req.user.id).toString();

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
        await User.findByIdAndUpdate(userId, { teamId: null });
      }
    }

    const existingMembership = await Team.findOne({ members: req.user._id });
    if (existingMembership) {
      req.user.teamId = existingMembership._id;
      if (typeof req.user.save === 'function') await req.user.save();
      return res.status(400).json({
        success: false,
        error: 'You are already a member of a team. Leave your current team first.',
      });
    }

    // Execute team creation within a database transaction session
    const team = await withTransaction(async (session) => {
      if (session) {
        // Re-verify user within transaction to prevent concurrent team creation/joining
        const userCheck = await User.findById(userId, null, { session });
        if (userCheck && userCheck.teamId) {
          const teamCheck = await Team.findById(userCheck.teamId, null, { session });
          if (teamCheck) {
            throw new TransactionHttpError(400, 'You are already a member of a team. Leave your current team first.');
          }
        }

        const memberCheck = await Team.findOne({ members: req.user._id }, null, { session });
        if (memberCheck) {
          throw new TransactionHttpError(400, 'You are already a member of a team. Leave your current team first.');
        }
      }

      // DB Collision retry loop for unique 6-character uppercase alphanumeric join code
      const MAX_RETRIES = 10;
      let newTeam = null;
      let attempts = 0;

      while (attempts < MAX_RETRIES) {
        attempts++;
        const joinCode = generateJoinCode();

        // Check DB for join code collision before insert
        const codeExists = session
          ? await Team.findOne({ joinCode }, null, { session })
          : await Team.findOne({ joinCode });
        if (codeExists) {
          continue;
        }

        try {
          if (session) {
            const created = await Team.create(
              [
                {
                  name: name.trim(),
                  track: track.trim(),
                  captain: req.user._id,
                  members: [req.user._id],
                  joinCode,
                },
              ],
              { session }
            );
            newTeam = Array.isArray(created) ? created[0] : created;
          } else {
            newTeam = await Team.create({
              name: name.trim(),
              track: track.trim(),
              captain: req.user._id,
              members: [req.user._id],
              joinCode,
            });
          }
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
            throw new TransactionHttpError(400, 'A team with this name already exists. Please choose another name.');
          }

          throw err;
        }
      }

      if (!newTeam) {
        throw new TransactionHttpError(500, 'Failed to generate a unique team join code after multiple attempts. Please try again.');
      }

      if (session) {
        // Concurrency lock: Ensure user does not already have a teamId
        const updatedUser = await User.findOneAndUpdate(
          { _id: userId, teamId: null },
          { teamId: newTeam._id },
          { session, new: true }
        );

        if (!updatedUser) {
          throw new TransactionHttpError(400, 'You are already a member of a team. Leave your current team first.');
        }
      }

      if (session) {
        await User.findByIdAndUpdate(userId, { teamId: newTeam._id }, { session });
      } else {
        await User.findByIdAndUpdate(userId, { teamId: newTeam._id });
      }

      return newTeam;
    });

    req.user.teamId = team._id;
    if (typeof req.user.save === 'function') {
      await req.user.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Team successfully created.',
      data: { team },
    });
  } catch (error) {
    if (error instanceof TransactionHttpError || error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A team with this name already exists. Please choose another name.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = error.errors ? Object.values(error.errors).map((e) => e.message) : [error.message];
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

    const formattedCode = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(formattedCode)) {
      return res.status(400).json({
        success: false,
        error: 'Join code must be 6 alphanumeric characters.',
      });
    }

    const userId = (req.user._id || req.user.id).toString();

    // Verify user is not already in a team
    if (req.user.teamId) {
      const existingTeam = await Team.findById(req.user.teamId);
      if (existingTeam) {
        return res.status(400).json({
          success: false,
          error: 'You are already in a team. You cannot join another.',
        });
      } else {
        req.user.teamId = null;
        await User.findByIdAndUpdate(userId, { teamId: null });
      }
    }

    const existingMembership = await Team.findOne({ members: userId });
    if (existingMembership) {
      req.user.teamId = existingMembership._id;
      if (typeof req.user.save === 'function') await req.user.save();
      return res.status(400).json({
        success: false,
        error: 'You are already in a team. You cannot join another.',
      });
    }

    // Execute join inside a database transaction to prevent concurrent joins to multiple active teams
    const team = await withTransaction(async (session) => {
      if (session) {
        const userDoc = await User.findById(userId, null, { session });
        if (userDoc && userDoc.teamId) {
          const teamCheck = await Team.findById(userDoc.teamId, null, { session });
          if (teamCheck) {
            throw new TransactionHttpError(400, 'You are already in a team. You cannot join another.');
          } else {
            await User.findByIdAndUpdate(userId, { teamId: null }, { session });
          }
        }

        const membershipCheck = await Team.findOne({ members: userId }, null, { session });
        if (membershipCheck) {
          req.user.teamId = membershipCheck._id;
          if (typeof req.user.save === 'function') await req.user.save();
          throw new TransactionHttpError(400, 'You are already in a team. You cannot join another.');
        }
      }

      // Find target team
      const targetTeam = session
        ? await Team.findOne({ joinCode: formattedCode }, null, { session })
        : await Team.findOne({ joinCode: formattedCode });
      if (!targetTeam) {
        throw new TransactionHttpError(404, 'Team not found with the provided join code.');
      }

      if (targetTeam.members && targetTeam.members.length >= 4) {
        throw new TransactionHttpError(400, 'This team has already reached the maximum limit of 4 members.');
      }

      if (targetTeam.members && targetTeam.members.some((m) => (m._id || m).toString() === userId)) {
        throw new TransactionHttpError(400, 'You are already a member of this team.');
      }

      if (session) {
        // Concurrency prevention: Atomically lock and update User.teamId with condition { teamId: null }
        // This prevents a user from joining multiple active teams concurrently via race conditions
        const updatedUser = await User.findOneAndUpdate(
          { _id: userId, teamId: null },
          { teamId: targetTeam._id },
          { session, new: true }
        );

        if (!updatedUser) {
          throw new TransactionHttpError(400, 'You are already in a team. You cannot join another.');
        }
      }

      // Update team members list
      targetTeam.members.push(req.user._id || req.user.id);
      if (session) {
        await targetTeam.save({ session });
        await User.findByIdAndUpdate(userId, { teamId: targetTeam._id }, { session });
      } else {
        await targetTeam.save();
        await User.findByIdAndUpdate(userId, { teamId: targetTeam._id });
      }

      req.user.teamId = targetTeam._id;
      if (typeof req.user.save === 'function') {
        await req.user.save();
      }

      return targetTeam;
    });

    if (typeof team.populate === 'function') {
      await team.populate('members', 'name fullName email role');
      await team.populate('captain', 'name fullName email role');
    }

    const teamObj = typeof team.toObject === 'function' ? team.toObject({ virtuals: true }) : { ...team };
    if (team.captain) {
      teamObj.captainId = (team.captain._id || team.captain).toString();
    }

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${team.name}.`,
      data: { team: teamObj },
    });
  } catch (error) {
    if (error instanceof TransactionHttpError || error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
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
    const userId = (req.user._id || req.user.id).toString();
    let team = null;

    if (req.user.teamId) {
      team = await Team.findById(req.user.teamId);
    }

    // Fallback: check if user is a member of any team
    if (!team) {
      team = await Team.findOne({ members: userId });
      if (team) {
        req.user.teamId = team._id;
        if (typeof req.user.save === 'function') await req.user.save();
        await User.findByIdAndUpdate(userId, { teamId: team._id });
      }
    }

    if (!team) {
      return res.status(200).json({
        success: true,
        data: { team: null, submission: null, submissionStatus: null },
      });
    }

    if (typeof team.populate === 'function') {
      await team.populate('members', 'name fullName email role');
      await team.populate('captain', 'name fullName email role');
    }

    const teamObj = typeof team.toObject === 'function' ? team.toObject({ virtuals: true }) : { ...team };
    if (team.captain) {
      teamObj.captainId = (team.captain._id || team.captain).toString();
    }

    const submission = await Submission.findOne({ teamId: team._id });
    const submissionStatus = submission ? submission.status : null;

    return res.status(200).json({
      success: true,
      data: {
        team: teamObj,
        submission,
        submissionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req.user._id || req.user.id).toString();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'A valid user ID is required.',
      });
    }

    // Execute member removal within a database transaction
    const removalResult = await withTransaction(async (session) => {
      // Find the team containing the target member inside transaction
      const team = session
        ? await Team.findOne({ members: userId }, null, { session })
        : await Team.findOne({ members: userId });
      if (!team) {
        throw new TransactionHttpError(404, 'Target member is not part of any team.');
      }

      const captainId = (team.captain._id || team.captain).toString();
      const isCaptain = captainId === currentUserId;
      const isSelf = currentUserId === userId.toString();
      const isAdminOrOrganizer = ['admin', 'organizer'].includes(req.user.role);

      if (!isCaptain && !isSelf && !isAdminOrOrganizer) {
        throw new TransactionHttpError(
          403,
          'Forbidden: Only the team captain can remove members, or a member can leave voluntarily.'
        );
      }

      // Remove user from team members
      team.members = team.members.filter((m) => (m._id || m).toString() !== userId.toString());

      // Update target user's teamId atomically inside transaction
      if (session) {
        await User.findByIdAndUpdate(userId, { teamId: null }, { session });
      } else {
        await User.findByIdAndUpdate(userId, { teamId: null });
      }

      // Check if team is now empty
      if (team.members.length === 0) {
        if (session) {
          await Team.findByIdAndDelete(team._id, { session });
          await Submission.deleteMany({ teamId: team._id, status: 'draft' }, { session });
        } else {
          await Team.findByIdAndDelete(team._id);
          await Submission.deleteMany({ teamId: team._id, status: 'draft' });
        }

        return {
          team: null,
          isSelf,
          captainId,
          disbanded: true,
        };
      }

      // If captain left, transfer captaincy to first remaining member
      if (captainId === userId.toString()) {
        team.captain = team.members[0];
      }

      if (session) {
        await team.save({ session });
      } else {
        await team.save();
      }

      return {
        team,
        isSelf,
        captainId,
        disbanded: false,
      };
    });

    if (removalResult.isSelf) {
      req.user.teamId = null;
      if (typeof req.user.save === 'function') {
        await req.user.save();
      }
    }

    if (removalResult.disbanded) {
      return res.status(200).json({
        success: true,
        message: removalResult.isSelf
          ? 'You have left the team. The team has been disbanded as no members remain.'
          : 'Member removed and team disbanded as no members remain.',
        data: { team: null },
      });
    }

    const { team, isSelf, captainId } = removalResult;

    if (typeof team.populate === 'function') {
      await team.populate('members', 'name fullName email role');
      await team.populate('captain', 'name fullName email role');
    }

    const teamObj = typeof team.toObject === 'function' ? team.toObject({ virtuals: true }) : { ...team };
    if (team.captain) {
      teamObj.captainId = (team.captain._id || team.captain).toString();
    }

    return res.status(200).json({
      success: true,
      message: isSelf
        ? (captainId === userId.toString()
            ? 'You have left the team. Captaincy has been transferred.'
            : 'You have voluntarily left the team.')
        : 'Member successfully removed from the team.',
      data: { team: teamObj },
    });
  } catch (error) {
    if (error instanceof TransactionHttpError || error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};
