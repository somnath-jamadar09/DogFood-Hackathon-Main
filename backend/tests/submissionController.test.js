const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/index');
const submissionController = require('../src/controllers/submissionController');
const Submission = require('../src/models/Submission');
const Team = require('../src/models/Team');
const User = require('../src/models/User');

describe('Submission Controller & Static Serving Unit Tests', () => {
  let req, res, next;
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyTeamId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: dummyUserId,
        role: 'participant',
        teamId: dummyTeamId,
        save: jest.fn().mockResolvedValue(true),
      },
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('POST /api/v1/submissions (upsertSubmission)', () => {
    it('should reject with 400 when user does not belong to a team', async () => {
      req.user.teamId = null;
      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      await submissionController.upsertSubmission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/form or join a team/i),
        })
      );
    });

    it('should reject with 423 when submission is already locked or submitted', async () => {
      const mockTeam = { _id: dummyTeamId, name: 'CyberDinos', track: 'AI/ML' };
      const mockSubmission = { _id: new mongoose.Types.ObjectId(), status: 'submitted' };

      jest.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(mockSubmission);

      await submissionController.upsertSubmission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/locked and can no longer be edited/i),
        })
      );
    });

    it('should create a new draft submission when none exists', async () => {
      const mockTeam = { _id: dummyTeamId, name: 'CyberDinos', track: 'AI/ML' };
      const createdSub = {
        _id: new mongoose.Types.ObjectId(),
        team: dummyTeamId,
        title: 'Project Raptor',
        tagline: 'ML Evaluation Engine',
        track: 'AI/ML',
        githubUrl: 'https://github.com/raptor/eval',
        demoVideoUrl: 'https://youtu.be/demo',
        description: '# Project Details',
        thumbnailUrl: '/uploads/default-thumbnail.webp',
        status: 'draft',
      };

      jest.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(null);
      jest.spyOn(Submission, 'create').mockResolvedValue(createdSub);

      req.body = {
        title: 'Project Raptor',
        tagline: 'ML Evaluation Engine',
        repoUrl: 'https://github.com/raptor/eval',
        demoUrl: 'https://youtu.be/demo',
        descriptionMarkdown: '# Project Details',
      };

      await submissionController.upsertSubmission(req, res, next);

      expect(Submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          team: dummyTeamId,
          title: 'Project Raptor',
          tagline: 'ML Evaluation Engine',
          track: 'AI/ML',
          githubUrl: 'https://github.com/raptor/eval',
          demoVideoUrl: 'https://youtu.be/demo',
          description: '# Project Details',
          status: 'draft',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Submission draft created successfully.',
        data: { submission: createdSub },
      });
    });

    it('should update an existing draft submission', async () => {
      const mockTeam = { _id: dummyTeamId, name: 'CyberDinos', track: 'AI/ML' };
      const existingSub = {
        _id: new mongoose.Types.ObjectId(),
        team: dummyTeamId,
        title: 'Old Title',
        tagline: 'Old Tagline',
        githubUrl: 'https://github.com/old/repo',
        demoVideoUrl: '',
        description: 'Old description',
        thumbnailUrl: '/uploads/default-thumbnail.webp',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(existingSub);

      req.body = {
        title: 'Updated Title',
        tagline: 'Updated Tagline',
        githubUrl: 'https://github.com/new/repo',
        description: 'Updated markdown',
        thumbnailUrl: '/uploads/thumbnails/custom.png',
      };

      await submissionController.upsertSubmission(req, res, next);

      expect(existingSub.title).toBe('Updated Title');
      expect(existingSub.tagline).toBe('Updated Tagline');
      expect(existingSub.githubUrl).toBe('https://github.com/new/repo');
      expect(existingSub.description).toBe('Updated markdown');
      expect(existingSub.thumbnailUrl).toBe('/uploads/thumbnails/custom.png');
      expect(existingSub.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Submission successfully saved.',
        data: { submission: existingSub },
      });
    });

    it('should resolve user team from membership if teamId is not set on user', async () => {
      req.user.teamId = null;
      const mockTeam = { _id: dummyTeamId, name: 'Fallback Team', track: 'Web3' };
      const createdSub = {
        _id: new mongoose.Types.ObjectId(),
        team: dummyTeamId,
        title: "Fallback Team's Project",
        status: 'draft',
      };

      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockResolvedValue(null);
      jest.spyOn(Submission, 'create').mockResolvedValue(createdSub);

      await submissionController.upsertSubmission(req, res, next);

      expect(Team.findOne).toHaveBeenCalledWith({
        $or: [{ members: dummyUserId.toString() }, { captain: dummyUserId.toString() }],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { submission: createdSub },
        })
      );
    });
  });

  describe('GET /api/v1/submissions/my-submission (getMySubmission)', () => {
    it('should return 404 when user has no team', async () => {
      req.user.teamId = null;
      jest.spyOn(Team, 'findById').mockResolvedValue(null);
      jest.spyOn(Team, 'findOne').mockResolvedValue(null);

      await submissionController.getMySubmission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User does not belong to a team.',
      });
    });

    it('should return 404 when team has no submission yet', async () => {
      const mockTeam = { _id: dummyTeamId, name: 'CyberDinos' };
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
      };
      // Emulate chained populate returning null
      populateChain.populate.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      jest.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockReturnValue(populateChain);

      await submissionController.getMySubmission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No submission found for this team.',
      });
    });

    it('should return 200 with populated submission when found', async () => {
      const mockTeam = { _id: dummyTeamId, name: 'CyberDinos', track: 'AI/ML' };
      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        team: mockTeam,
        title: 'Neural Engine',
        tagline: 'Deep Learning',
        status: 'draft',
      };

      const populateChain = {
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockSub),
        })),
      };

      jest.spyOn(Team, 'findById').mockResolvedValue(mockTeam);
      jest.spyOn(Submission, 'findOne').mockReturnValue(populateChain);

      await submissionController.getMySubmission(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { submission: mockSub },
      });
    });
  });

  describe('Static Uploads Serving (/uploads/)', () => {
    it('should serve default-thumbnail.webp at /uploads/default-thumbnail.webp with 200 and image/webp type', async () => {
      const res = await request(app).get('/uploads/default-thumbnail.webp');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/webp/);
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('should return 404 JSON for non-existent upload files', async () => {
      const res = await request(app).get('/uploads/non-existent-image-12345.png');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Route Precedence & Auth Protection', () => {
    it('GET /api/v1/submissions/my-submission requires authentication', async () => {
      const res = await request(app).get('/api/v1/submissions/my-submission');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Authentication token required/i);
    });

    it('GET /api/v1/submissions/:id returns 404 for invalid ObjectId without throwing 500 CastError', async () => {
      const res = await request(app).get('/api/v1/submissions/invalid-id-string');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Project submission not found.');
    });
  });
});
