const User = require('../models/User');

// GET /api/users/tenants  (owner only)
// Feeds the bill form's tenant dropdown, so a brand-new tenant can
// receive their first bill.
const getTenants = async (req, res) => {
  const tenants = await User.find({ role: 'tenant' }).select('name email').sort('name');
  res.json(tenants);
};

module.exports = { getTenants };
