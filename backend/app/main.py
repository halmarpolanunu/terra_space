from collections.abc import Callable

from fastapi import FastAPI

from app.api.routes.documents import create_documents_router
from app.api.routes.events import create_events_router
from app.api.routes.health import create_health_router
from app.api.routes.maps import create_maps_router
from app.api.routes.processing import create_processing_router
from app.core.config import Settings
from app.db.session import create_session_factory
from app.services.lm_studio import LmStudioClient, LmStudioRuntimeConfig
from app.services.settings import effective_lm_studio_config
from app.services.storage import StoragePaths, ensure_storage


def create_app(
    settings: Settings | None = None,
    lm_studio_check: Callable[[], bool] | None = None,
    lm_studio_client: LmStudioClient | None = None,
) -> FastAPI:
    settings = settings or Settings()
    paths = StoragePaths.from_root(settings.data_dir, settings.map_filename)
    ensure_storage(paths)
    session_factory = create_session_factory(f"sqlite:///{paths.database}")

    def lm_studio_config_provider() -> LmStudioRuntimeConfig:
        db = session_factory()
        try:
            return effective_lm_studio_config(db, settings.lm_studio_url)
        finally:
            db.close()

    lm_studio_client = lm_studio_client or LmStudioClient(
        settings.lm_studio_url, config_provider=lm_studio_config_provider
    )

    app = FastAPI(title="Terra Space API")
    app.state.session_factory = session_factory
    checker = lm_studio_check or lm_studio_client.check_connection
    app.include_router(create_health_router(paths, checker))
    app.include_router(create_maps_router(paths))
    app.include_router(create_documents_router(session_factory))
    app.include_router(create_processing_router(session_factory, lm_studio_client))
    app.include_router(create_events_router(session_factory))
    return app

app = create_app()
