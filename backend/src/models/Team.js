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
      required: [true, 'Join code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [6, 'Join code must be 6 characters'],
      maxlength: [6, 'Join code must be 6 characters'],
      match: [/^[A-Z0-9]{6}$/, 'Join code must be 6 uppercase alphanumeric characters'],
      index: true,
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team captain is required'],
      alias: 'captainId',
    },
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 4;
          },
          message: 'A team cannot exceed 4 members.',
        },
      ],
      default: [],
    },
    track: {
      type: String,
      required: [true, 'Competition track is required'],
      trim: true,
      index: true,
    },
    hasSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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

