import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Sequence
from ..models.schemas import JudgeScoreEntry, NormalizationResponse, JudgeCalibrationMetric, ProjectStanding


@dataclass(frozen=True)
class ScoreMatrix:
    """Sparse multi-criteria scores in judge, submission, criterion order."""

    matrix: np.ndarray
    mask: np.ndarray
    judge_ids: tuple[str, ...]
    submission_ids: tuple[str, ...]
    criterion_keys: tuple[str, ...]


def parse_score_matrix(
    records: Sequence[Mapping[str, Any]],
    criterion_keys: Sequence[str],
) -> ScoreMatrix:
    """Convert raw score records into a deterministic ``[judge, submission, criterion]`` array."""
    keys = tuple(str(key) for key in criterion_keys)
    if not keys or any(not key for key in keys) or len(set(keys)) != len(keys):
        raise ValueError("criterion_keys must contain unique, non-empty values")

    parsed_records = []
    judge_ids = set()
    submission_ids = set()
    seen_evaluations = set()
    criterion_indexes = {key: index for index, key in enumerate(keys)}

    for record in records:
        if not isinstance(record, Mapping):
            raise TypeError("Each evaluation record must be a mapping")

        judge_id = _record_value(record, "judge_id", "judgeId")
        submission_id = _record_value(record, "submission_id", "submissionId")
        if judge_id is None or submission_id is None:
            raise ValueError("Each evaluation requires judge_id and submission_id")
        judge_id = str(judge_id)
        submission_id = str(submission_id)
        evaluation_key = (judge_id, submission_id)
        if evaluation_key in seen_evaluations:
            raise ValueError(f"Duplicate evaluation for judge {judge_id} and submission {submission_id}")
        seen_evaluations.add(evaluation_key)
        judge_ids.add(judge_id)
        submission_ids.add(submission_id)

        criterion_values = {}
        criteria = _record_value(record, "criteria_scores", "criteriaScores") or []
        for criterion in criteria:
            if not isinstance(criterion, Mapping):
                raise TypeError("Each criterion score must be a mapping")
            key = _record_value(criterion, "key", "criteriaName", "criteria_name")
            if key is None:
                raise ValueError("Each criterion score requires a criterion key")
            key = str(key)
            if key not in criterion_indexes:
                raise ValueError(f"Unknown criterion: {key}")
            if key in criterion_values:
                raise ValueError(f"Duplicate criterion {key} in evaluation")
            score = _record_value(criterion, "score", "rawScore", "raw_score")
            try:
                score = float(score)
            except (TypeError, ValueError) as error:
                raise ValueError(f"Invalid score for criterion {key}") from error
            if not np.isfinite(score) or not 1.0 <= score <= 10.0:
                raise ValueError(f"Score for criterion {key} must be between 1.0 and 10.0")
            criterion_values[key] = score
        parsed_records.append((judge_id, submission_id, criterion_values))

    ordered_judges = tuple(sorted(judge_ids))
    ordered_submissions = tuple(sorted(submission_ids))
    matrix = np.full(
        (len(ordered_judges), len(ordered_submissions), len(keys)),
        np.nan,
        dtype=float,
    )
    mask = np.zeros(matrix.shape, dtype=bool)
    judge_indexes = {judge_id: index for index, judge_id in enumerate(ordered_judges)}
    submission_indexes = {
        submission_id: index for index, submission_id in enumerate(ordered_submissions)
    }

    for judge_id, submission_id, scores in parsed_records:
        judge_index = judge_indexes[judge_id]
        submission_index = submission_indexes[submission_id]
        for key, score in scores.items():
            criterion_index = criterion_indexes[key]
            matrix[judge_index, submission_index, criterion_index] = score
            mask[judge_index, submission_index, criterion_index] = True

    return ScoreMatrix(
        matrix=matrix,
        mask=mask,
        judge_ids=ordered_judges,
        submission_ids=ordered_submissions,
        criterion_keys=keys,
    )


def _record_value(record: Mapping[str, Any], *names: str) -> Any:
    for name in names:
        if name in record:
            return record[name]
    return None


def calculate_mean(scores: Sequence[float]) -> float:
    """Return the arithmetic mean, preserving NumPy behavior for empty input."""
    return float(np.mean(scores))


def calculate_shrunk_mean(
    judge_mean: float,
    sample_size: int,
    global_mean: float,
    prior_k: float = 3.0,
) -> float:
    """Return an empirical-Bayes mean using ``prior_k`` pseudo-observations."""
    try:
        judge_mean = float(judge_mean)
        sample_size = float(sample_size)
        global_mean = float(global_mean)
        prior_k = float(prior_k)
    except (TypeError, ValueError) as error:
        raise ValueError("shrinkage parameters must be numeric") from error

    if not all(np.isfinite(value) for value in (judge_mean, sample_size, global_mean, prior_k)):
        raise ValueError("shrinkage parameters must be finite")
    if sample_size < 0:
        raise ValueError("sample_size must be non-negative")
    if prior_k < 0:
        raise ValueError("prior_k must be non-negative")
    if sample_size == 0:
        return global_mean

    return float(
        (sample_size * judge_mean + prior_k * global_mean)
        / (sample_size + prior_k)
    )


def calculate_sample_variance(scores: Sequence[float]) -> float:
    """Return sample variance with NumPy's nan result for fewer than two values."""
    return float(np.var(scores, ddof=1))


def calculate_sample_std(scores: Sequence[float]) -> float:
    """Return sample standard deviation with NumPy's nan result for fewer than two values."""
    return float(np.std(scores, ddof=1))


Z_SCORE_EPSILON = 1e-6


def calculate_z_scores(
    scores: np.ndarray,
    mask: np.ndarray | None = None,
) -> np.ndarray:
    """Normalize each judge's observed scores with sample standard deviation.

    Inputs may be one judge's scores, a ``[judge, submission]`` matrix, or the
    WBS-17 ``[judge, submission, criterion]`` matrix. Missing cells are kept as
    ``NaN`` and never participate in a judge's statistics.
    """
    values = np.asarray(scores, dtype=float)
    if values.ndim not in (1, 2, 3):
        raise ValueError("scores must be one-, two-, or three-dimensional")

    observed = np.isfinite(values) if mask is None else np.asarray(mask, dtype=bool)
    if observed.shape != values.shape:
        raise ValueError("mask must have the same shape as scores")

    result = np.full(values.shape, np.nan, dtype=float)
    if values.ndim == 1:
        groups = ((values, observed, result),)
    elif values.ndim == 2:
        groups = (
            (values[judge_index], observed[judge_index], result[judge_index])
            for judge_index in range(values.shape[0])
        )
    else:
        groups = (
            (values[judge_index, :, criterion_index],
             observed[judge_index, :, criterion_index],
             result[judge_index, :, criterion_index])
            for judge_index in range(values.shape[0])
            for criterion_index in range(values.shape[2])
        )

    for judge_scores, judge_mask, judge_result in groups:
        valid = judge_mask & np.isfinite(judge_scores)
        if np.count_nonzero(valid) < 2:
            continue
        observed_scores = judge_scores[valid]
        mean = calculate_mean(observed_scores)
        std = calculate_sample_std(observed_scores)
        judge_result[valid] = (observed_scores - mean) / (std + Z_SCORE_EPSILON)

    return result


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
