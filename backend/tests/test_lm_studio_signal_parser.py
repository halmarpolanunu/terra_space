import json
from collections.abc import Callable

import httpx2
import pytest

from app.schemas.staged_extraction import SignalParseResult
from app.services.lm_studio import (
    DocumentExtractionContext,
    LmStudioClient,
    LmStudioResponseError,
    LmStudioUnavailableError,
)

WELL_FORMED_CONTENT = json.dumps(
    {
        "candidates": [
            {
                "working_title": "Naval blockade imposed",
                "summary": "The navy imposed a blockade on the ports.",
                "epistemic_status": "confirmed",
                "evidence_quote": "The navy imposed a blockade on the ports.",
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


def test_parse_signals_returns_populated_result_for_well_formed_response() -> None:
    client = _client_for(_models_ok(), _chat_completion(WELL_FORMED_CONTENT))

    result = client.parse_signals(
        DocumentExtractionContext(
            title="Naval blockade report",
            publication_date="2026-07-20",
            content="The navy imposed a blockade on the ports.",
        )
    )

    assert isinstance(result, SignalParseResult)
    assert len(result.candidates) == 1
    assert result.candidates[0].working_title == "Naval blockade imposed"
    assert result.candidates[0].epistemic_status == "confirmed"
    assert result.candidates[0].evidence_quote == "The navy imposed a blockade on the ports."


def test_parse_signals_sends_labelled_source_metadata_and_single_task_prompt() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(WELL_FORMED_CONTENT)

    client = _client_for(_models_ok(), chat)
    client.parse_signals(
        DocumentExtractionContext(
            title="Naval blockade report", publication_date="2026-07-20", content="Evidence text."
        )
    )

    user_message = seen["messages"][1]["content"]
    system_message = seen["messages"][0]["content"]
    assert "Source title: Naval blockade report" in user_message
    assert "Publication Date: 2026-07-20" in user_message
    assert "Source content:\nEvidence text." in user_message
    assert "signal candidates" in system_message
    assert "evidence_quote" in system_message
    schema = seen["response_format"]["json_schema"]["schema"]
    assert "candidates" in schema["properties"]


def test_parse_signals_rejects_response_missing_required_fields() -> None:
    incomplete = json.dumps({"candidates": [{"working_title": "Missing fields"}]})
    client = _client_for(_models_ok(), _chat_completion(incomplete))

    with pytest.raises(LmStudioResponseError):
        client.parse_signals(
            DocumentExtractionContext("Source", "2026-07-10", "Some text.")
        )


def test_parse_signals_raises_typed_error_on_timeout() -> None:
    def raise_timeout(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.TimeoutException("timed out", request=request)

    client = LmStudioClient("http://lm-studio:1234", transport=httpx2.MockTransport(raise_timeout))

    with pytest.raises(LmStudioUnavailableError):
        client.parse_signals(DocumentExtractionContext("Source", "2026-07-10", "Some text."))


def test_parse_signals_raises_typed_error_on_malformed_json() -> None:
    client = _client_for(_models_ok(), _chat_completion(b"not json", as_json=False))

    with pytest.raises(LmStudioResponseError):
        client.parse_signals(DocumentExtractionContext("Source", "2026-07-10", "Some text."))
