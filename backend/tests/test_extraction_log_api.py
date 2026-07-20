from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def _client(tmp_path: Path) -> TestClient:
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)
    return TestClient(app)


def _create_document(client: TestClient) -> str:
    response = client.post(
        "/api/documents",
        json={
            "title": "Field report",
            "content": "Something happened on 2026-07-10.",
            "publication_date": "2026-07-10",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_get_extraction_log_returns_404_for_a_missing_document(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.get("/api/documents/does-not-exist/extraction-log")

    assert response.status_code == 404


def test_get_extraction_log_returns_an_empty_list_for_an_unprocessed_document(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path)
    document_id = _create_document(client)

    response = client.get(f"/api/documents/{document_id}/extraction-log")

    assert response.status_code == 200
    assert response.json() == []


def test_get_extraction_log_returns_entries_newest_first(tmp_path: Path) -> None:
    from app.db.models import Document
    from app.services.extraction_log import log_extraction

    client = _client(tmp_path)
    document_id = _create_document(client)

    app = client.app
    db = app.state.session_factory()
    try:
        document = db.get(Document, document_id)
        assert document is not None
        older = log_extraction(
            db,
            document_id=document_id,
            stage="signal_parser",
            outcome="ok",
            detail="Parsed 2 candidates.",
        )
        db.commit()
        older.created_at = older.created_at.replace(year=2020)
        db.commit()
        log_extraction(
            db,
            document_id=document_id,
            stage="locations",
            outcome="dropped",
            detail="Location text not grounded.",
            candidate_index=1,
        )
        db.commit()
    finally:
        db.close()

    response = client.get(f"/api/documents/{document_id}/extraction-log")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["stage"] == "locations"
    assert body[0]["outcome"] == "dropped"
    assert body[0]["candidate_index"] == 1
    assert body[1]["stage"] == "signal_parser"
    assert body[1]["candidate_index"] is None
