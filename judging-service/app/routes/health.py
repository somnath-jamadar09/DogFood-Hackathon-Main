from fastapi import APIRouter
import time

router = APIRouter(tags=["Health"])

START_TIME = time.time()

@router.get("/health")
def healthcheck():
    return {
        "status": "healthy",
        "service": "dogfood-judging-service",
        "uptime_seconds": int(time.time() - START_TIME),
        "algorithms": [
            "z_score_normalization",
            "empirical_bayesian_shrinkage",
            "bradley_terry_pairwise",
            "voting_anomaly_detector"
        ],
        "air_gapped": True
    }
