from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Document
from app.main import create_app


def _client(tmp_path: Path) -> TestClient:
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)
    return TestClient(app)


def _valid_payload(**overrides: object) -> dict:
    payload = {
        "title": "Field report",
        "content": "Something happened on 2026-07-10 in the capital.",
        "publication_date": "2026-07-10",
    }
    payload.update(overrides)
    return payload


def test_create_document_requires_title_content_and_publication_date(tmp_path: Path) -> None:
    client = _client(tmp_path)

    for missing in ("title", "content", "publication_date"):
        payload = _valid_payload()
        del payload[missing]
        response = client.post("/api/documents", json=payload)
        assert response.status_code == 422, missing


def test_create_document_rejects_a_blank_publication_date(tmp_path: Path) -> None:
    client = _client(tmp_path)

    response = client.post("/api/documents", json=_valid_payload(publication_date="   "))

    assert response.status_code == 422


def test_create_document_exposes_required_publication_date_and_optional_source_url(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path)

    response = client.post("/api/documents", json=_valid_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["publication_date"] == "2026-07-10"
    assert "document_date" not in body
    assert body["source_url"] is None


def test_create_document_sets_input_date_automatically_and_starts_as_draft(
    tmp_path: Path,
) -> None:
    client = _client(tmp_path)

    response = client.post("/api/documents", json=_valid_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["input_date"] is not None
    assert body["processing_status"] == "draft"
    assert body["processing_error"] is None


def test_list_documents_filters_by_processing_status(tmp_path: Path) -> None:
    client = _client(tmp_path)
    client.post("/api/documents", json=_valid_payload(title="Draft one"))

    response = client.get("/api/documents", params={"processing_status": "draft"})
    assert response.status_code == 200
    titles = {doc["title"] for doc in response.json()}
    assert "Draft one" in titles

    response = client.get("/api/documents", params={"processing_status": "completed"})
    assert response.status_code == 200
    assert response.json() == []


def test_get_document_by_id_and_404_when_missing(tmp_path: Path) -> None:
    client = _client(tmp_path)
    created = client.post("/api/documents", json=_valid_payload()).json()

    response = client.get(f"/api/documents/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]

    response = client.get("/api/documents/does-not-exist")
    assert response.status_code == 404


def test_editing_draft_or_failed_document_succeeds(tmp_path: Path) -> None:
    client = _client(tmp_path)
    created = client.post("/api/documents", json=_valid_payload()).json()

    response = client.patch(f"/api/documents/{created['id']}", json={"title": "Updated title"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated title"


def test_editing_document_rejects_a_null_publication_date(tmp_path: Path) -> None:
    client = _client(tmp_path)
    created = client.post("/api/documents", json=_valid_payload()).json()

    response = client.patch(
        f"/api/documents/{created['id']}", json={"publication_date": None}
    )

    assert response.status_code == 422


def test_editing_document_rejects_a_blank_publication_date(tmp_path: Path) -> None:
    client = _client(tmp_path)
    created = client.post("/api/documents", json=_valid_payload()).json()

    response = client.patch(
        f"/api/documents/{created['id']}", json={"publication_date": "  "}
    )

    assert response.status_code == 422


def test_editing_queued_or_processing_document_returns_409(tmp_path: Path) -> None:
    app = create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: False)
    client = TestClient(app)
    created = client.post("/api/documents", json=_valid_payload()).json()

    with app.state.session_factory() as session:
        document = session.get(Document, created["id"])
        document.processing_status = "processing"
        session.commit()

    response = client.patch(f"/api/documents/{created['id']}", json={"title": "Nope"})
    assert response.status_code == 409


def test_delete_document_removes_it(tmp_path: Path) -> None:
    client = _client(tmp_path)
    created = client.post("/api/documents", json=_valid_payload()).json()

    response = client.delete(f"/api/documents/{created['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/documents/{created['id']}")
    assert response.status_code == 404
