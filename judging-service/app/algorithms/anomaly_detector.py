import numpy as np
from typing import List
from ..models.schemas import AnomalyDetectionResponse

def detect_voting_anomalies(
    submission_id: str,
    timestamps: List[float],
    window_seconds: float = 60.0,
    velocity_threshold: int = 15
) -> AnomalyDetectionResponse:
    if not timestamps or len(timestamps) < 2:
        return AnomalyDetectionResponse(
            submission_id=submission_id,
            is_anomalous=False,
            peak_velocity=len(timestamps),
            entropy=1.0,
            message="Insufficient voting data to detect anomalies."
        )

    # Sort timestamps
    sorted_ts = sorted(timestamps)

    # Compute sliding window velocity
    peak_velocity = 0
    left = 0
    for right in range(len(sorted_ts)):
        while sorted_ts[right] - sorted_ts[left] > window_seconds:
            left += 1
        current_window_count = right - left + 1
        if current_window_count > peak_velocity:
            peak_velocity = current_window_count

    # Compute inter-arrival time intervals
    intervals = np.diff(sorted_ts)
    if len(intervals) > 0 and np.sum(intervals) > 0:
        # Discretize intervals into bins to compute Shannon entropy
        hist, _ = np.histogram(intervals, bins=min(10, max(2, len(intervals))))
        probs = hist / np.sum(hist)
        # Filter 0
        probs = probs[probs > 0]
        entropy = -float(np.sum(probs * np.log2(probs)))
    else:
        entropy = 0.0

    # Flag condition: velocity exceeds threshold or unnaturally zero entropy (automated script)
    is_velocity_anomalous = peak_velocity >= velocity_threshold
    is_entropy_anomalous = len(intervals) > 10 and entropy < 0.2

    is_anomalous = is_velocity_anomalous or is_entropy_anomalous

    if is_velocity_anomalous:
        msg = f"Alert: Rapid velocity spike detected ({peak_velocity} votes within {int(window_seconds)}s)."
    elif is_entropy_anomalous:
        msg = "Alert: Unnatural timestamp periodicity detected (possible bot attack)."
    else:
        msg = "Voting velocity pattern is normal."

    return AnomalyDetectionResponse(
        submission_id=submission_id,
        is_anomalous=is_anomalous,
        peak_velocity=peak_velocity,
        entropy=round(entropy, 3),
        message=msg
    )
