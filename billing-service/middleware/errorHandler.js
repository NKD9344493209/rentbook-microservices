// Express 5 forwards errors thrown in async route handlers here
// automatically, so controllers can simply `throw`. One place decides
// the status code and the shape of every error response.
const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with these details already exists.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500 && !(err.name === 'ServiceError')) console.error(`[${req.id}]`, err);

  const body = { message };
  if (typeof err.code === 'string') body.code = err.code;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
