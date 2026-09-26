const mongoose = require('mongoose');
const teamController = require('../src/controllers/teamController');
const Team = require('../src/models/Team');
const User = require('../src/models/User');
const Submission = require('../src/models/Submission');

describe('Team Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      user: {
        _id: new mongoose.Types.ObjectId(),
        teamId: null,
        save: jest.fn().mockResolvedValue(true),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('generateJoinCode', () => {
    it('should generate a 6-character uppercase alphanumeric code', () => {
      for (let i = 0; i < 20; i++) {
        const code = teamController.generateJoinCode();
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    it('character pool allows both letters and digits (e.g. RAPTOR, K9D8W2)', () => {
      const samples = [];
      for (let i = 0; i < 100; i++) {
        samples.push(teamController.generateJoinCode());
      }
      const combined = samples.join('');
      // Check that both letters and numbers are generated across multiple samples
      expect(/[A-Z]/.test(combined)).toBe(true);
      expect(/[0-9]/.test(combined)).toBe(true);
    });
  });

  describe('createTeam', () => {
    it('should reject request when team name or track is missing', async () => {
      req.body = { name: '', track: 'AI/ML' };
      await teamController.createTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/name and competition track are required/i),
        })
      );

      jest.clearAllMocks();
      req.body = { name: 'Alpha Team', track: '' };
      await teamController.createTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject request when user is already in a team', async () => {
      req.body = { name: 'Beta Team', track: 'AI/ML' };
      req.user.teamId = new mongoose.Types.ObjectId();

      jest.spyOn(Team, 'findById').mockResolvedValue({ _id: req.user.teamId, name: 'Existing Team' });

      await teamController.createTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/already a member of a team/i),
        })
      );
    });

    it('should create a team, assign creator as captain and member, and update user teamId', async () => {
      req.body = { name: 'Raptor Squad', track: 'AI/ML' };

      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(req.user);

      const createdTeamMock = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Raptor Squad',
        track: 'AI/ML',
        captain: req.user._id,
        members: [req.user._id],
        joinCode: 'RAPTOR',
      };
      jest.spyOn(Team, 'create').mockResolvedValue(createdTeamMock);

      await teamController.createTeam(req, res, next);

      expect(Team.create).toHaveBeenCalledWith({
        name: 'Raptor Squad',
        track: 'AI/ML',
        captain: req.user._id,
        members: [req.user._id],
        joinCode: expect.stringMatching(/^[A-Z0-9]{6}$/),
      });
      expect(req.user.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Team successfully created.',
          data: { team: createdTeamMock },
        })
      );
    });

    it('should retry when joinCode collision is detected via DB findOne pre-check', async () => {
      req.body = { name: 'Collision Team', track: 'Cybersecurity' };

      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(req.user);

      let findOneCount = 0;
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) {
          findOneCount++;
          // First check collides, second check passes
          if (findOneCount === 1) {
            return Promise.resolve({ _id: new mongoose.Types.ObjectId(), joinCode: query.joinCode });
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const createdTeamMock = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Collision Team',
        track: 'Cybersecurity',
        captain: req.user._id,
        members: [req.user._id],
        joinCode: 'NEWCD1',
      };
      jest.spyOn(Team, 'create').mockResolvedValue(createdTeamMock);

      await teamController.createTeam(req, res, next);

      expect(findOneCount).toBeGreaterThanOrEqual(2);
      expect(Team.create).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should retry when duplicate key error (code 11000) occurs on joinCode during Team.create', async () => {
      req.body = { name: 'Race Team', track: 'AI/ML' };

      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(req.user);

      let createAttempts = 0;
      const createdTeamMock = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Race Team',
        track: 'AI/ML',
        captain: req.user._id,
        members: [req.user._id],
        joinCode: 'WIN123',
      };

      jest.spyOn(Team, 'create').mockImplementation(async () => {
        createAttempts++;
        if (createAttempts === 1) {
          const dupErr = new Error('E11000 duplicate key error collection: teams index: joinCode_1 dup key');
          dupErr.code = 11000;
          dupErr.keyPattern = { joinCode: 1 };
          throw dupErr;
        }
        return createdTeamMock;
      });

      await teamController.createTeam(req, res, next);

      expect(createAttempts).toBe(2);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when team name is duplicate (duplicate key error 11000 on name)', async () => {
      req.body = { name: 'Existing Name', track: 'AI/ML' };

      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      const nameDupErr = new Error('E11000 duplicate key error collection: teams index: name_1 dup key');
      nameDupErr.code = 11000;
      nameDupErr.keyPattern = { name: 1 };
      jest.spyOn(Team, 'create').mockRejectedValue(nameDupErr);

      await teamController.createTeam(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/team with this name already exists/i),
        })
      );
    });
  });

  describe('joinTeam', () => {
    it('should reject request when joinCode is missing or whitespace', async () => {
      req.body = { joinCode: '   ' };
      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/join code is required/i),
        })
      );
    });

    it('should reject request when joinCode is not 6 alphanumeric characters', async () => {
      req.body = { joinCode: 'TOOLONG123' };
      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/6 alphanumeric/i),
        })
      );
    });

    it('should reject request when user is already in a team', async () => {
      req.body = { joinCode: 'RAPTOR' };
      req.user.teamId = new mongoose.Types.ObjectId();
      jest.spyOn(Team, 'findById').mockResolvedValue({ _id: req.user.teamId });

      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/already in a team/i),
        })
      );
    });

    it('should return 404 when team is not found with provided join code', async () => {
      req.body = { joinCode: 'NOTFND' };
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/not found/i),
        })
      );
    });

    it('should reject when team capacity has reached 4 members', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const fullTeam = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Full Team',
        members: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ],
      };
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(fullTeam);
        return Promise.resolve(null);
      });

      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/maximum limit of 4 members/i),
        })
      );
    });

    it('should reject when user is already a member of this team', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const team = {
        _id: new mongoose.Types.ObjectId(),
        name: 'My Team',
        members: [req.user._id],
      };
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(team);
        return Promise.resolve(null);
      });

      await teamController.joinTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/already a member/i),
        })
      );
    });

    it('should successfully add user to members when capacity < 4 and update user teamId', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const captainId = new mongoose.Types.ObjectId();
      const team = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Raptor Squad',
        captain: captainId,
        members: [captainId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(team);
        return Promise.resolve(null);
      });
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(req.user);

      await teamController.joinTeam(req, res, next);

      expect(team.members).toContain(req.user._id);
      expect(team.save).toHaveBeenCalled();
      expect(req.user.save).toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(req.user._id.toString(), { teamId: team._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/successfully joined Raptor Squad/i),
        })
      );
    });
  });

  describe('getMyTeam', () => {
    it('should return null team and submission when user has no team', async () => {
      req.user.teamId = null;
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      await teamController.getMyTeam(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { team: null, submission: null, submissionStatus: null },
      });
    });

    it('should populate team members, captain details, and active submission status', async () => {
      const captainObj = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Captain Jack',
        fullName: 'Captain Jack',
        email: 'jack@test.com',
        role: 'participant',
      };
      const memberObj = {
        _id: req.user._id,
        name: 'Teammate Jill',
        fullName: 'Teammate Jill',
        email: 'jill@test.com',
        role: 'participant',
      };

      const team = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Alpha Team',
        captain: captainObj,
        members: [captainObj, memberObj],
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          name: 'Alpha Team',
          captain: captainObj,
          members: [captainObj, memberObj],
        }),
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId(),
        teamId: team._id,
        title: 'Project Titan',
        status: 'submitted',
      };

      req.user.teamId = team._id;
      jest.spyOn(Team, 'findById').mockResolvedValue(team);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(mockSubmission);

      await teamController.getMyTeam(req, res, next);

      expect(team.populate).toHaveBeenCalledWith('members', 'name fullName email role');
      expect(team.populate).toHaveBeenCalledWith('captain', 'name fullName email role');
      expect(Submission.findOne).toHaveBeenCalledWith({ teamId: team._id });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.objectContaining({
              name: 'Alpha Team',
              captainId: captainObj._id.toString(),
            }),
            submission: mockSubmission,
            submissionStatus: 'submitted',
          }),
        })
      );
    });
  });

  describe('removeMember', () => {
    it('should return 400 when target userId is invalid', async () => {
      req.params = { userId: 'not-a-valid-id' };
      await teamController.removeMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/valid user id/i),
        })
      );
    });

    it('should return 404 when target member is not in any team', async () => {
      const targetUserId = new mongoose.Types.ObjectId();
      req.params = { userId: targetUserId.toString() };
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      await teamController.removeMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/not part of any team/i),
        })
      );
    });

    it('should return 403 when an unauthorized member tries to remove another member', async () => {
      const targetUserId = new mongoose.Types.ObjectId();
      const captainId = new mongoose.Types.ObjectId();
      req.params = { userId: targetUserId.toString() };
      req.user._id = new mongoose.Types.ObjectId(); // Random teammate, not captain, not target
      req.user.role = 'participant';

      const team = {
        _id: new mongoose.Types.ObjectId(),
        captain: captainId,
        members: [captainId, req.user._id, targetUserId],
      };
      jest.spyOn(Team, 'findOne').mockResolvedValue(team);

      await teamController.removeMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/forbidden/i),
        })
      );
    });

    it('should allow captain to remove a member', async () => {
      const targetUserId = new mongoose.Types.ObjectId();
      req.params = { userId: targetUserId.toString() };
      // req.user is the captain
      const team = {
        _id: new mongoose.Types.ObjectId(),
        captain: req.user._id,
        members: [req.user._id, targetUserId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          captain: req.user._id,
          members: [req.user._id],
        }),
      };
      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(team.members).not.toContain(targetUserId);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(targetUserId.toString(), { teamId: null });
      expect(team.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/member successfully removed/i),
        })
      );
    });

    it('should allow a member to voluntarily depart', async () => {
      const captainId = new mongoose.Types.ObjectId();
      req.params = { userId: req.user._id.toString() }; // User removes self
      req.user.teamId = new mongoose.Types.ObjectId();

      const team = {
        _id: req.user.teamId,
        captain: captainId,
        members: [captainId, req.user._id],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: req.user.teamId,
          captain: captainId,
          members: [captainId],
        }),
      };
      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(team.members).not.toContain(req.user._id);
      expect(req.user.save).toHaveBeenCalled();
      expect(team.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/voluntarily left the team/i),
        })
      );
    });

    it('should transfer captaincy when captain departs and other members remain', async () => {
      const remainingMemberId = new mongoose.Types.ObjectId();
      req.params = { userId: req.user._id.toString() }; // Captain departs
      req.user.teamId = new mongoose.Types.ObjectId();

      const team = {
        _id: req.user.teamId,
        captain: req.user._id,
        members: [req.user._id, remainingMemberId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: req.user.teamId,
          captain: remainingMemberId,
          members: [remainingMemberId],
        }),
      };
      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(team.captain).toEqual(remainingMemberId);
      expect(team.members).not.toContain(req.user._id);
      expect(team.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/captaincy has been transferred/i),
        })
      );
    });

    it('should disband team when last member departs', async () => {
      req.params = { userId: req.user._id.toString() };
      req.user.teamId = new mongoose.Types.ObjectId();

      const team = {
        _id: req.user.teamId,
        captain: req.user._id,
        members: [req.user._id], // sole member
      };
      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(Team, 'findByIdAndDelete').mockResolvedValue(team);
      jest.spyOn(Submission, 'deleteMany').mockResolvedValue({});
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(Team.findByIdAndDelete).toHaveBeenCalledWith(team._id);
      expect(Submission.deleteMany).toHaveBeenCalledWith({ teamId: team._id, status: 'draft' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/disbanded/i),
          data: { team: null },
        })
      );
    });
  });

  describe('Database Transaction & Concurrent Multi-Team Prevention Logic', () => {
    let mockSession;

    beforeEach(() => {
      mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);
    });

    it('should prevent concurrent active team joins and abort transaction when race condition occurs', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const team = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Raptor Squad',
        members: [new mongoose.Types.ObjectId()],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(req.user);
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(team);
        return Promise.resolve(null);
      });
      // Simulate another concurrent transaction having already set teamId (User not found with teamId: null)
      jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null);

      await teamController.joinTeam(req, res, next);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/already in a team/i),
        })
      );
    });

    it('should successfully commit transaction and end session when joining a team', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const captainId = new mongoose.Types.ObjectId();
      const team = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Raptor Squad',
        captain: captainId,
        members: [captainId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(req.user);
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(team);
        return Promise.resolve(null);
      });
      jest.spyOn(User, 'findOneAndUpdate').mockResolvedValue(req.user);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(req.user);

      await teamController.joinTeam(req, res, next);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should abort transaction when team reaches 4 members capacity concurrently', async () => {
      req.body = { joinCode: 'RAPTOR' };
      const fullTeam = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Full Team',
        members: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ],
      };

      jest.spyOn(User, 'findById').mockResolvedValue(req.user);
      jest.spyOn(Team, 'findOne').mockImplementation((query) => {
        if (query.members) return Promise.resolve(null);
        if (query.joinCode) return Promise.resolve(fullTeam);
        return Promise.resolve(null);
      });

      await teamController.joinTeam(req, res, next);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/maximum limit of 4 members/i),
        })
      );
    });

    it('should execute removeMember inside transaction and commit atomically', async () => {
      const targetUserId = new mongoose.Types.ObjectId();
      req.params = { userId: targetUserId.toString() };
      const team = {
        _id: new mongoose.Types.ObjectId(),
        captain: req.user._id,
        members: [req.user._id, targetUserId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: new mongoose.Types.ObjectId(),
          captain: req.user._id,
          members: [req.user._id],
        }),
      };

      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should abort transaction during removeMember if an error occurs', async () => {
      const targetUserId = new mongoose.Types.ObjectId();
      req.params = { userId: targetUserId.toString() };
      const team = {
        _id: new mongoose.Types.ObjectId(),
        captain: req.user._id,
        members: [req.user._id, targetUserId],
        save: jest.fn().mockRejectedValue(new Error('Database write error during team save')),
      };

      jest.spyOn(Team, 'findOne').mockResolvedValue(team);
      jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});

      await teamController.removeMember(req, res, next);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

