const mongoose = require('mongoose');

const JudgeAssignmentSchema = new mongoose.Schema(
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
    track: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

JudgeAssignmentSchema.index({ judgeId: 1, submissionId: 1 }, { unique: true });

module.exports = mongoose.model('JudgeAssignment', JudgeAssignmentSchema);
