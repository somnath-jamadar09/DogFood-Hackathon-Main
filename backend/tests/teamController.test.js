const mongoose = require('mongoose');
const teamController = require('../src/controllers/teamController');
const Team = require('../src/models/Team');
const User = require('../src/models/User');

describe('Team Controller - POST /api/v1/teams Unit Tests', () => {
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
});
