# judging-service/app/routes/__init__.py
from .health import router as health_router
from .normalize import router as normalize_router
from .pairwise import router as pairwise_router

__all__ = ["health_router", "normalize_router", "pairwise_router"]
