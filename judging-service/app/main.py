from fastapi import FastAPI

from .api.v1 import router as v1_router


app = FastAPI(
    title="Dogfood 2026 Judging Service",
    version="1.0.0",
)


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "judging-service"}


app.include_router(v1_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
