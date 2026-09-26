from dataclasses import dataclass
import random

from app.models.schemas import JudgeScoreEntry


TRACKS = ("track-1", "track-2", "track-3", "track-4")


@dataclass(frozen=True)
class SyntheticSubmission:
    submission_id: str
    team_id: str
    track: str
    latent_quality: float


@dataclass(frozen=True)
class SyntheticJudge:
    judge_id: str
    track: str
    bias: float


@dataclass(frozen=True)
class SyntheticTournament:
    submissions: tuple[SyntheticSubmission, ...]
    judges: tuple[SyntheticJudge, ...]
    scores: tuple[JudgeScoreEntry, ...]


def generate_synthetic_tournament(
    *,
    seed: int = 2026,
    harsh_bias: float = -1.8,
    lenient_bias: float = 1.5,
    neutral_bias: float = 0.0,
    noise_std: float = 0.2,
) -> SyntheticTournament:
    """Build a deterministic dataset; positive bias means a more lenient judge."""
    rng = random.Random(seed)
    submissions = tuple(
        SyntheticSubmission(
            submission_id=f"submission-{index:03d}",
            team_id=f"team-{index:03d}",
            track=TRACKS[index % len(TRACKS)],
            latent_quality=round(rng.uniform(4.0, 6.5), 6),
        )
        for index in range(50)
    )

    roles_by_track = (
        ("harsh", "harsh", "neutral"),
        ("harsh", "neutral", "lenient"),
        ("neutral", "lenient", "lenient"),
        ("harsh", "neutral", "lenient"),
    )
    bias_by_role = {
        "harsh": harsh_bias,
        "lenient": lenient_bias,
        "neutral": neutral_bias,
    }
    judges = tuple(
        SyntheticJudge(
            judge_id=f"judge-{track_index + 1}-{judge_index + 1}",
            track=TRACKS[track_index],
            bias=bias_by_role[role],
        )
        for track_index, roles in enumerate(roles_by_track)
        for judge_index, role in enumerate(roles)
    )

    judges_by_track = {
        track: tuple(judge for judge in judges if judge.track == track)
        for track in TRACKS
    }
    scores = tuple(
        JudgeScoreEntry(
            judge_id=judge.judge_id,
            submission_id=submission.submission_id,
            raw_composite_score=round(
                # Deterministically clip to the existing 1.0-10.0 judging range.
                min(
                    10.0,
                    max(
                        1.0,
                        submission.latent_quality
                        + judge.bias
                        + rng.gauss(0.0, noise_std),
                    ),
                ),
                6,
            ),
        )
        for submission in submissions
        for judge in judges_by_track[submission.track]
    )
    return SyntheticTournament(submissions, judges, scores)
