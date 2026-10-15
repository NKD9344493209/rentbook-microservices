// An error that already knows which HTTP status it should produce.
// Thrown by controllers and by the inter-service client; turned into a
// JSON response by middleware/errorHandler.js.
class ServiceError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

module.exports = ServiceError;
