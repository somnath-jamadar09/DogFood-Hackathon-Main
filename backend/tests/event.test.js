const mongoose = require('mongoose');
const Event = require('../src/models/Event');

describe('Event Model Schema Unit Tests (per SDD specification)', () => {
  it('should validate a valid event document with all specified fields', () => {
    const deadline = new Date(Date.now() + 24 * 3600 * 1000);
    const validEvent = new Event({
      title: 'Hackathon Raptors 2026',
      description: 'The premier offline-first engineering hackathon.',
      tracks: ['AI/ML', 'Web3 & Blockchain', 'FinTech', 'HealthTech'],
      status: 'active',
      submissionDeadline: deadline,
      rubricLocked: false,
      rubric: [
        { name: 'Technical Execution', weight: 0.3, scaleMin: 1, scaleMax: 10 },
        { name: 'Innovation & Originality', weight: 0.25, scaleMin: 1, scaleMax: 10 },
      ],
    });

    const err = validEvent.validateSync();
    expect(err).toBeUndefined();
    expect(validEvent.title).toBe('Hackathon Raptors 2026');
    expect(validEvent.name).toBe('Hackathon Raptors 2026'); // alias check
    expect(validEvent.description).toBe('The premier offline-first engineering hackathon.');
    expect(validEvent.tracks).toEqual(['AI/ML', 'Web3 & Blockchain', 'FinTech', 'HealthTech']);
    expect(validEvent.status).toBe('active');
    expect(validEvent.submissionDeadline).toEqual(deadline);
    expect(validEvent.rubricLocked).toBe(false);
    expect(validEvent.rubric).toHaveLength(2);
  });

  it('should fail validation if required fields (title, submissionDeadline) are missing', () => {
    const emptyEvent = new Event({});
    const err = emptyEvent.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.submissionDeadline).toBeDefined();
  });

  it('should set default values for optional fields', () => {
    const event = new Event({
      title: 'Minimal Event',
      submissionDeadline: new Date(),
    });

    expect(event.status).toBe('active');
    expect(event.rubricLocked).toBe(false);
    expect(event.description).toBe('');
    expect(event.tracks).toEqual([]);
    expect(event.rubric).toEqual([]);
  });

  it('should allow valid status enum values', () => {
    const validStatuses = ['upcoming', 'active', 'judging', 'closed'];

    validStatuses.forEach((status) => {
      const event = new Event({
        title: `Event ${status}`,
        submissionDeadline: new Date(),
        status,
      });

      const err = event.validateSync();
      expect(err).toBeUndefined();
      expect(event.status).toBe(status);
    });
  });

  it('should reject invalid status values not in enum', () => {
    const invalidStatuses = ['pending', 'cancelled', 'archived', 'running'];

    invalidStatuses.forEach((status) => {
      const event = new Event({
        title: 'Invalid Status Event',
        submissionDeadline: new Date(),
        status,
      });

      const err = event.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.status).toBeDefined();
    });
  });

  it('should support alias name for title interchangeably', () => {
    const event = new Event({
      name: 'Aliased Event Name',
      submissionDeadline: new Date(),
    });

    expect(event.title).toBe('Aliased Event Name');
    expect(event.name).toBe('Aliased Event Name');

    // Setting via title
    event.title = 'Updated via Title';
    expect(event.name).toBe('Updated via Title');

    // Setting via name
    event.name = 'Updated via Name';
    expect(event.title).toBe('Updated via Name');
  });

  it('should allow tracks as an array of strings [String]', () => {
    const event = new Event({
      title: 'Track Test Event',
      submissionDeadline: new Date(),
      tracks: ['AI/ML', 'Robotics', 'Cybersecurity'],
    });

    const err = event.validateSync();
    expect(err).toBeUndefined();
    expect(event.tracks).toEqual(['AI/ML', 'Robotics', 'Cybersecurity']);
    expect(event.tracks).toHaveLength(3);
  });

  it('should support toggling rubricLocked flag', () => {
    const event = new Event({
      title: 'Locked Rubric Event',
      submissionDeadline: new Date(),
      rubricLocked: true,
    });

    const err = event.validateSync();
    expect(err).toBeUndefined();
    expect(event.rubricLocked).toBe(true);
  });
});
