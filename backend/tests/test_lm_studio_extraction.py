import json
from collections.abc import Callable

import httpx2
import pytest

from app.schemas.extraction import ExtractionResult
from app.services.lm_studio import (
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
                "start_date": "2026-07-10",
                "start_date_precision": "exact",
                "end_date": None,
                "end_date_precision": None,
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

    result = client.extract_events("A large protest occurred at the capitol.", [], [])

    assert isinstance(result, ExtractionResult)
    assert len(result.events) == 1
    assert result.events[0].evidence_quote == "A large protest occurred at the capitol."
    assert result.events[0].event_type.existing == "Protest"


def test_extract_events_sends_active_type_definitions_and_reuse_instruction() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(WELL_FORMED_CONTENT)

    client = _client_for(_models_ok(), chat)
    client.extract_events(
        "A large protest occurred.",
        [KnownEventType(name="Protest", description="Collective public demonstration.")],
        [],
    )

    prompt = seen["messages"][0]["content"]
    assert '"name": "Protest"' in prompt
    assert '"description": "Collective public demonstration."' in prompt
    assert "Only suggest a new event type when none of these definitions fits" in prompt


def test_extract_events_rejects_response_missing_required_fields() -> None:
    incomplete = json.dumps({"events": [{"title": "Missing required fields"}]})
    client = _client_for(_models_ok(), _chat_completion(incomplete))

    with pytest.raises(LmStudioResponseError):
        client.extract_events("Some text.", [], [])


def test_extract_events_raises_typed_error_on_timeout() -> None:
    def raise_timeout(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.TimeoutException("timed out", request=request)

    client = LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(raise_timeout))

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events("Some text.", [], [])


def test_extract_events_raises_typed_error_on_connection_error() -> None:
    def raise_connect_error(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError("offline", request=request)

    client = LmStudioClient(
        "http://lm-studio:1234", transport=httpx2.MockTransport(raise_connect_error)
    )

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events("Some text.", [], [])


def test_extract_events_raises_typed_error_on_malformed_json() -> None:
    client = _client_for(_models_ok(), _chat_completion(b"not json", as_json=False))

    with pytest.raises(LmStudioResponseError):
        client.extract_events("Some text.", [], [])


def test_extract_events_fails_when_no_model_is_loaded() -> None:
    client = _client_for(httpx2.Response(200, json={"data": []}), httpx2.Response(200, json={}))

    with pytest.raises(LmStudioUnavailableError):
        client.extract_events("Some text.", [], [])
