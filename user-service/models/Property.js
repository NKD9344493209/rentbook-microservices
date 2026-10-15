const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Property name is required.'], trim: true },
    address: { type: String, required: [true, 'Address is required.'], trim: true },
    rooms: { type: Number, required: [true, 'Number of rooms is required.'], min: [1, 'A property needs at least 1 room.'] },
    occupied: {
      type: Number,
      default: 0,
      min: [0, 'Occupied rooms cannot be negative.'],
      validate: {
        validator(value) {
          return value <= this.rooms;
        },
        message: 'Occupied rooms cannot be more than total rooms.',
      },
    },
    monthlyRent: { type: Number, required: [true, 'Monthly rent is required.'], min: [0, 'Rent cannot be negative.'] },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
