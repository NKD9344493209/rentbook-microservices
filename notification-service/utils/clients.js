const { createServiceClient } = require('./serviceClient');

// notification-service -> the other two services.
const users = createServiceClient('user-service', 'USER_SERVICE_URL');
const billing = createServiceClient('billing-service', 'BILLING_SERVICE_URL');

module.exports = {
  getUser: (id, requestId) => users.request({ url: `/internal/users/${id}`, requestId }),
  getUsers: (ids, requestId) => users.request({ method: 'post', url: '/internal/users/batch', data: { ids }, requestId, retry: true }),
  // Everything the daily digest needs, computed by billing-service.
  getDigest: (requestId) => billing.request({ url: '/internal/digest', params: { remindDays: process.env.REMIND_DAYS_BEFORE || 2 }, requestId }),
  userHealth: (requestId) => users.request({ url: '/api/health', requestId, retry: false }),
  billingHealth: (requestId) => billing.request({ url: '/api/health', requestId, retry: false }),
};
