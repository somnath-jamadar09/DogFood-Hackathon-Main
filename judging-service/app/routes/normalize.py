from fastapi import APIRouter, HTTPException
from ..models.schemas import NormalizationRequest, NormalizationResponse
from ..algorithms.normalization import run_normalization

router = APIRouter(prefix="/api/v1", tags=["Normalization"])

@router.post("/normalize", response_model=NormalizationResponse)
def normalize_scores_endpoint(request: NormalizationRequest):
    try:
        response = run_normalization(request.scores, request.bayesian_prior_k)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Normalization execution failed: {str(e)}")
