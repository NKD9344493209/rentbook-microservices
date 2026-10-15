const express = require('express');
const { status, linkCode, unlink, test } = require('../controllers/telegramController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/status', status);
router.post('/link-code', linkCode);
router.delete('/link', unlink);
router.post('/test', test);
module.exports = router;
