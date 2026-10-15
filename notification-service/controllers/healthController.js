const mongoose = require('mongoose');
const telegram = require('../telegram/telegram');
const clients = require('../utils/clients');

const SERVICE = 'notification-service';

const health = (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    service: SERVICE,
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'disconnected',
    telegram: telegram.enabled() ? 'enabled' : 'console-mode',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
};

const dependencies = async (req, res) => {
  const check = async (name, fn) => {
    const started = Date.now();
    try {
      const remote = await fn(req.id);
      return { dependency: name, reachable: true, latencyMs: Date.now() - started, remote };
    } catch (error) {
      return { dependency: name, reachable: false, latencyMs: Date.now() - started, message: error.message };
    }
  };
  const results = await Promise.all([check('user-service', clients.userHealth), check('billing-service', clients.billingHealth)]);
  const reachable = results.every((r) => r.reachable);
  res.status(reachable ? 200 : 503).json({ service: SERVICE, reachable, dependencies: results });
};

module.exports = { health, dependencies };
