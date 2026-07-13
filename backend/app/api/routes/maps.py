import re
from collections.abc import Iterator
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from app.services.storage import StoragePaths

RANGE_PATTERN = re.compile(r"bytes=(\d*)-(\d*)$")
MEDIA_TYPE = "application/vnd.pmtiles"


def create_maps_router(paths: StoragePaths) -> APIRouter:
    router = APIRouter()

    @router.get("/api/maps/world.pmtiles")
    def world_map(request: Request):
        map_file = paths.map_file
        if map_file is None or not map_file.is_file():
            raise HTTPException(status_code=404, detail="Map package is not installed.")

        range_header = request.headers.get("range")
        if not range_header:
            return FileResponse(map_file, media_type=MEDIA_TYPE, headers={"Accept-Ranges": "bytes"})

        start, end = _parse_range(range_header, map_file.stat().st_size)
        length = end - start + 1
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{map_file.stat().st_size}",
            "Content-Length": str(length),
        }
        return StreamingResponse(
            _read_range(map_file, start, length),
            status_code=206,
            headers=headers,
            media_type=MEDIA_TYPE,
        )

    return router


def _parse_range(value: str, file_size: int) -> tuple[int, int]:
    match = RANGE_PATTERN.fullmatch(value)
    if not match:
        raise HTTPException(status_code=416, detail="Invalid map byte range.")
    start_text, end_text = match.groups()
    if not start_text:
        raise HTTPException(status_code=416, detail="Invalid map byte range.")
    start = int(start_text)
    end = int(end_text) if end_text else file_size - 1
    if start > end or start >= file_size:
        raise HTTPException(status_code=416, detail="Invalid map byte range.")
    return start, min(end, file_size - 1)


def _read_range(path: Path, start: int, length: int) -> Iterator[bytes]:
    remaining = length
    with path.open("rb") as file:
        file.seek(start)
        while remaining:
            chunk = file.read(min(64 * 1024, remaining))
            if not chunk:
                return
            remaining -= len(chunk)
            yield chunk
