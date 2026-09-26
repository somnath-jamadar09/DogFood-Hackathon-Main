const mongoose = require('mongoose');

const DELTA = 1e-5;

const RubricCriterionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Criterion key is required'],
      trim: true,
    },
    label: {
      type: String,
      required: [true, 'Criterion label is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    weight: {
      type: Number,
      required: [true, 'Criterion weight is required'],
      min: [0, 'Weight must be non-negative'],
      max: [1, 'Weight cannot exceed 1.0'],
    },
    minScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 10,
    },
    step: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const RubricSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    criteria: {
      type: [RubricCriterionSchema],
      required: [true, 'Criteria array is required'],
      validate: [
        {
          validator: function (val) {
            if (!val || !Array.isArray(val) || val.length === 0) return false;
            const allHaveWeights = val.every(
              (item) => typeof item?.weight === 'number' && !isNaN(item.weight)
            );
            // If some subdocuments are missing required weights, let subdocument schema validation report them
            if (!allHaveWeights) return true;
            const totalWeight = val.reduce((sum, item) => sum + item.weight, 0);
            return Math.abs(totalWeight - 1.0) <= DELTA;
          },
          message: 'Total criteria weight must sum to 1.0 (within floating point delta 10^-5).',
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-validate hook ensuring sum(weight) == 1.0 within floating point delta 10^-5
RubricSchema.pre('validate', function (next) {
  if (!this.criteria || !Array.isArray(this.criteria) || this.criteria.length === 0) {
    this.invalidate('criteria', 'Criteria cannot be empty and total weight must sum to 1.0.');
    return next();
  }
  const allHaveWeights = this.criteria.every(
    (item) => typeof item?.weight === 'number' && !isNaN(item.weight)
  );
  if (allHaveWeights) {
    const totalWeight = this.criteria.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 1.0) > DELTA) {
      this.invalidate(
        'criteria',
        `Total weight must equal 1.0 (within delta ${DELTA}). Current total: ${totalWeight}`
      );
    }
  }
  next();
});

// Pre-save hook safety guard
RubricSchema.pre('save', function (next) {
  if (!this.criteria || !Array.isArray(this.criteria) || this.criteria.length === 0) {
    return next(new Error('Criteria cannot be empty and total weight must sum to 1.0.'));
  }
  const totalWeight = this.criteria.reduce((sum, item) => sum + (Number(item?.weight) || 0), 0);
  if (Math.abs(totalWeight - 1.0) > DELTA) {
    return next(
      new Error(`Total criteria weight must equal 1.0 (within delta ${DELTA}). Current sum: ${totalWeight}`)
    );
  }
  next();
});

module.exports = mongoose.model('Rubric', RubricSchema);
