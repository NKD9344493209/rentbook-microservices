const express = require('express');
const { getTenantSummary, getOwnerStats } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/tenant/summary', protect, restrictTo('tenant'), getTenantSummary);
router.get('/owner/stats', protect, restrictTo('owner'), getOwnerStats);

module.exports = router;
