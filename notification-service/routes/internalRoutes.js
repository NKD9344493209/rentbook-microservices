const express = require('express');
const { requireServiceKey } = require('../middleware/serviceAuth');
const { events, digestNow } = require('../controllers/internalController');
const { simulate } = require('../controllers/telegramController');

const router = express.Router();
router.use(requireServiceKey);
router.post('/events', events);
router.post('/jobs/digest', digestNow);
router.post('/telegram/simulate', simulate);
module.exports = router;
