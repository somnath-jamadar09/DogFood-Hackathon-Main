import pytest
from app.algorithms.pairwise import run_bradley_terry
from app.models.schemas import PairwiseComparison

def test_pairwise_bradley_terry_convergence():
    comparisons = [
        PairwiseComparison(submission_a="Alpha", submission_b="Beta", winner="Alpha"),
        PairwiseComparison(submission_a="Alpha", submission_b="Gamma", winner="Alpha"),
        PairwiseComparison(submission_a="Beta", submission_b="Gamma", winner="Beta"),
    ]

    response = run_bradley_terry(comparisons)

    assert response.status == "success"
    assert response.total_comparisons == 3
    assert len(response.standings) == 3

    # Alpha beat both Beta and Gamma -> Rank 1
    assert response.standings[0].submission_id == "Alpha"
    assert response.standings[0].rank == 1

    # Beta beat Gamma -> Rank 2
    assert response.standings[1].submission_id == "Beta"
    assert response.standings[1].rank == 2

    # Gamma lost both -> Rank 3
    assert response.standings[2].submission_id == "Gamma"
    assert response.standings[2].rank == 3
