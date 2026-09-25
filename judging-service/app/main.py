from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.health import router as health_router
from .routes.normalize import router as normalize_router
from .routes.pairwise import router as pairwise_router

app = FastAPI(
    title="Dogfood 2026 — Judging Analytics Microservice",
    description="Mathematical scoring normalization, Bayesian shrinkage, Bradley-Terry ranking, and voting anomaly detection.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(normalize_router)
app.include_router(pairwise_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
