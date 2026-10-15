const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required.'], trim: true },
    description: { type: String, required: [true, 'Description is required.'], trim: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
    room: { type: String, trim: true, default: '—' },

    // ids from user-service's database (resolved over REST, not populate)
    tenant: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
