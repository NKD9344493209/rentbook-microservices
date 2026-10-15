const express = require('express');
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Everything below requires a valid token and the owner role.
router.use(protect, restrictTo('owner'));

router.route('/').get(getProperties).post(createProperty);
router.route('/:id').get(getProperty).put(updateProperty).delete(deleteProperty);

module.exports = router;
