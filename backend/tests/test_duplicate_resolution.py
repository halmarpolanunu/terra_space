from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.schemas.extraction import ExtractedActor, ExtractedEvent, ExtractedEventType, ExtractionResult
from app.services.lm_studio import KnownEventType


class FakeLmStudioClient:
    def __init__(self, outcomes: dict[str, ExtractionResult]) -> None:
        self._outcomes = outcomes

    def extract_events(
        self,
        document_text: str,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> ExtractionResult:
        return self._outcomes[document_text]


def _client(tmp_path: Path, outcomes: dict[str, ExtractionResult]) -> TestClient:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=FakeLmStudioClient(outcomes),
    )
    return TestClient(app)


def _process(client: TestClient, content: str) -> dict:
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-10"},
    ).json()
    process_response = client.post(
        "/api/documents/process", json={"document_ids": [document["id"]]}
    )
    assert process_response.status_code == 202
    return document


def _attack_extraction(content: str, start_date: str) -> ExtractionResult:
    return ExtractionResult(
        events=[
            ExtractedEvent(
                title="Depot attack",
                summary="A militia group attacked a fuel depot.",
                event_type=ExtractedEventType(suggested="Attack"),
                epistemic_status="claim",
                evidence_quote=content,
                start_date=start_date,
                actors=[ExtractedActor(name="Local Militia", role="source", existing=False)],
            )
        ]
    )


def _setup_flagged_pair(
    client: TestClient, content_a: str, content_b: str
) -> tuple[dict, dict, dict]:
    """Approve an event from document A, then process document B so it gets
    automatically flagged as a possible duplicate of A's approved event."""
    doc_a = _process(client, content_a)
    event_a = client.get(f"/api/documents/{doc_a['id']}/events").json()[0]
    described = client.patch(
        f"/api/event-types/{event_a['event_type']['id']}",
        json={"description": "Use for attacks against a target."},
    )
    assert described.status_code == 200
    approved = client.post(f"/api/events/{event_a['id']}/approve")
    assert approved.status_code == 200

    doc_b = _process(client, content_b)
    event_b = client.get(f"/api/documents/{doc_b['id']}/events").json()[0]
    assert len(event_b["duplicate_flags"]) == 1
    return doc_b, event_b, approved.json()


def test_kept_separate_resolves_flag_without_changing_the_draft_event(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(
        tmp_path,
        {
            content_a: _attack_extraction(content_a, "2026-07-10"),
            content_b: _attack_extraction(content_b, "2026-07-11"),
        },
    )
    _, event_b, _ = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]

    response = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["review_status"] == "draft"
    assert body["duplicate_flags"][0]["resolution"] == "kept_separate"
    assert body["duplicate_flags"][0]["resolved_at"] is not None
    assert len(body["sources"]) == 1

    approve_response = client.post(f"/api/events/{event_b['id']}/approve")
    assert approve_response.status_code == 200


def test_linked_merges_draft_event_into_matched_approved_event(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(
        tmp_path,
        {
            content_a: _attack_extraction(content_a, "2026-07-10"),
            content_b: _attack_extraction(content_b, "2026-07-11"),
        },
    )
    _, event_b, event_a = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]
    assert flag["matched_event_id"] == event_a["id"]

    response = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "linked"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["review_status"] == "merged"
    assert body["duplicate_flags"][0]["resolution"] == "linked"
    assert body["sources"] == []

    matched = client.get(f"/api/events/{event_a['id']}").json()
    assert len(matched["sources"]) == 2
    assert content_b in {source["evidence_quote"] for source in matched["sources"]}


def test_resolving_already_resolved_flag_returns_409(tmp_path: Path) -> None:
    content_a = "A local militia attacked the fuel depot on 2026-07-10."
    content_b = "A local militia attacked the fuel depot again on 2026-07-11."
    client = _client(
        tmp_path,
        {
            content_a: _attack_extraction(content_a, "2026-07-10"),
            content_b: _attack_extraction(content_b, "2026-07-11"),
        },
    )
    _, event_b, _ = _setup_flagged_pair(client, content_a, content_b)
    flag = event_b["duplicate_flags"][0]

    first = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/events/{event_b['id']}/duplicate-flags/{flag['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert second.status_code == 409


def test_resolving_a_flag_that_belongs_to_a_different_event_returns_404(tmp_path: Path) -> None:
    content_a1 = "A local militia attacked the depot in the north on 2026-07-10."
    content_b1 = "A local militia attacked the depot in the north again on 2026-07-11."
    content_a2 = "A separate militia attacked a depot in the south on 2026-08-01."
    content_b2 = "A separate militia attacked a depot in the south again on 2026-08-02."
    client = _client(
        tmp_path,
        {
            content_a1: _attack_extraction(content_a1, "2026-07-10"),
            content_b1: _attack_extraction(content_b1, "2026-07-11"),
            content_a2: _attack_extraction(content_a2, "2026-08-01"),
            content_b2: _attack_extraction(content_b2, "2026-08-02"),
        },
    )
    _, event_b1, _ = _setup_flagged_pair(client, content_a1, content_b1)
    _, event_b2, _ = _setup_flagged_pair(client, content_a2, content_b2)
    flag_from_pair_one = event_b1["duplicate_flags"][0]

    response = client.post(
        f"/api/events/{event_b2['id']}/duplicate-flags/{flag_from_pair_one['id']}/resolve",
        json={"resolution": "kept_separate"},
    )
    assert response.status_code == 404
