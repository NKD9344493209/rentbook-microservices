const mongoose = require('mongoose');
const billingService = require('../utils/billingServiceClient');

const SERVICE = 'user-service';

// GET /api/health
const health = (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    service: SERVICE,
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
};

// GET /api/health/dependencies
// Proves this deployed service can reach the other deployed service.
const dependencies = async (req, res) => {
  const started = Date.now();
  try {
    const other = await billingService.health(req.id);
    res.json({ service: SERVICE, dependency: 'billing-service', reachable: true, latencyMs: Date.now() - started, remote: other });
  } catch (error) {
    res.status(503).json({ service: SERVICE, dependency: 'billing-service', reachable: false, latencyMs: Date.now() - started, message: error.message });
  }
};

module.exports = { health, dependencies };
