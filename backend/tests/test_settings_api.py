from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.lm_studio import LmStudioUnavailableError

DEFAULT_URL = "http://host.docker.internal:1234"


class FakeLmStudioClient:
    def __init__(self, models: list[str] | None = None, error: Exception | None = None) -> None:
        self._models = models or []
        self._error = error
        self.tested_base_url: str | None = "<unset>"

    def check_connection(self) -> bool:
        return True

    def list_available_models(self, base_url: str | None = None) -> list[str]:
        self.tested_base_url = base_url
        if self._error is not None:
            raise self._error
        return self._models


def _client(tmp_path: Path, fake: FakeLmStudioClient) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=fake,
    )
    return TestClient(app)


def test_get_settings_returns_the_seeded_default(tmp_path: Path) -> None:
    fake = FakeLmStudioClient()
    client = _client(tmp_path, fake)

    response = client.get("/api/settings")

    assert response.status_code == 200
    assert response.json() == {"lm_studio_base_url": DEFAULT_URL, "lm_studio_model": None}
    # Reading settings must not touch the network.
    assert fake.tested_base_url == "<unset>"


def test_patch_settings_updates_url_and_model(tmp_path: Path) -> None:
    client = _client(tmp_path, FakeLmStudioClient())

    response = client.patch(
        "/api/settings",
        json={"lm_studio_base_url": "http://127.0.0.1:4321", "lm_studio_model": "chosen"},
    )

    assert response.status_code == 200
    assert response.json() == {"lm_studio_base_url": "http://127.0.0.1:4321", "lm_studio_model": "chosen"}
    assert client.get("/api/settings").json()["lm_studio_model"] == "chosen"


def test_patch_settings_rejects_a_malformed_url(tmp_path: Path) -> None:
    client = _client(tmp_path, FakeLmStudioClient())

    response = client.patch("/api/settings", json={"lm_studio_base_url": "not-a-url"})

    assert response.status_code == 422


def test_patch_settings_can_clear_the_model(tmp_path: Path) -> None:
    client = _client(tmp_path, FakeLmStudioClient())
    client.patch("/api/settings", json={"lm_studio_model": "chosen"})

    response = client.patch("/api/settings", json={"lm_studio_model": None})

    assert response.status_code == 200
    assert response.json()["lm_studio_model"] is None


def test_connection_test_reports_available_models(tmp_path: Path) -> None:
    client = _client(tmp_path, FakeLmStudioClient(models=["model-a", "model-b"]))

    response = client.post("/api/settings/lm-studio/test", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["reachable"] is True
    assert body["models"] == ["model-a", "model-b"]


def test_connection_test_reports_offline(tmp_path: Path) -> None:
    client = _client(tmp_path, FakeLmStudioClient(error=LmStudioUnavailableError("offline")))

    response = client.post("/api/settings/lm-studio/test", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["reachable"] is False
    assert body["models"] == []
    assert body["message"]


def test_connection_test_uses_the_supplied_candidate_url(tmp_path: Path) -> None:
    fake = FakeLmStudioClient(models=["model-a"])
    client = _client(tmp_path, fake)

    response = client.post(
        "/api/settings/lm-studio/test", json={"base_url": "http://candidate:2222"}
    )

    assert response.status_code == 200
    assert fake.tested_base_url == "http://candidate:2222"
    # Testing a candidate must not change the stored settings.
    assert client.get("/api/settings").json()["lm_studio_base_url"] == DEFAULT_URL
