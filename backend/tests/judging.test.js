const { solveJudgeAssignments } = require('../src/services/assignmentSolver');

describe('Greedy Judge Assignment Algorithm Unit Tests', () => {
  it('should distribute projects to track-qualified judges while balancing load', () => {
    const submissions = [
      { _id: 'sub1', teamId: 'team1', track: 'AI/ML', title: 'AI Proj 1' },
      { _id: 'sub2', teamId: 'team2', track: 'AI/ML', title: 'AI Proj 2' },
      { _id: 'sub3', teamId: 'team3', track: 'AI/ML', title: 'AI Proj 3' },
    ];

    const judges = [
      { _id: 'judge1', judgeTracks: ['AI/ML'], conflictsOfInterest: [] },
      { _id: 'judge2', judgeTracks: ['AI/ML'], conflictsOfInterest: [] },
    ];

    const result = solveJudgeAssignments(submissions, judges, 2);

    expect(result.totalAssigned).toBe(6);
    expect(result.judgeLoad['judge1']).toBe(3);
    expect(result.judgeLoad['judge2']).toBe(3);
  });

  it('should strictly avoid assigning a judge to a project in conflictsOfInterest', () => {
    const submissions = [
      { _id: 'sub1', teamId: 'teamConflict', track: 'AI/ML', title: 'Conflicted Proj' },
    ];

    const judges = [
      { _id: 'judgeConflict', judgeTracks: ['AI/ML'], conflictsOfInterest: ['teamConflict'] },
      { _id: 'judgeClean', judgeTracks: ['AI/ML'], conflictsOfInterest: [] },
    ];

    const result = solveJudgeAssignments(submissions, judges, 1);

    expect(result.totalAssigned).toBe(1);
    expect(result.assignments[0].judgeId).toBe('judgeClean');
  });
});
