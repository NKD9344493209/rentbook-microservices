const { createServiceClient } = require('./serviceClient');

/* billing-service -> notification-service.
   Fire-and-forget: a notification failure must never fail the business
   action (the bill is still saved, the complaint still updated). */
const client = createServiceClient('notification-service', 'NOTIFICATION_SERVICE_URL');

function emit(type, payload, requestId) {
  if (!process.env.NOTIFICATION_SERVICE_URL) return;
  client
    .request({ method: 'post', url: '/internal/events', data: { type, ...payload }, requestId, retry: true })
    .catch((error) => console.warn(`  notification "${type}" not delivered: ${error.message}`));
}

module.exports = { emit };
