const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    fingerprintHash: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // TTL Index: Automatic expiration after 24 hours
    },
  },
  {
    timestamps: false,
  }
);

// Anti-Sybil Compound Index: 1 vote per fingerprint per submission per 24 hours
VoteSchema.index({ submissionId: 1, fingerprintHash: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
