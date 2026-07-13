from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.services.storage import StoragePaths, ensure_storage


def test_map_route_explains_when_package_is_missing(tmp_path: Path) -> None:
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)

    response = TestClient(app).get("/api/maps/world.pmtiles")

    assert response.status_code == 404
    assert response.json() == {"detail": "Map package is not installed."}


def test_map_route_supports_byte_ranges(tmp_path: Path) -> None:
    paths = StoragePaths.from_root(tmp_path)
    ensure_storage(paths)
    assert paths.map_file is not None
    paths.map_file.write_bytes(bytes(range(256)))
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)

    response = TestClient(app).get("/api/maps/world.pmtiles", headers={"Range": "bytes=0-126"})

    assert response.status_code == 206
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-range"] == "bytes 0-126/256"
    assert response.content == bytes(range(127))
