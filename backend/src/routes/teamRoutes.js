const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');

router.use(authMiddleware);

router.post('/', roleGuard('participant', 'organizer', 'admin'), teamController.createTeam);
router.post('/join', roleGuard('participant', 'organizer', 'admin'), teamController.joinTeam);
router.get('/my-team', teamController.getMyTeam);

module.exports = router;
