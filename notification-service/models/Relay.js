const mongoose = require('mongoose');

// A tenant message forwarded to the owner on Telegram. Remembering the owner's
// message id lets us route the owner's reply back to the right tenant.
const relaySchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
    tenantChatId: { type: String, required: true },
    ownerChatId: { type: String, required: true },
    ownerMessageId: { type: Number, required: true, index: true },
    text: { type: String, required: true },
    reply: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Relay', relaySchema);
