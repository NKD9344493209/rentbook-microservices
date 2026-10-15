const { createServiceClient } = require('./serviceClient');

// billing-service -> user-service calls. Every function returns plain data,
// returns null when user-service says "not found", and throws a
// ServiceError (502/503) when user-service is down or misbehaving.
const client = createServiceClient('user-service', 'USER_SERVICE_URL');

module.exports = {
  getUser: (id, requestId) => client.request({ url: `/internal/users/${id}`, requestId }),

  getUsers: (ids, requestId) =>
    client.request({ method: 'post', url: '/internal/users/batch', data: { ids }, requestId, retry: true }),

  getProperty: (id, requestId) => client.request({ url: `/internal/properties/${id}`, requestId }),

  getProperties: (ids, requestId) =>
    client.request({ method: 'post', url: '/internal/properties/batch', data: { ids }, requestId, retry: true }),

  getPropertiesByOwner: (ownerId, requestId) =>
    client.request({ url: '/internal/properties', params: { owner: String(ownerId) }, requestId }),

  health: (requestId) => client.request({ url: '/api/health', requestId, retry: false }),
};
