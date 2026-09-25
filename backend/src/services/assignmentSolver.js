/**
 * Greedy Constraint-Satisfied Judge Assignment Engine
 * Satisfies track constraints, eliminates conflicts of interest, and balances judge workloads.
 */
function solveJudgeAssignments(submissions, judges, targetPerProject = 3) {
  const assignments = [];
  const judgeLoad = {};

  judges.forEach((judge) => {
    judgeLoad[judge._id.toString()] = 0;
  });

  for (const submission of submissions) {
    const eligibleJudges = [];

    for (const judge of judges) {
      // 1. Verify track match
      const tracks = judge.trackPreferences || judge.judgeTracks || [];
      const hasTrack = tracks.includes(submission.track);
      
      // 2. Verify conflict of interest (judge cannot score their own team or declared conflicts)
      const conflicts = (judge.conflictsOfInterest || []).map((id) => id.toString());
      const hasConflict = conflicts.includes(submission.teamId.toString());

      if (hasTrack && !hasConflict) {
        eligibleJudges.push(judge);
      }
    }

    if (eligibleJudges.length === 0) {
      throw new Error(`Insufficient judges available for track: ${submission.track} (Submission: ${submission.title})`);
    }

    // Sort eligible judges ascending by current assigned workload
    eligibleJudges.sort((a, b) => {
      const loadA = judgeLoad[a._id.toString()] || 0;
      const loadB = judgeLoad[b._id.toString()] || 0;
      return loadA - loadB;
    });

    const evaluationsCount = Math.min(targetPerProject, eligibleJudges.length);
    const selected = eligibleJudges.slice(0, evaluationsCount);

    for (const judge of selected) {
      assignments.push({
        judgeId: judge._id,
        submissionId: submission._id,
        track: submission.track,
        status: 'pending',
      });
      judgeLoad[judge._id.toString()] = (judgeLoad[judge._id.toString()] || 0) + 1;
    }
  }

  return {
    assignments,
    judgeLoad,
    totalAssigned: assignments.length,
  };
}

module.exports = {
  solveJudgeAssignments,
};
