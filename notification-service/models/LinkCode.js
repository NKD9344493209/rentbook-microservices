const mongoose = require('mongoose');

// Short-lived code the user types into the bot (/link ABC123) to connect their account.
const linkCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true },
    name: { type: String, default: '' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Mongo deletes expired codes
  },
  { timestamps: true }
);

module.exports = mongoose.model('LinkCode', linkCodeSchema);
