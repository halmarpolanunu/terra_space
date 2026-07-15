from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.schemas.settings import (
    LmStudioTestRequest,
    LmStudioTestResult,
    SettingsRead,
    SettingsUpdate,
)
from app.services.lm_studio import ExtractionError
from app.services.settings import (
    InvalidSettingsError,
    get_settings,
    update_settings,
)


def create_settings_router(
    session_factory: sessionmaker, lm_studio_client, default_base_url: str
) -> APIRouter:
    router = APIRouter()

    def get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    @router.get("/api/settings", response_model=SettingsRead)
    def read(db: Session = Depends(get_db)) -> SettingsRead:
        return SettingsRead.model_validate(get_settings(db, default_base_url))

    @router.patch("/api/settings", response_model=SettingsRead)
    def update(payload: SettingsUpdate, db: Session = Depends(get_db)) -> SettingsRead:
        kwargs = {}
        if "lm_studio_base_url" in payload.model_fields_set:
            kwargs["base_url"] = payload.lm_studio_base_url
        if "lm_studio_model" in payload.model_fields_set:
            kwargs["model"] = payload.lm_studio_model
        if "lm_studio_extraction_timeout_seconds" in payload.model_fields_set:
            kwargs["extraction_timeout_seconds"] = payload.lm_studio_extraction_timeout_seconds
        try:
            row = update_settings(db, default_base_url, **kwargs)
        except InvalidSettingsError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return SettingsRead.model_validate(row)

    @router.post("/api/settings/lm-studio/test", response_model=LmStudioTestResult)
    def test_connection(
        payload: LmStudioTestRequest, db: Session = Depends(get_db)
    ) -> LmStudioTestResult:
        base_url = payload.base_url
        if base_url is None:
            base_url = get_settings(db, default_base_url).lm_studio_base_url
        try:
            models = lm_studio_client.list_available_models(base_url)
        except ExtractionError:
            return LmStudioTestResult(
                reachable=False, models=[], message="LM Studio is offline or unreachable."
            )
        if not models:
            return LmStudioTestResult(
                reachable=True, models=[], message="Connected, but no model is loaded."
            )
        return LmStudioTestResult(
            reachable=True,
            models=models,
            message=f"Connected. {len(models)} model(s) available.",
        )

    return router
