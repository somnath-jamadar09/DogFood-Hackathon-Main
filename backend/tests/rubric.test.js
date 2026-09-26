const mongoose = require('mongoose');
const Rubric = require('../src/models/Rubric');

describe('Rubric Model Schema and Hook Unit Tests', () => {
  const dummyEventId = new mongoose.Types.ObjectId();

  it('should validate a valid Rubric document with all criteria fields', async () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [
        {
          key: 'technical_execution',
          label: 'Technical Execution',
          description: 'Code quality, architecture, and engineering complexity',
          weight: 0.4,
          minScore: 1,
          maxScore: 10,
          step: 0.5,
        },
        {
          key: 'innovation',
          label: 'Innovation & Originality',
          description: 'Novelty of approach and creativity',
          weight: 0.3,
          minScore: 1,
          maxScore: 10,
          step: 0.5,
        },
        {
          key: 'presentation',
          label: 'Polish & Presentation',
          description: 'Pitch clarity and UI polish',
          weight: 0.3,
          minScore: 0,
          maxScore: 5,
          step: 1,
        },
      ],
    });

    const syncErr = rubric.validateSync();
    expect(syncErr).toBeUndefined();

    await expect(rubric.validate()).resolves.toBeUndefined();

    expect(rubric.eventId).toEqual(dummyEventId);
    expect(rubric.criteria).toHaveLength(3);
    expect(rubric.criteria[0].key).toBe('technical_execution');
    expect(rubric.criteria[0].label).toBe('Technical Execution');
    expect(rubric.criteria[0].description).toBe('Code quality, architecture, and engineering complexity');
    expect(rubric.criteria[0].weight).toBe(0.4);
    expect(rubric.criteria[0].minScore).toBe(1);
    expect(rubric.criteria[0].maxScore).toBe(10);
    expect(rubric.criteria[0].step).toBe(0.5);
  });

  it('should apply defaults for minScore, maxScore, step, and description when omitted', () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [
        {
          key: 'execution',
          label: 'Execution',
          weight: 1.0,
        },
      ],
    });

    const err = rubric.validateSync();
    expect(err).toBeUndefined();
    expect(rubric.criteria[0].minScore).toBe(0);
    expect(rubric.criteria[0].maxScore).toBe(10);
    expect(rubric.criteria[0].step).toBe(1);
    expect(rubric.criteria[0].description).toBe('');
  });

  it('should accept total weight within floating point delta 10^-5', async () => {
    // 0.3333333333333333 * 3 = 1.0
    // Test weights that sum to 1.000005 (within 1e-5)
    const rubricWithinDelta = new Rubric({
      eventId: dummyEventId,
      criteria: [
        { key: 'c1', label: 'C1', weight: 0.5 },
        { key: 'c2', label: 'C2', weight: 0.500005 },
      ],
    });

    const syncErr = rubricWithinDelta.validateSync();
    expect(syncErr).toBeUndefined();
    await expect(rubricWithinDelta.validate()).resolves.toBeUndefined();
  });

  it('should reject total weight that exceeds floating point delta 10^-5', async () => {
    // Weight sum = 1.00002 (|sum - 1.0| = 2e-5 > 1e-5)
    const rubricExceedingDelta = new Rubric({
      eventId: dummyEventId,
      criteria: [
        { key: 'c1', label: 'C1', weight: 0.5 },
        { key: 'c2', label: 'C2', weight: 0.50002 },
      ],
    });

    const syncErr = rubricExceedingDelta.validateSync();
    expect(syncErr).toBeDefined();
    expect(syncErr.errors.criteria).toBeDefined();

    await expect(rubricExceedingDelta.validate()).rejects.toThrow();
  });

  it('should reject total weight summing to less than 1.0 (e.g. 0.8)', async () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [
        { key: 'c1', label: 'C1', weight: 0.4 },
        { key: 'c2', label: 'C2', weight: 0.4 },
      ],
    });

    const syncErr = rubric.validateSync();
    expect(syncErr).toBeDefined();
    expect(syncErr.errors.criteria).toBeDefined();

    await expect(rubric.validate()).rejects.toThrow();
  });

  it('should reject total weight summing to greater than 1.0 (e.g. 1.25)', async () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [
        { key: 'c1', label: 'C1', weight: 0.75 },
        { key: 'c2', label: 'C2', weight: 0.5 },
      ],
    });

    const syncErr = rubric.validateSync();
    expect(syncErr).toBeDefined();
    expect(syncErr.errors.criteria).toBeDefined();

    await expect(rubric.validate()).rejects.toThrow();
  });

  it('should fail validation when eventId is missing', () => {
    const rubric = new Rubric({
      criteria: [{ key: 'c1', label: 'C1', weight: 1.0 }],
    });

    const err = rubric.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.eventId).toBeDefined();
  });

  it('should fail validation when criteria array is empty', async () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [],
    });

    const syncErr = rubric.validateSync();
    expect(syncErr).toBeDefined();
    expect(syncErr.errors.criteria).toBeDefined();

    await expect(rubric.validate()).rejects.toThrow();
  });

  it('should fail validation when required criterion fields are missing', () => {
    const rubric = new Rubric({
      eventId: dummyEventId,
      criteria: [
        { description: 'missing key, label, and weight' },
      ],
    });

    const err = rubric.validateSync();
    expect(err).toBeDefined();
    expect(err.errors['criteria.0.key']).toBeDefined();
    expect(err.errors['criteria.0.label']).toBeDefined();
    expect(err.errors['criteria.0.weight']).toBeDefined();
  });
});
