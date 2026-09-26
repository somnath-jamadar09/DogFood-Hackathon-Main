from pydantic import BaseModel, Field


class ScoreInput(BaseModel):
    judge_id: str = Field(min_length=1)
    submission_id: str = Field(min_length=1)
    raw_composite_score: float = Field(ge=1.0, le=10.0)


class NormalizationRequest(BaseModel):
    event_id: str = Field(min_length=1)
    scores: list[ScoreInput]
    bayesian_prior_k: float = Field(default=3.0, gt=0.0)
