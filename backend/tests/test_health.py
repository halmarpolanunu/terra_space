from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health_reports_optional_services_without_preventing_startup(
    tmp_path: Path,
) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: False,
    )

    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "app": "available",
        "storage": "available",
        "map": "missing",
        "lm_studio": "offline",
    }
