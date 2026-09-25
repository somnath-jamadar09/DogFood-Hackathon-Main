const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        'SUBMISSION_LOCKED',
        'SCORE_SUBMITTED',
        'SCORE_OVERRIDDEN',
        'JUDGES_ASSIGNED',
        'NORMALIZATION_EXECUTED',
        'RUBRIC_MODIFIED',
      ],
      required: true,
      index: true,
    },
    targetResource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipHash: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    capped: false, // Persistent storage
  }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
