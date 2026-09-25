const mongoose = require('mongoose');

const CriterionScoreSchema = new mongoose.Schema(
  {
    criteriaName: { type: String, required: true },
    weight: { type: Number, required: true, min: 0.05, max: 0.8 },
    rawScore: { type: Number, required: true, min: 1.0, max: 10.0 },
  },
  { _id: false }
);

const ScoreSchema = new mongoose.Schema(
  {
    judgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    criteriaScores: [CriterionScoreSchema],
    totalRawScore: {
      type: Number,
      required: true,
      min: 1.0,
      max: 10.0,
    },
    normalizedScore: {
      type: Number,
      default: null,
    },
    privateNotes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    isFinal: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Each judge can submit exactly ONE score per submission
ScoreSchema.index({ judgeId: 1, submissionId: 1 }, { unique: true });

module.exports = mongoose.model('Score', ScoreSchema);
