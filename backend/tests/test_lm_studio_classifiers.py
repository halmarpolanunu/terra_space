import json
from collections.abc import Callable

import httpx2
import pytest

from app.schemas.staged_extraction import (
    ClassifiedActors,
    ClassifiedDate,
    ClassifiedEventType,
    ClassifiedLocations,
    SignalCandidate,
)
from app.services.lm_studio import (
    DocumentExtractionContext,
    KnownEventType,
    LmStudioClient,
    LmStudioResponseError,
    LmStudioUnavailableError,
)

CANDIDATE = SignalCandidate(
    working_title="Naval blockade imposed",
    summary="The navy imposed a blockade on the ports.",
    epistemic_status="confirmed",
    evidence_quote="The navy imposed a blockade on the ports.",
)

DOCUMENT_CONTEXT = DocumentExtractionContext(
    title="Naval blockade report",
    publication_date="2026-07-20",
    content="The navy imposed a blockade on the ports. Talks are set for Friday.",
)


def _models_ok() -> httpx2.Response:
    return httpx2.Response(200, json={"data": [{"id": "local-model"}]})


def _chat_completion(content: str | bytes, *, as_json: bool = True) -> httpx2.Response:
    if as_json:
        return httpx2.Response(200, json={"choices": [{"message": {"content": content}}]})
    return httpx2.Response(200, content=content)


def _client_for(
    chat_response: httpx2.Response | Callable[[httpx2.Request], httpx2.Response],
) -> LmStudioClient:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/v1/models":
            return _models_ok()
        if request.url.path == "/v1/chat/completions":
            return chat_response(request) if callable(chat_response) else chat_response
        raise AssertionError(f"unexpected path {request.url.path}")

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(handler))


def _timeout_client() -> LmStudioClient:
    def raise_timeout(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.TimeoutException("timed out", request=request)

    return LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(raise_timeout))


# --- event type classifier ---------------------------------------------------------


def test_classify_event_type_returns_result_and_sends_candidate_context_and_known_types() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(json.dumps({"existing": "Armed Operation / Strike"}))

    client = _client_for(chat)
    known_types = [
        KnownEventType(
            name="Armed Operation / Strike",
            description="A kinetic strike.",
            path="Security & Conflict > ... > Armed Operation / Strike",
        )
    ]

    result = client.classify_event_type(DOCUMENT_CONTEXT, CANDIDATE, known_types)

    assert isinstance(result, ClassifiedEventType)
    assert result.existing == "Armed Operation / Strike"
    user_message = seen["messages"][1]["content"]
    assert "Naval blockade imposed" in user_message
    assert "The navy imposed a blockade on the ports." in user_message
    system_message = seen["messages"][0]["content"]
    assert '"name": "Armed Operation / Strike"' in system_message
    schema = seen["response_format"]["json_schema"]["schema"]
    assert set(schema["properties"]) == {"existing"}


def test_classify_event_type_raises_typed_error_on_timeout() -> None:
    with pytest.raises(LmStudioUnavailableError):
        _timeout_client().classify_event_type(DOCUMENT_CONTEXT, CANDIDATE, [])


def test_classify_event_type_raises_typed_error_on_schema_garbage() -> None:
    client = _client_for(_chat_completion(json.dumps({"existing": 123})))

    with pytest.raises(LmStudioResponseError):
        client.classify_event_type(DOCUMENT_CONTEXT, CANDIDATE, [])


# --- date classifier -----------------------------------------------------------------


def test_classify_date_returns_result_and_sends_publication_date_grounding_rule() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(
            json.dumps({"event_date": "2026-07-20", "event_date_precision": "exact"})
        )

    client = _client_for(chat)

    result = client.classify_date(DOCUMENT_CONTEXT, CANDIDATE)

    assert isinstance(result, ClassifiedDate)
    assert result.event_date == "2026-07-20"
    assert result.event_date_precision == "exact"
    user_message = seen["messages"][1]["content"]
    assert "Naval blockade imposed" in user_message
    assert "context only" in user_message


def test_classify_date_raises_typed_error_on_timeout() -> None:
    with pytest.raises(LmStudioUnavailableError):
        _timeout_client().classify_date(DOCUMENT_CONTEXT, CANDIDATE)


def test_classify_date_raises_typed_error_on_schema_garbage() -> None:
    client = _client_for(
        _chat_completion(json.dumps({"event_date": "2026-07-20", "event_date_precision": None}))
    )

    with pytest.raises(LmStudioResponseError):
        client.classify_date(DOCUMENT_CONTEXT, CANDIDATE)


# --- locations classifier -------------------------------------------------------------


def test_classify_locations_returns_result_and_sends_candidate_context() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(
            json.dumps(
                {"locations": [{"country": "IRN", "admin1": None, "city_regency": None}]}
            )
        )

    client = _client_for(chat)

    result = client.classify_locations(DOCUMENT_CONTEXT, CANDIDATE)

    assert isinstance(result, ClassifiedLocations)
    assert len(result.locations) == 1
    assert result.locations[0].country == "IRN"
    user_message = seen["messages"][1]["content"]
    assert "Naval blockade imposed" in user_message
    system_message = seen["messages"][0]["content"]
    assert "alpha-3" in system_message


def test_classify_locations_raises_typed_error_on_timeout() -> None:
    with pytest.raises(LmStudioUnavailableError):
        _timeout_client().classify_locations(DOCUMENT_CONTEXT, CANDIDATE)


def test_classify_locations_raises_typed_error_on_schema_garbage() -> None:
    client = _client_for(_chat_completion(json.dumps({"locations": [{"country": 123}]})))

    with pytest.raises(LmStudioResponseError):
        client.classify_locations(DOCUMENT_CONTEXT, CANDIDATE)


# --- actors classifier -----------------------------------------------------------------


def test_classify_actors_returns_result_and_sends_known_actors() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(
            json.dumps({"source_actors": ["Navy"], "recipient_actors": ["Merchant ships"]})
        )

    client = _client_for(chat)

    result = client.classify_actors(DOCUMENT_CONTEXT, CANDIDATE, ["Navy"])

    assert isinstance(result, ClassifiedActors)
    assert result.source_actors == ["Navy"]
    assert result.recipient_actors == ["Merchant ships"]
    system_message = seen["messages"][0]["content"]
    assert "Known actors: Navy" in system_message


def test_classify_actors_raises_typed_error_on_timeout() -> None:
    with pytest.raises(LmStudioUnavailableError):
        _timeout_client().classify_actors(DOCUMENT_CONTEXT, CANDIDATE, [])


def test_classify_actors_raises_typed_error_on_schema_garbage() -> None:
    client = _client_for(_chat_completion(json.dumps({"source_actors": "not a list"})))

    with pytest.raises(LmStudioResponseError):
        client.classify_actors(DOCUMENT_CONTEXT, CANDIDATE, [])
