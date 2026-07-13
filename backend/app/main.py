from collections.abc import Callable

from fastapi import FastAPI

from app.api.routes.health import create_health_router
from app.core.config import Settings
from app.services.lm_studio import LmStudioClient
from app.services.storage import StoragePaths, ensure_storage


def create_app(
    settings: Settings | None = None,
    lm_studio_check: Callable[[], bool] | None = None,
) -> FastAPI:
    settings = settings or Settings()
    paths = StoragePaths.from_root(settings.data_dir, settings.map_filename)
    ensure_storage(paths)

    app = FastAPI(title="Terra Space API")
    checker = lm_studio_check or LmStudioClient(settings.lm_studio_url).check_connection
    app.include_router(create_health_router(paths, checker))
    return app

app = create_app()
