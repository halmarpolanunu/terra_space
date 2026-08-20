from collections.abc import Callable

from fastapi import FastAPI

from app.api.routes.actors import create_actors_router
from app.api.routes.documents import create_documents_router
from app.api.routes.events import create_events_router
from app.api.routes.health import create_health_router
from app.api.routes.issues import create_issues_router
from app.api.routes.maps import create_maps_router
from app.api.routes.settings import create_settings_router
from app.api.routes.supabase_bridge import create_supabase_bridge_router
from app.core.config import Settings
from app.db.session import create_session_factory
from app.db.supabase_bridge import create_supabase_read_only_engine
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
    if settings.database_url is None:
        raise RuntimeError(
            "TERRA_DATABASE_URL is not set. Terra Space needs a database connection string to "
            "start -- point it at your local Supabase/PostgreSQL instance (see .env.example "
            "and project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md). "
            "Tests may pass Settings(database_url=\"sqlite:///...\") explicitly instead."
        )
    session_factory = create_session_factory(settings.database_url)

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
    app.include_router(create_documents_router(session_factory, paths))
    app.include_router(create_events_router(session_factory))
    app.include_router(create_actors_router(session_factory))
    app.include_router(
        create_settings_router(session_factory, lm_studio_client, settings.lm_studio_url)
    )
    supabase_engine = (
        create_supabase_read_only_engine(settings.supabase_url) if settings.supabase_url else None
    )
    app.state.supabase_engine = supabase_engine
    app.include_router(create_supabase_bridge_router(supabase_engine))
    app.include_router(create_issues_router(supabase_engine))
    return app

app = create_app()
