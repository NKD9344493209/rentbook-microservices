const express = require('express');
const { requireServiceKey } = require('../middleware/serviceAuth');
const {
  getUserById,
  getUsersByIds,
  getPropertiesByOwner,
  getPropertyById,
  getPropertiesByIds,
} = require('../controllers/internalController');

const router = express.Router();

router.use(requireServiceKey);

router.get('/users/:id', getUserById);
router.post('/users/batch', getUsersByIds);
router.get('/properties', getPropertiesByOwner);
router.post('/properties/batch', getPropertiesByIds);
router.get('/properties/:id', getPropertyById);

module.exports = router;
