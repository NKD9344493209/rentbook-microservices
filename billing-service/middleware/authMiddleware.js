const jwt = require('jsonwebtoken');

/* billing-service has no users table: users belong to user-service.
   It verifies the JWT that user-service issued, using the shared
   JWT_SECRET. The token already carries { id, role }, so no network
   call or database lookup is needed per request (stateless auth). */
const protect = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised. No token provided.' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = { _id: decoded.id, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorised. Token is invalid or expired.' });
  }
};

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    next();
  };

module.exports = { protect, restrictTo };
