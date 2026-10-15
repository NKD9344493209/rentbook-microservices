const express = require('express');
const { getTenants } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/tenants', protect, restrictTo('owner'), getTenants);

module.exports = router;
