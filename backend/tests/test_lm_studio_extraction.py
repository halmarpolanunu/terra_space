import json
from collections.abc import Callable

import httpx2
import pytest

from app.schemas.extraction import ExtractionResult
from app.services.lm_studio import (
    DocumentExtractionContext,
    KnownEventType,
    LmStudioClient,
    LmStudioResponseError,
    LmStudioUnavailableError,
)

WELL_FORMED_CONTENT = json.dumps(
    {
        "events": [
            {
                "title": "Protest at capitol",
                "summary": "A large protest occurred.",
                "event_type": {"existing": "Protest"},
                "event_date": "2026-07-10",
                "event_date_precision": "exact",
                "epistemic_status": "confirmed",
                "locations": [{"country": "ID", "admin1": None, "city_regency": "Jakarta"}],
                "actors": [{"name": "Students", "role": "source", "existing": False}],
                "evidence_quote": "A large protest occurred at the capitol.",
            }
        ]
    }
)


def _models_ok() -> httpx2.Response:
    return httpx2.Response(200, json={"data": [{"id": "local-model"}]})


def _chat_completion(content: str | bytes, *, as_json: bool = True) -> httpx2.Response:
    if as_json:
        return httpx2.Response(200, json={"choices": [{"message": {"content": content}}]})
    return httpx2.Response(200, content=content)


def _client_for(
    models_response: httpx2.Response | Callable[[httpx2.Request], httpx2.Response],
    chat_response: httpx2.Response | Callable[[httpx2.Request], httpx2.Response],
) -> LmStudioClient:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/v1/models":
            return models_response(request) if callable(models_response) else models_response
        if request.url.path == "/v1/chat/completions":
            return chat_response(request) if callable(chat_response) else chat_response
        raise AssertionError(f"unexpected path {request.url.path}")

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(handler))


def test_extract_events_returns_populated_result_for_well_formed_response() -> None:
    client = _client_for(_models_ok(), _chat_completion(WELL_FORMED_CONTENT))

    result = client.extract_events(
        DocumentExtractionContext(
            title="Protest report",
            publication_date="2026-07-10",
            content="A large protest occurred at the capitol.",
        ),
        [],
        [],
    )

    assert isinstance(result, ExtractionResult)
    assert len(result.events) == 1
    assert result.events[0].evidence_quote == "A large protest occurred at the capitol."
    assert result.events[0].event_type.existing == "Protest"
    assert result.events[0].event_date == "2026-07-10"


def test_extract_events_sends_labelled_source_metadata_and_date_grounding_rule() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(WELL_FORMED_CONTENT)

    client = _client_for(_models_ok(), chat)
    client.extract_events(
        DocumentExtractionContext(
            title="Naval blockade update",
            publication_date="2026-07-12",
            content="Evidence text.",
        ),
        [],
        [],
    )

    user_message = seen["messages"][1]["content"]
    assert "Source title: Naval blockade update" in user_message
    assert "Publication Date: 2026-07-12" in user_message
    assert "Document date:" not in user_message
    assert "Source content:\nEvidence text." in user_message
    assert "context only" in user_message
    assert "only when the source content and evidence quote support that event date" in user_message


def test_extract_events_only_allows_active_type_names_or_null() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(WELL_FORMED_CONTENT)

    client = _client_for(_models_ok(), chat)
    client.extract_events(
        DocumentExtractionContext(
            title="Protest report",
            publication_date="2026-07-10",
            content="A large protest occurred.",
        ),
        [
            KnownEventType(
                name="Protest",
                description="Collective public demonstration.",
                path="Security & Conflict > Signalling & Posture > Security Signalling > Protest",
            )
        ],
        [],
    )

    prompt = seen["messages"][0]["content"]
    assert '"name": "Protest"' in prompt
    assert '"description": "Collective public demonstration."' in prompt
    assert '"path": "Security & Conflict > Signalling & Posture > Security Signalling > Protest"' in prompt
    assert "classification context" in prompt
    assert "Use an exact supplied active event type name only when it fits." in prompt
    assert "Otherwise set existing to null." in prompt
    assert "Never invent, suggest, or describe a new event type." in prompt
    event_type_schema = seen["response_format"]["json_schema"]["schema"]["$defs"]["ExtractedEventType"]
    assert set(event_type_schema["properties"]) == {"existing"}


def test_extract_events_rejects_response_missing_required_fields() -> None:
    incomplete = json.dumps({"events": [{"title": "Missing required fields"}]})
    client = _client_for(_models_ok(), _chat_completion(incomplete))

    with pytest.raises(LmStudioResponseError):
        client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", "Some text."), [], []
        )


def test_extract_events_raises_typed_error_on_timeout() -> None:
    def raise_timeout(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.TimeoutException("timed out", request=request)

    client = LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(raise_timeout))

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", "Some text."), [], []
        )


def test_extract_events_raises_typed_error_on_connection_error() -> None:
    def raise_connect_error(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError("offline", request=request)

    client = LmStudioClient(
        "http://lm-studio:1234", transport=httpx2.MockTransport(raise_connect_error)
    )

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", "Some text."), [], []
        )


def test_extract_events_raises_typed_error_on_malformed_json() -> None:
    client = _client_for(_models_ok(), _chat_completion(b"not json", as_json=False))

    with pytest.raises(LmStudioResponseError):
        client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", "Some text."), [], []
        )


def test_extract_events_fails_when_no_model_is_loaded() -> None:
    client = _client_for(httpx2.Response(200, json={"data": []}), httpx2.Response(200, json={}))

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", "Some text."), [], []
        )
