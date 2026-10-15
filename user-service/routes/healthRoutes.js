const express = require('express');
const { health, dependencies } = require('../controllers/healthController');

const router = express.Router();

router.get('/', health);
router.get('/dependencies', dependencies);

module.exports = router;
