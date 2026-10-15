const crypto = require('crypto');

// Gives every request an id (or keeps the one another service sent) and
// logs method, path, status and time. The same id appears in the logs of
// both services, which is how you follow one action across microservices.
const requestLogger = (serviceName) => (req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID().slice(0, 8);
  res.setHeader('x-request-id', req.id);
  res.setHeader('x-served-by', serviceName);

  const started = Date.now();
  res.on('finish', () => {
    console.log(`[${req.id}] ${req.method} ${req.originalUrl} = ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
};

module.exports = requestLogger;
