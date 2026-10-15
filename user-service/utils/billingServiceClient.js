const { createServiceClient } = require('./serviceClient');

// user-service -> billing-service calls.
const client = createServiceClient('billing-service', 'BILLING_SERVICE_URL');

module.exports = {
  // { totalBills, pendingBills } for one property
  getPropertyBillSummary: (propertyId, requestId) =>
    client.request({ url: '/internal/bills/summary', params: { property: String(propertyId) }, requestId }),

  health: (requestId) => client.request({ url: '/api/health', requestId, retry: false }),
};
