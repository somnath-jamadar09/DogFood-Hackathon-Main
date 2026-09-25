const mongoose = require('mongoose');

const RubricCriterionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 0.05, max: 0.8 },
    scaleMin: { type: Number, default: 1 },
    scaleMax: { type: Number, default: 10 },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Hackathon Raptors 2026',
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'judging', 'closed'],
      default: 'active',
      index: true,
    },
    submissionDeadline: {
      type: Date,
      required: true,
    },
    tracks: [
      {
        type: String,
        required: true,
      },
    ],
    rubric: [RubricCriterionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', EventSchema);
