const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Runs before a protected route's controller.
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised. No token provided.' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // user-service owns the users, so it can confirm the account still exists.
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorised. User no longer exists.' });
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Not authorised. Token is invalid or expired.' });
  }
};

// Restricts a route to specific roles. Use after protect.
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    next();
  };

module.exports = { protect, restrictTo };
