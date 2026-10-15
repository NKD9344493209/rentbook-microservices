const mongoose = require('mongoose');

const amount = (label) => ({ type: Number, default: 0, min: [0, `${label} cannot be negative.`] });

const billSchema = new mongoose.Schema(
  {
    // Billing period as YYYY-MM (e.g. 2026-10). Sortable and unambiguous.
    month: {
      type: String,
      required: [true, 'Month is required.'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format, e.g. 2026-10.'],
    },
    rent: { type: Number, required: [true, 'Rent is required.'], min: [0, 'Rent cannot be negative.'] },
    electricity: amount('Electricity'),
    water: amount('Water'),
    internet: amount('Internet'),
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    dueDate: { type: Date, required: [true, 'Due date is required.'] },
    paidOn: { type: Date },
    room: { type: String, trim: true, default: '' },

    // These ids belong to user-service's database. There is no Mongoose `ref`
    // because the documents live in another service: we resolve them over REST.
    tenant: { type: mongoose.Schema.Types.ObjectId, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
    property: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// One bill per tenant per month, enforced by the database itself.
billSchema.index({ tenant: 1, month: 1 }, { unique: true });
billSchema.index({ owner: 1, status: 1 });
billSchema.index({ property: 1, status: 1 });

// A virtual is computed on read, never stored in the database.
billSchema.virtual('total').get(function () {
  return (this.rent || 0) + (this.electricity || 0) + (this.water || 0) + (this.internet || 0);
});

module.exports = mongoose.model('Bill', billSchema);
