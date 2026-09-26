from collections import defaultdict

import pytest

from app.models.schemas import JudgeScoreEntry
from tests.fixtures.synthetic_dataset import generate_synthetic_tournament


def test_dataset_has_expected_dimensions_and_unique_ids():
    dataset = generate_synthetic_tournament()

    assert len(dataset.submissions) == 50
    assert len(dataset.judges) == 12
    assert len({submission.track for submission in dataset.submissions}) == 4
    assert len({submission.submission_id for submission in dataset.submissions}) == 50
    assert len({judge.judge_id for judge in dataset.judges}) == 12


def test_scores_use_existing_score_representation_and_stay_in_range():
    dataset = generate_synthetic_tournament()

    assert all(isinstance(score, JudgeScoreEntry) for score in dataset.scores)
    assert all(1.0 <= score.raw_composite_score <= 10.0 for score in dataset.scores)


def test_same_seed_and_parameters_are_deterministic():
    first = generate_synthetic_tournament(seed=2026)
    second = generate_synthetic_tournament(seed=2026)

    assert first == second


def test_judges_cover_only_submissions_in_their_track():
    dataset = generate_synthetic_tournament()
    submissions_by_id = {submission.submission_id: submission for submission in dataset.submissions}
    judges_by_id = {judge.judge_id: judge for judge in dataset.judges}
    submissions_per_track = defaultdict(int)
    for submission in dataset.submissions:
        submissions_per_track[submission.track] += 1
    scores_by_judge = defaultdict(list)
    for score in dataset.scores:
        scores_by_judge[score.judge_id].append(score)

    assert all(
        len(scores_by_judge[judge.judge_id]) == submissions_per_track[judge.track]
        for judge in dataset.judges
    )
    assert all(
        submissions_by_id[score.submission_id].track == judges_by_id[score.judge_id].track
        for score in dataset.scores
    )


def test_configured_biases_shift_scores_in_expected_direction():
    dataset = generate_synthetic_tournament(
        harsh_bias=-2.0,
        lenient_bias=2.0,
        neutral_bias=0.0,
        noise_std=0.0,
    )
    submissions_by_id = {submission.submission_id: submission for submission in dataset.submissions}
    judges_by_id = {judge.judge_id: judge for judge in dataset.judges}
    scores_by_bias = defaultdict(list)

    for score in dataset.scores:
        judge = judges_by_id[score.judge_id]
        quality = submissions_by_id[score.submission_id].latent_quality
        scores_by_bias[judge.bias].append(score.raw_composite_score - quality)

    assert sum(scores_by_bias[-2.0]) / len(scores_by_bias[-2.0]) == pytest.approx(-2.0, abs=0.01)
    assert sum(scores_by_bias[0.0]) / len(scores_by_bias[0.0]) == pytest.approx(0.0, abs=0.01)
    assert sum(scores_by_bias[2.0]) / len(scores_by_bias[2.0]) == pytest.approx(2.0, abs=0.01)


def test_raw_average_can_reverse_latent_quality_ordering():
    dataset = generate_synthetic_tournament()
    submissions_by_id = {submission.submission_id: submission for submission in dataset.submissions}
    raw_scores = defaultdict(list)
    for score in dataset.scores:
        raw_scores[score.submission_id].append(score.raw_composite_score)

    latent_order = sorted(dataset.submissions, key=lambda submission: submission.latent_quality, reverse=True)
    raw_order = sorted(raw_scores, key=lambda submission_id: sum(raw_scores[submission_id]) / len(raw_scores[submission_id]), reverse=True)

    assert [submission.submission_id for submission in latent_order] != raw_order
    inversions = [
        sum(raw_scores[lower.submission_id]) / len(raw_scores[lower.submission_id])
        - sum(raw_scores[higher.submission_id]) / len(raw_scores[higher.submission_id])
        for higher in dataset.submissions
        for lower in dataset.submissions
        if higher.latent_quality > lower.latent_quality
        and sum(raw_scores[higher.submission_id]) / len(raw_scores[higher.submission_id])
        < sum(raw_scores[lower.submission_id]) / len(raw_scores[lower.submission_id])
    ]

    assert any(
        higher.latent_quality > lower.latent_quality
        and sum(raw_scores[higher.submission_id]) / len(raw_scores[higher.submission_id])
        < sum(raw_scores[lower.submission_id]) / len(raw_scores[lower.submission_id])
        for higher in dataset.submissions
        for lower in dataset.submissions
    )
    assert max(inversions) > 1.0
