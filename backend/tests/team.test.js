const mongoose = require('mongoose');
const Team = require('../src/models/Team');

describe('Team Model Schema Unit Tests (per SDD specification)', () => {
  it('should validate a valid team document with all SDD fields', () => {
    const captainId = new mongoose.Types.ObjectId();
    const member1 = new mongoose.Types.ObjectId();
    const member2 = new mongoose.Types.ObjectId();

    const validTeam = new Team({
      name: 'CyberDinos',
      joinCode: 'RAPTOR',
      captain: captainId,
      members: [captainId, member1, member2],
      track: 'AI/ML',
    });

    const err = validTeam.validateSync();
    expect(err).toBeUndefined();
    expect(validTeam.name).toBe('CyberDinos');
    expect(validTeam.joinCode).toBe('RAPTOR');
    expect(validTeam.captain).toEqual(captainId);
    expect(validTeam.captainId).toEqual(captainId);
    expect(validTeam.members).toHaveLength(3);
    expect(validTeam.track).toBe('AI/ML');
    expect(validTeam.hasSubmitted).toBe(false);
  });

  it('should fail validation if required fields (name, joinCode, captain, track) are missing', () => {
    const emptyTeam = new Team({});
    const err = emptyTeam.validateSync();

    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.joinCode).toBeDefined();
    expect(err.errors.captain).toBeDefined();
    expect(err.errors.track).toBeDefined();
  });

  it('should enforce 6-character uppercase alphanumeric joinCode', () => {
    const captainId = new mongoose.Types.ObjectId();

    // Lowercase should be auto-converted to uppercase
    const lowercaseTeam = new Team({
      name: 'Team Lowercase',
      joinCode: 'abcdef',
      captain: captainId,
      track: 'Web3',
    });
    const errLower = lowercaseTeam.validateSync();
    expect(errLower).toBeUndefined();
    expect(lowercaseTeam.joinCode).toBe('ABCDEF');

    // Less than 6 characters
    const shortTeam = new Team({
      name: 'Team Short',
      joinCode: 'ABC12',
      captain: captainId,
      track: 'Web3',
    });
    const errShort = shortTeam.validateSync();
    expect(errShort).toBeDefined();
    expect(errShort.errors.joinCode).toBeDefined();

    // More than 6 characters
    const longTeam = new Team({
      name: 'Team Long',
      joinCode: 'ABC1234',
      captain: captainId,
      track: 'Web3',
    });
    const errLong = longTeam.validateSync();
    expect(errLong).toBeDefined();
    expect(errLong.errors.joinCode).toBeDefined();

    // Invalid characters (non-alphanumeric)
    const invalidCharTeam = new Team({
      name: 'Team Special',
      joinCode: 'ABC!@#',
      captain: captainId,
      track: 'Web3',
    });
    const errSpecial = invalidCharTeam.validateSync();
    expect(errSpecial).toBeDefined();
    expect(errSpecial.errors.joinCode).toBeDefined();
  });

  it('should enforce maximum of 4 members in members array', () => {
    const captainId = new mongoose.Types.ObjectId();
    const members = [
      captainId,
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(), // 5th member
    ];

    const teamOverCapacity = new Team({
      name: 'Over Capacity Team',
      joinCode: 'TEAM05',
      captain: captainId,
      members,
      track: 'FinTech',
    });

    const err = teamOverCapacity.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.members).toBeDefined();
    expect(err.errors.members.message).toMatch(/cannot exceed 4 members/i);
  });

  it('should allow up to 4 members successfully', () => {
    const captainId = new mongoose.Types.ObjectId();
    const members = [
      captainId,
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    const teamMaxCapacity = new Team({
      name: 'Max 4 Team',
      joinCode: 'TEAM04',
      captain: captainId,
      members,
      track: 'HealthTech',
    });

    const err = teamMaxCapacity.validateSync();
    expect(err).toBeUndefined();
    expect(teamMaxCapacity.members).toHaveLength(4);
  });

  it('should support captainId alias for captain', () => {
    const captainId = new mongoose.Types.ObjectId();

    const team = new Team({
      name: 'Alias Team',
      joinCode: 'ALIAS1',
      captainId: captainId,
      track: 'AI/ML',
    });

    expect(team.captain).toEqual(captainId);
    expect(team.captainId).toEqual(captainId);

    const json = team.toJSON();
    expect(json.captain.toString()).toBe(captainId.toString());
    expect(json.captainId.toString()).toBe(captainId.toString());
  });
});
