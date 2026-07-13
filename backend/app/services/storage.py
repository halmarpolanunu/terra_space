from dataclasses import dataclass
from pathlib import Path
from typing import Literal

ServiceState = Literal["available", "missing", "offline", "error"]


@dataclass(frozen=True)
class StoragePaths:
    root: Path
    database: Path
    attachments: Path
    maps: Path
    logs: Path
    map_file: Path | None

    @classmethod
    def from_root(
        cls, root: Path, map_filename: str = "world-low-detail.pmtiles"
    ) -> "StoragePaths":
        root_path = root.resolve()
        maps = root_path / "maps"
        candidate = (maps / map_filename).resolve()
        map_file = candidate if candidate.parent == maps.resolve() else None
        return cls(
            root=root_path,
            database=root_path / "database" / "terra-space.db",
            attachments=root_path / "attachments",
            maps=maps,
            logs=root_path / "logs",
            map_file=map_file,
        )


@dataclass(frozen=True)
class StorageInspection:
    storage: ServiceState
    map: ServiceState


def ensure_storage(paths: StoragePaths) -> None:
    """Create only the local directories Terra Space owns."""
    for directory in (paths.database.parent, paths.attachments, paths.maps, paths.logs):
        directory.mkdir(parents=True, exist_ok=True)


def inspect_storage(paths: StoragePaths) -> StorageInspection:
    required_directories = (paths.database.parent, paths.attachments, paths.maps, paths.logs)
    storage = "available" if all(path.is_dir() for path in required_directories) else "error"
    map_state: ServiceState = (
        "available" if paths.map_file is not None and paths.map_file.is_file() else "missing"
    )
    return StorageInspection(storage=storage, map=map_state)
