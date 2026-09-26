const path = require('path');
const fs = require('fs');
const express = require('express');
const request = require('supertest');
const upload = require('../src/config/multer');

describe('Multer Configuration and File Upload Tests', () => {
  const expectedUploadDir = path.resolve(__dirname, '../uploads/thumbnails');
  let app;
  const createdTestFiles = [];

  beforeAll(() => {
    app = express();
    app.post('/test-upload', upload.single('thumbnail'), (req, res) => {
      if (req.file) {
        createdTestFiles.push(req.file.path);
      }
      res.status(200).json({
        success: true,
        file: {
          filename: req.file.filename,
          destination: req.file.destination,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        },
      });
    });

    // Multer error handling middleware
    app.use((err, req, res, next) => {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    });
  });

  afterAll(() => {
    // Clean up any test files written to disk
    createdTestFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
    });
  });

  it('should ensure the uploads/thumbnails directory exists', () => {
    expect(fs.existsSync(expectedUploadDir)).toBe(true);
  });

  it('should configure destination to point to uploads/thumbnails', (done) => {
    const storage = upload.storage;
    storage.getDestination(null, { originalname: 'test.png' }, (err, destination) => {
      expect(err).toBeNull();
      expect(path.resolve(destination)).toBe(expectedUploadDir);
      done();
    });
  });

  it('should sanitize filename using crypto.randomUUID() and preserve extension', (done) => {
    const storage = upload.storage;
    const testFile = { originalname: 'my-profile_photo.PNG' };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.PNG$/;

    storage.getFilename(null, testFile, (err, filename) => {
      expect(err).toBeNull();
      expect(filename).toMatch(uuidRegex);
      expect(path.extname(filename)).toBe('.PNG');
      done();
    });
  });

  it('should allow JPEG, PNG, and WebP MIME types in fileFilter', (done) => {
    const fileFilter = upload.fileFilter;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    let count = 0;
    allowed.forEach((mimetype) => {
      fileFilter(null, { mimetype }, (err, accept) => {
        expect(err).toBeNull();
        expect(accept).toBe(true);
        count++;
        if (count === allowed.length) {
          done();
        }
      });
    });
  });

  it('should reject unpermitted MIME types in fileFilter', (done) => {
    const fileFilter = upload.fileFilter;
    const disallowed = ['image/gif', 'application/pdf', 'text/plain', 'image/svg+xml'];

    let count = 0;
    disallowed.forEach((mimetype) => {
      fileFilter(null, { mimetype }, (err, accept) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Invalid file format. Only JPEG, PNG, and WebP images are allowed.');
        expect(accept).toBe(false);
        count++;
        if (count === disallowed.length) {
          done();
        }
      });
    });
  });

  it('should have a 5MB fileSize limit configured', () => {
    expect(upload.limits.fileSize).toBe(5 * 1024 * 1024);
  });

  it('should successfully upload a valid PNG file via HTTP endpoint', async () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const res = await request(app)
      .post('/test-upload')
      .attach('thumbnail', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(path.resolve(res.body.file.destination)).toBe(expectedUploadDir);
    expect(fs.existsSync(res.body.file.path)).toBe(true);
  });

  it('should reject an invalid file MIME type via HTTP endpoint', async () => {
    const textBuffer = Buffer.from('Plain text file content');

    const res = await request(app)
      .post('/test-upload')
      .attach('thumbnail', textBuffer, { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Only JPEG, PNG, and WebP images are allowed');
  });

  it('should reject a file exceeding 5MB limit', async () => {
    // 5MB + 1KB buffer
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);

    const res = await request(app)
      .post('/test-upload')
      .attach('thumbnail', largeBuffer, { filename: 'huge.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/File too large/i);
  });
});
