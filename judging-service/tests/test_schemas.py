import pytest
from pydantic import ValidationError

from app.schemas.normalization import NormalizationRequest


def test_normalization_request_accepts_contract_payload():
    request = NormalizationRequest(
        event_id="event-1",
        scores=[
            {
                "judge_id": "judge-1",
                "submission_id": "submission-1",
                "raw_composite_score": 8.5,
            }
        ],
        bayesian_prior_k=3.0,
    )

    assert request.scores[0].raw_composite_score == 8.5


def test_normalization_request_rejects_invalid_score():
    with pytest.raises(ValidationError):
        NormalizationRequest(
            event_id="event-1",
            scores=[
                {
                    "judge_id": "judge-1",
                    "submission_id": "submission-1",
                    "raw_composite_score": 11.0,
                }
            ],
        )
