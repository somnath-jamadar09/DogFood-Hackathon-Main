const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Team name must be at least 3 characters'],
      maxlength: [40, 'Team name cannot exceed 40 characters'],
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
      index: true,
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    track: {
      type: String,
      required: [true, 'Competition track is required'],
      index: true,
    },
    hasSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce maximum team size of 4 members
TeamSchema.pre('save', function (next) {
  if (this.members && this.members.length > 4) {
    next(new Error('A team cannot exceed 4 members.'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Team', TeamSchema);
