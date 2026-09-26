import numpy as np
import pandas as pd
from typing import List, Dict, Any, Sequence
from ..models.schemas import JudgeScoreEntry, NormalizationResponse, JudgeCalibrationMetric, ProjectStanding


def calculate_mean(scores: Sequence[float]) -> float:
    """Return the arithmetic mean, preserving NumPy behavior for empty input."""
    return float(np.mean(scores))


def calculate_sample_variance(scores: Sequence[float]) -> float:
    """Return sample variance with NumPy's nan result for fewer than two values."""
    return float(np.var(scores, ddof=1))


def calculate_sample_std(scores: Sequence[float]) -> float:
    """Return sample standard deviation with NumPy's nan result for fewer than two values."""
    return float(np.std(scores, ddof=1))


def run_normalization(scores: List[JudgeScoreEntry], bayesian_prior_k: float = 3.0) -> NormalizationResponse:
    if not scores:
        return NormalizationResponse(
            status="success",
            algorithm="z_score_bayesian_shrinkage",
            total_submissions=0,
            total_scores_processed=0,
            judge_calibrations=[],
            standings=[]
        )

    # Convert to DataFrame
    df = pd.DataFrame([{
        "judge_id": s.judge_id,
        "submission_id": s.submission_id,
        "raw_score": float(s.raw_composite_score)
    } for s in scores])

    # Global population mean
    mu_global = float(df["raw_score"].mean())

    # Calculate per-judge parameters
    judge_stats = {}
    judge_calibrations = []

    for judge_id, group in df.groupby("judge_id"):
        n_j = len(group)
        mu_j = float(group["raw_score"].mean())
        # std with small epsilon
        std_j = float(np.std(group["raw_score"]))
        if std_j < 1e-6:
            std_j = 1.0 # fallback when all scores identical to prevent division by zero

        # Empirical Bayesian Shrinkage
        if n_j < 5:
            weight_empirical = n_j / (n_j + bayesian_prior_k)
            weight_prior = bayesian_prior_k / (n_j + bayesian_prior_k)
            mu_shrunk = (weight_empirical * mu_j) + (weight_prior * mu_global)
        else:
            mu_shrunk = mu_j

        judge_stats[judge_id] = {
            "n_j": n_j,
            "mu_j": mu_j,
            "std_j": std_j,
            "mu_shrunk": mu_shrunk
        }

        judge_calibrations.append(JudgeCalibrationMetric(
            judge_id=str(judge_id),
            sample_size=n_j,
            raw_mean=round(mu_j, 3),
            raw_std=round(std_j, 3),
            bayesian_shrunk_mean=round(mu_shrunk, 3)
        ))

    # Compute Z_ij for each score
    z_scores = []
    for _, row in df.iterrows():
        j_id = row["judge_id"]
        stats = judge_stats[j_id]
        z_ij = (row["raw_score"] - stats["mu_shrunk"]) / stats["std_j"]
        z_scores.append(z_ij)

    df["z_score"] = z_scores

    # Aggregate by submission
    project_results = []
    for sub_id, group in df.groupby("submission_id"):
        raw_mean = float(group["raw_score"].mean())
        z_mean = float(group["z_score"].mean())
        ballot_count = len(group)
        project_results.append({
            "submission_id": str(sub_id),
            "raw_mean": raw_mean,
            "z_mean": z_mean,
            "ballot_count": ballot_count
        })

    # Rescale Z-scores to 0-100 range
    all_z = [p["z_mean"] for p in project_results]
    min_z = min(all_z) if all_z else 0.0
    max_z = max(all_z) if all_z else 1.0

    z_range = max_z - min_z

    standings = []
    for p in project_results:
        if z_range < 1e-6:
            # When variance across all projects is zero or single submission
            normalized_score = 50.0
        else:
            normalized_score = 100.0 * ((p["z_mean"] - min_z) / z_range)

        standings.append({
            "submission_id": p["submission_id"],
            "raw_mean": round(p["raw_mean"], 2),
            "normalized_score": round(float(normalized_score), 2),
            "z_score_mean": round(float(p["z_mean"]), 4),
            "ballot_count": p["ballot_count"],
        })

    # Sort descending by normalized score
    standings.sort(key=lambda x: x["normalized_score"], reverse=True)

    # Assign ranks
    final_standings = []
    for idx, s in enumerate(standings):
        final_standings.append(ProjectStanding(
            submission_id=s["submission_id"],
            raw_mean=s["raw_mean"],
            normalized_score=s["normalized_score"],
            z_score_mean=s["z_score_mean"],
            ballot_count=s["ballot_count"],
            rank=idx + 1
        ))

    return NormalizationResponse(
        status="success",
        algorithm="z_score_bayesian_shrinkage",
        total_submissions=len(final_standings),
        total_scores_processed=len(scores),
        judge_calibrations=judge_calibrations,
        standings=final_standings
    )
