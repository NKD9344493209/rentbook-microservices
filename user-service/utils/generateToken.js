const jwt = require('jsonwebtoken');

// The token carries the user's id and role. billing-service verifies it with
// the same JWT_SECRET, so it can authorise requests without a database lookup.
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = generateToken;
