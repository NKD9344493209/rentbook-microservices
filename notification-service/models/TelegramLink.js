const mongoose = require('mongoose');

// Which Telegram chat belongs to which RentBook user.
const telegramLinkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true }, // id from user-service
    role: { type: String, enum: ['tenant', 'owner'], required: true },
    name: { type: String, default: '' },
    chatId: { type: String, required: true, unique: true },
    telegramName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TelegramLink', telegramLinkSchema);
