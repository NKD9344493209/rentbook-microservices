const express = require('express');
const {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
} = require('../controllers/complaintController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getComplaints).post(restrictTo('tenant'), createComplaint);
router.route('/:id').put(restrictTo('owner'), updateComplaintStatus).delete(restrictTo('tenant'), deleteComplaint);

module.exports = router;
