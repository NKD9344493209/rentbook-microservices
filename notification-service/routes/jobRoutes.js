const express = require('express');
const { digestNow } = require('../controllers/internalController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();
// Owner presses "Send reminders now" in the app.
router.post('/digest', protect, restrictTo('owner'), digestNow);
module.exports = router;
