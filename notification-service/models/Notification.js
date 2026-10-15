const mongoose = require('mongoose');

// Every alert we produce, whether or not it reached Telegram. Feeds the in-app bell.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true }, // bill.issued, bill.paid, complaint.created, ...
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' }, // where the app should navigate
    read: { type: Boolean, default: false },
    channel: { type: String, enum: ['telegram', 'in-app'], default: 'in-app' },
    telegramStatus: { type: String, enum: ['sent', 'failed', 'not-linked', 'console'], default: 'not-linked' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
