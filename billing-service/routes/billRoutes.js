const express = require('express');
const { getBills, getBill, createBill, updateBill, deleteBill, payBill } = require('../controllers/billController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getBills).post(restrictTo('owner'), createBill);
router.route('/:id').get(getBill).put(restrictTo('owner'), updateBill).delete(restrictTo('owner'), deleteBill);
router.post('/:id/pay', restrictTo('tenant'), payBill);

module.exports = router;
