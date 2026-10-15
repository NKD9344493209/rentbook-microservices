const { handleEvent } = require('../utils/events');
const { runDigest } = require('../jobs/digest');
const ServiceError = require('../utils/ServiceError');

// POST /internal/events   body: { type, tenant, owner, bill?, complaint?, property? }
// Called by billing-service after something happens.
const events = async (req, res) => {
  const event = req.body || {};
  if (!event.type) throw new ServiceError(400, 'Event type is required.');
  const result = await handleEvent(event);
  res.status(result.handled ? 201 : 202).json(result);
};

// POST /api/jobs/digest  (owner, for demo) and POST /internal/jobs/digest (service key / cron pinger)
const digestNow = async (req, res) => {
  res.json(await runDigest(req.id));
};

module.exports = { events, digestNow };
