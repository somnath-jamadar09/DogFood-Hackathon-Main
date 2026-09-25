const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    tagline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    track: {
      type: String,
      required: true,
      index: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    demoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    descriptionMarkdown: {
      type: String,
      required: true,
    },
    thumbnailPath: {
      type: String,
      default: '/uploads/default-thumbnail.webp',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'locked'],
      default: 'draft',
      index: true,
    },
    publicVoteCount: {
      type: Number,
      default: 0,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Full-text search index for public gallery
SubmissionSchema.index({ title: 'text', tagline: 'text' });

module.exports = mongoose.model('Submission', SubmissionSchema);
