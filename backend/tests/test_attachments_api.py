import hashlib
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753"
    "de0000000c4944415478da6360606060000000050001a5f645400000000049454e44ae426082"
)


def _client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(settings=Settings(data_dir=tmp_path), lm_studio_check=lambda: True))


def _draft_document(client: TestClient) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": "Doc", "content": "Body text.", "publication_date": "2026-07-10"},
    )
    assert response.status_code == 201
    return response.json()


def test_upload_valid_image_creates_file_and_matching_checksum(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)

    response = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["original_name"] == "photo.png"
    assert body["media_type"] == "image/png"
    assert body["size_bytes"] == len(PNG_BYTES)

    stored_files = list((tmp_path / "attachments").glob("*"))
    assert len(stored_files) == 1
    assert stored_files[0].read_bytes() == PNG_BYTES

    get_response = client.get(f"/api/documents/{document['id']}")
    attachments = get_response.json()["attachments"]
    assert len(attachments) == 1
    assert attachments[0]["id"] == body["id"]


def test_upload_rejects_non_image_content_type_and_writes_no_file(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)

    response = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 422
    assert list((tmp_path / "attachments").glob("*")) == []


def test_upload_rejects_file_over_size_cap_and_writes_no_file(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    oversized = b"\x00" * (10 * 1024 * 1024 + 1)

    response = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("big.png", oversized, "image/png")},
    )

    assert response.status_code == 422
    assert list((tmp_path / "attachments").glob("*")) == []


def test_upload_blocked_when_document_not_editable(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    app = client.app
    with app.state.session_factory() as session:
        from app.db.models import Document

        record = session.get(Document, document["id"])
        record.processing_status = "processing"
        session.commit()

    response = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 409


def test_get_attachment_file_streams_original_bytes(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    uploaded = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    ).json()

    response = client.get(
        f"/api/documents/{document['id']}/attachments/{uploaded['id']}/file"
    )

    assert response.status_code == 200
    assert response.content == PNG_BYTES
    assert response.headers["content-type"] == "image/png"


def test_get_attachment_file_404s_for_unknown_or_mismatched_document(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    other_document = _draft_document(client)
    uploaded = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    ).json()

    assert client.get(f"/api/documents/{document['id']}/attachments/missing/file").status_code == 404
    assert (
        client.get(
            f"/api/documents/{other_document['id']}/attachments/{uploaded['id']}/file"
        ).status_code
        == 404
    )


def test_delete_attachment_removes_row_and_file(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    uploaded = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    ).json()

    response = client.delete(
        f"/api/documents/{document['id']}/attachments/{uploaded['id']}"
    )

    assert response.status_code == 204
    assert list((tmp_path / "attachments").glob("*")) == []
    assert client.get(f"/api/documents/{document['id']}").json()["attachments"] == []


def test_delete_attachment_404_for_unknown_id(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)

    response = client.delete(f"/api/documents/{document['id']}/attachments/missing")

    assert response.status_code == 404


def test_delete_attachment_blocked_when_document_not_editable(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    uploaded = client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    ).json()
    app = client.app
    with app.state.session_factory() as session:
        from app.db.models import Document

        record = session.get(Document, document["id"])
        record.processing_status = "completed"
        session.commit()

    response = client.delete(
        f"/api/documents/{document['id']}/attachments/{uploaded['id']}"
    )

    assert response.status_code == 409


def test_deleting_document_removes_its_attachment_files(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )

    response = client.delete(f"/api/documents/{document['id']}")

    assert response.status_code == 204
    assert list((tmp_path / "attachments").glob("*")) == []


def test_checksum_matches_sha256_of_file_contents(tmp_path: Path) -> None:
    client = _client(tmp_path)
    document = _draft_document(client)
    app = client.app

    client.post(
        f"/api/documents/{document['id']}/attachments",
        files={"file": ("photo.png", PNG_BYTES, "image/png")},
    )

    from app.db.models import Attachment

    with app.state.session_factory() as session:
        attachment = session.query(Attachment).one()
        assert attachment.checksum == hashlib.sha256(PNG_BYTES).hexdigest()
