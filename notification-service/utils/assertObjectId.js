const mongoose = require('mongoose');
const ServiceError = require('./ServiceError');

// Rejects malformed ids with a clear 400 instead of a database CastError.
const assertObjectId = (id, label = 'id') => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ServiceError(400, `Invalid ${label}.`);
  }
};

module.exports = assertObjectId;
