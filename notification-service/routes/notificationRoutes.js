const express = require('express');
const { list, readAll, readOne } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', list);
router.put('/read-all', readAll);
router.put('/:id/read', readOne);
module.exports = router;
