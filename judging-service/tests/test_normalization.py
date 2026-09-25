import pytest
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
