const express = require('express');
const { requireServiceKey } = require('../middleware/serviceAuth');
const { getPropertyBillSummary, getTenantOwner, getDigest } = require('../controllers/internalController');

const router = express.Router();

router.use(requireServiceKey);

router.get('/bills/summary', getPropertyBillSummary);
router.get('/tenants/:id/owner', getTenantOwner);
router.get('/digest', getDigest);

module.exports = router;
