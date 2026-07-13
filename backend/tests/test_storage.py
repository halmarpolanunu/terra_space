from pathlib import Path

from app.services.storage import StoragePaths, ensure_storage, inspect_storage


def test_ensure_storage_creates_required_directories(tmp_path: Path) -> None:
    paths = StoragePaths.from_root(tmp_path)

    ensure_storage(paths)

    assert paths.database.parent.is_dir()
    assert paths.attachments.is_dir()
    assert paths.maps.is_dir()
    assert paths.logs.is_dir()


def test_storage_health_reports_missing_map(tmp_path: Path) -> None:
    paths = StoragePaths.from_root(tmp_path)
    ensure_storage(paths)

    result = inspect_storage(paths)

    assert result.storage == "available"
    assert result.map == "missing"


def test_storage_paths_reject_map_names_outside_data_root(tmp_path: Path) -> None:
    paths = StoragePaths.from_root(tmp_path, map_filename="../outside.pmtiles")

    assert paths.map_file is None
