const mongoose = require('mongoose');
const User = require('../src/models/User');

describe('User Model Schema Unit Tests (per SDD specification)', () => {
  it('should validate a valid user document with all SDD fields', () => {
    const validUser = new User({
      name: 'Alice Turing',
      email: 'ALICE@EXAMPLE.COM',
      passwordHash: '$2a$10$wE9l1T5vU6tZkYJmQZ7u1.Zg6C5J0R0J8Y4bV8h9X0l1Z2m3k4l5e',
      role: 'judge',
      trackPreferences: ['AI/ML', 'HealthTech'],
      conflictsOfInterest: ['team-alpha-id', 'team-beta-id'],
    });

    const err = validUser.validateSync();
    expect(err).toBeUndefined();
    expect(validUser.name).toBe('Alice Turing');
    expect(validUser.email).toBe('alice@example.com'); // converted to lowercase
    expect(validUser.role).toBe('judge');
    expect(validUser.trackPreferences).toEqual(['AI/ML', 'HealthTech']);
    expect(validUser.conflictsOfInterest).toEqual(['team-alpha-id', 'team-beta-id']);
  });

  it('should fail validation if required fields (name, email, passwordHash) are missing', () => {
    const emptyUser = new User({});
    const err = emptyUser.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.passwordHash).toBeDefined();
  });

  it('should default role to participant', () => {
    const user = new User({
      name: 'Bob Participant',
      email: 'bob@example.com',
      passwordHash: 'hash123',
    });

    expect(user.role).toBe('participant');
    expect(user.trackPreferences).toEqual([]);
    expect(user.conflictsOfInterest).toEqual([]);
  });

  it('should allow valid roles: participant, judge, organizer, admin', () => {
    const validRoles = ['participant', 'judge', 'organizer', 'admin'];

    validRoles.forEach((role) => {
      const user = new User({
        name: 'Role Test User',
        email: `${role}@test.com`,
        passwordHash: 'hash123',
        role,
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
      expect(user.role).toBe(role);
    });
  });

  it('should reject invalid roles not in SDD enum specification', () => {
    const invalidRoles = ['visitor', 'superuser', 'guest', 'moderator'];

    invalidRoles.forEach((role) => {
      const user = new User({
        name: 'Invalid Role User',
        email: `${role}@test.com`,
        passwordHash: 'hash123',
        role,
      });
      const err = user.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.role).toBeDefined();
    });
  });

  it('should support fullName alias for name and judgeTracks alias for trackPreferences', () => {
    const user = new User({
      fullName: 'Legacy Name Field',
      email: 'legacy@example.com',
      passwordHash: 'hash123',
      judgeTracks: ['Web3 & Blockchain'],
    });

    expect(user.name).toBe('Legacy Name Field');
    expect(user.fullName).toBe('Legacy Name Field');
    expect(user.trackPreferences).toEqual(['Web3 & Blockchain']);
    expect(user.judgeTracks).toEqual(['Web3 & Blockchain']);
  });
});
