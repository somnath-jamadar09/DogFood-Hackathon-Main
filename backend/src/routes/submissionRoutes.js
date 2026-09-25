const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const upload = require('../config/multer');

// Public route: gallery and view submission
router.get('/gallery', submissionController.getGallery);
router.get('/:id', submissionController.getSubmissionById);

// Participant routes
router.use(authMiddleware);

router.post(
  '/',
  roleGuard('participant', 'organizer', 'admin'),
  submissionController.upsertSubmission
);

router.post(
  '/upload-thumbnail',
  roleGuard('participant', 'organizer', 'admin'),
  upload.single('thumbnail'),
  submissionController.uploadThumbnail
);

router.post(
  '/finalize',
  roleGuard('participant', 'organizer', 'admin'),
  submissionController.finalizeSubmission
);

module.exports = router;
