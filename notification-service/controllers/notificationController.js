const Notification = require('../models/Notification');
const ServiceError = require('../utils/ServiceError');
const assertObjectId = require('../utils/assertObjectId');

// GET /api/notifications?unread=1&limit=30
const list = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === '1') filter.read = false;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort('-createdAt').limit(limit),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
};

// PUT /api/notifications/read-all
const readAll = async (req, res) => {
  const r = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ updated: r.modifiedCount });
};

// PUT /api/notifications/:id/read
const readOne = async (req, res) => {
  assertObjectId(req.params.id, 'notification id');
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw new ServiceError(404, 'No notification found with that id.');
  n.read = true;
  await n.save();
  res.json(n);
};

module.exports = { list, readAll, readOne };
