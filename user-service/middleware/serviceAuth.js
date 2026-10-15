// Guards /internal routes. Only the other RentBook service knows SERVICE_KEY,
// so the browser (or anyone else) cannot call these endpoints directly.
const requireServiceKey = (req, res, next) => {
  const key = req.headers['x-service-key'];

  // The first check matters: if SERVICE_KEY were missing from the
  // environment, undefined === undefined would let every request through.
  if (!process.env.SERVICE_KEY || key !== process.env.SERVICE_KEY) {
    return res.status(403).json({ message: 'Internal endpoint. Service key missing or wrong.' });
  }
  next();
};

module.exports = { requireServiceKey };
