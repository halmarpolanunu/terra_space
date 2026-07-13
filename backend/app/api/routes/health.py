from collections.abc import Callable

from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.services.storage import StoragePaths, inspect_storage


def create_health_router(
    paths: StoragePaths, lm_studio_check: Callable[[], bool]
) -> APIRouter:
    router = APIRouter()

    @router.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        storage = inspect_storage(paths)
        try:
            lm_studio = "available" if lm_studio_check() else "offline"
        except Exception:
            lm_studio = "error"
        return HealthResponse(
            app="available",
            storage=storage.storage,
            map=storage.map,
            lm_studio=lm_studio,
        )

    return router
