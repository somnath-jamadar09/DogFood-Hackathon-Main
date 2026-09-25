import numpy as np
from typing import List, Dict
from ..models.schemas import PairwiseComparison, PairwiseRankResponse, PairwiseStanding

def run_bradley_terry(
    comparisons: List[PairwiseComparison],
    max_iterations: int = 100,
    tolerance: float = 1e-6
) -> PairwiseRankResponse:
    if not comparisons:
        return PairwiseRankResponse(
            status="success",
            total_comparisons=0,
            iterations_converged=0,
            standings=[]
        )

    # Collect unique items
    items = set()
    for c in comparisons:
        items.add(c.submission_a)
        items.add(c.submission_b)

    items_list = sorted(list(items))
    item_idx = {item: i for i, item in enumerate(items_list)}
    M = len(items_list)

    # Wins matrix and Total matches matrix
    # W[i, j] = times i beat j
    W = np.zeros((M, M), dtype=float)
    N = np.zeros((M, M), dtype=float)

    for c in comparisons:
        idx_a = item_idx[c.submission_a]
        idx_b = item_idx[c.submission_b]
        N[idx_a, idx_b] += 1
        N[idx_b, idx_a] += 1

        if c.winner == c.submission_a:
            W[idx_a, idx_b] += 1
        elif c.winner == c.submission_b:
            W[idx_b, idx_a] += 1
        else:
            # draw / tie split
            W[idx_a, idx_b] += 0.5
            W[idx_b, idx_a] += 0.5

    # Total wins vector for each item
    total_wins = np.sum(W, axis=1)

    # Add Laplace smoothing to prevent division by zero for items with zero wins
    total_wins += 0.01

    # Initialize skill parameter vector pi
    pi = np.ones(M, dtype=float) / M

    converged_iter = 0
    for iteration in range(max_iterations):
        pi_prev = pi.copy()

        for i in range(M):
            denom = 0.0
            for j in range(M):
                if i != j and N[i, j] > 0:
                    denom += N[i, j] / (pi_prev[i] + pi_prev[j])
            
            if denom > 0:
                pi[i] = total_wins[i] / denom
            else:
                pi[i] = pi_prev[i]

        # Normalize sum to 1.0
        pi = pi / np.sum(pi)

        # Check convergence
        max_diff = np.max(np.abs(pi - pi_prev))
        converged_iter = iteration + 1
        if max_diff < tolerance:
            break

    # Build standings
    ranked_indices = np.argsort(-pi)
    standings = []
    for rank, idx in enumerate(ranked_indices, start=1):
        standings.append(PairwiseStanding(
            submission_id=items_list[idx],
            latent_score=round(float(pi[idx]), 6),
            rank=rank
        ))

    return PairwiseRankResponse(
        status="success",
        total_comparisons=len(comparisons),
        iterations_converged=converged_iter,
        standings=standings
    )
