import warnings

import numpy as np
import pytest
from app.algorithms import normalization
from app.algorithms.normalization import run_normalization
from app.models.schemas import JudgeScoreEntry

def test_normalization_worked_example_neutralizes_evaluator_bias():
    # 2 Judges: Judge A (tough), Judge B (lenient)
    scores = [
        JudgeScoreEntry(judge_id="JudgeA", submission_id="Proj1", raw_composite_score=5.0),
        JudgeScoreEntry(judge_id="JudgeA", submission_id="Proj2", raw_composite_score=3.0),
        JudgeScoreEntry(judge_id="JudgeB", submission_id="Proj3", raw_composite_score=9.0),
        JudgeScoreEntry(judge_id="JudgeB", submission_id="Proj4", raw_composite_score=8.0),
    ]

    response = run_normalization(scores, bayesian_prior_k=3.0)

    assert response.status == "success"
    assert response.total_submissions == 4
    assert response.total_scores_processed == 4

    standings_map = {s.submission_id: s for s in response.standings}

    # Proj1 and Proj3 have identical relative standing to their respective judges
    assert standings_map["Proj1"].normalized_score == standings_map["Proj3"].normalized_score
    # Proj2 and Proj4 have identical relative standing to their respective judges
    assert standings_map["Proj2"].normalized_score == standings_map["Proj4"].normalized_score
    # Both top projects beat bottom projects
    assert standings_map["Proj1"].normalized_score > standings_map["Proj2"].normalized_score

def test_empty_scores_handling():
    response = run_normalization([])
    assert response.total_submissions == 0
    assert response.standings == []


def test_baseline_statistics_known_sample():
    scores = [1, 2, 3, 4, 5]

    assert normalization.calculate_mean(scores) == pytest.approx(3.0)
    assert normalization.calculate_sample_variance(scores) == pytest.approx(2.5)
    assert normalization.calculate_sample_std(scores) == pytest.approx(np.sqrt(2.5))


def test_baseline_statistics_two_observations():
    scores = [2, 4]

    assert normalization.calculate_mean(scores) == pytest.approx(3.0)
    assert normalization.calculate_sample_variance(scores) == pytest.approx(2.0)
    assert normalization.calculate_sample_std(scores) == pytest.approx(np.sqrt(2.0))


def test_baseline_statistics_identical_scores_have_zero_variance():
    scores = [5, 5, 5, 5]

    assert normalization.calculate_mean(scores) == pytest.approx(5.0)
    assert normalization.calculate_sample_variance(scores) == pytest.approx(0.0)
    assert normalization.calculate_sample_std(scores) == pytest.approx(0.0)


def test_baseline_statistics_allow_negative_values():
    scores = [-2, -1, 0, 1]

    assert normalization.calculate_mean(scores) == pytest.approx(-0.5)
    assert normalization.calculate_sample_variance(scores) == pytest.approx(5 / 3)
    assert normalization.calculate_sample_std(scores) == pytest.approx(np.sqrt(5 / 3))


def test_baseline_statistics_are_deterministic():
    scores = [1, 2, 3, 4, 5]
    expected = (
        normalization.calculate_mean(scores),
        normalization.calculate_sample_variance(scores),
        normalization.calculate_sample_std(scores),
    )

    for _ in range(100):
        assert (
            normalization.calculate_mean(scores),
            normalization.calculate_sample_variance(scores),
            normalization.calculate_sample_std(scores),
        ) == pytest.approx(expected)


def test_baseline_statistics_preserve_numpy_nan_behavior_for_insufficient_samples():
    with warnings.catch_warnings(), np.errstate(all="ignore"):
        warnings.simplefilter("ignore", RuntimeWarning)
        assert np.isnan(normalization.calculate_mean([]))
        assert np.isnan(normalization.calculate_sample_variance([]))
        assert np.isnan(normalization.calculate_sample_std([]))
        assert normalization.calculate_mean([5]) == pytest.approx(5.0)
        assert np.isnan(normalization.calculate_sample_variance([5]))
        assert np.isnan(normalization.calculate_sample_std([5]))
