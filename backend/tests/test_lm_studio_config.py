import json
from unittest.mock import patch

import httpx2

from app.services.lm_studio import DocumentExtractionContext, LmStudioClient, LmStudioRuntimeConfig

WELL_FORMED_CONTENT = json.dumps(
    {
        "candidates": [
            {
                "working_title": "Protest at capitol",
                "summary": "A large protest occurred.",
                "epistemic_status": "confirmed",
                "evidence_quote": "A large protest occurred.",
            }
        ]
    }
)


def test_client_targets_configured_base_url_and_model(monkeypatch=None) -> None:
    state = {"config": LmStudioRuntimeConfig(base_url="http://configured:5000", model="chosen")}
    seen: dict = {}

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen["host"] = request.url.host
        seen["port"] = request.url.port
        if request.url.path == "/v1/models":
            return httpx2.Response(200, json={"data": [{"id": "discovered"}]})
        body = json.loads(request.content)
        seen["model"] = body["model"]
        return httpx2.Response(200, json={"choices": [{"message": {"content": WELL_FORMED_CONTENT}}]})

    client = LmStudioClient(
        "http://ignored:1234",
        transport=httpx2.MockTransport(handler),
        config_provider=lambda: state["config"],
    )

    client.parse_signals(
        DocumentExtractionContext("Source", "2026-07-10", "A large protest occurred.")
    )
    assert seen["host"] == "configured"
    assert seen["port"] == 5000
    assert seen["model"] == "chosen"

    # Changing what the provider returns changes the next call without rebuilding the client.
    state["config"] = LmStudioRuntimeConfig(base_url="http://switched:6000", model=None)
    client.parse_signals(
        DocumentExtractionContext("Source", "2026-07-10", "A large protest occurred.")
    )
    assert seen["host"] == "switched"
    assert seen["port"] == 6000
    assert seen["model"] == "discovered"


def test_extraction_timeout_is_resolved_fresh_for_every_staged_pipeline_call() -> None:
    """The stored timeout applies per LM Studio call, not once for a whole document: each
    of the five staged calls independently resolves whatever the config provider currently
    returns, rather than sharing one budget fixed at the start of processing."""
    state = {"timeout": 120.0}
    seen_timeouts: list[float | None] = []
    original_client = httpx2.Client

    def spying_client(*args: object, **kwargs: object) -> httpx2.Client:
        seen_timeouts.append(kwargs.get("timeout"))  # type: ignore[arg-type]
        return original_client(*args, **kwargs)  # type: ignore[arg-type]

    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == "/v1/models":
            return httpx2.Response(200, json={"data": [{"id": "local-model"}]})
        body = json.loads(request.content)
        schema_name = body["response_format"]["json_schema"]["name"]
        responses = {
            "signal_parse_result": WELL_FORMED_CONTENT,
            "classified_event_type": json.dumps({"existing": None}),
            "classified_date": json.dumps(
                {"event_date": None, "event_date_precision": None}
            ),
            "classified_locations": json.dumps({"locations": []}),
            "classified_actors": json.dumps({"source_actors": [], "recipient_actors": []}),
        }
        return httpx2.Response(
            200, json={"choices": [{"message": {"content": responses[schema_name]}}]}
        )

    client = LmStudioClient(
        "http://ignored:1234",
        transport=httpx2.MockTransport(handler),
        config_provider=lambda: LmStudioRuntimeConfig(
            base_url="http://x:1234", model="local-model", extraction_timeout_seconds=state["timeout"]
        ),
    )
    document_context = DocumentExtractionContext(
        "Source", "2026-07-10", "A large protest occurred."
    )

    with patch("app.services.lm_studio.httpx2.Client", side_effect=spying_client):
        state["timeout"] = 120.0
        candidate = client.parse_signals(document_context).candidates[0]

        state["timeout"] = 300.0
        client.classify_event_type(document_context, candidate, [])

        state["timeout"] = 600.0
        client.classify_date(document_context, candidate)

        state["timeout"] = 120.0
        client.classify_locations(document_context, candidate)

        state["timeout"] = 300.0
        client.classify_actors(document_context, candidate, [])

    assert seen_timeouts == [120.0, 300.0, 600.0, 120.0, 300.0]


def test_check_connection_uses_the_configured_base_url() -> None:
    seen: dict = {}

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen["host"] = request.url.host
        return httpx2.Response(200, json={"data": [{"id": "local-model"}]})

    client = LmStudioClient(
        "http://ignored:1234",
        transport=httpx2.MockTransport(handler),
        config_provider=lambda: LmStudioRuntimeConfig(base_url="http://configured:5000", model=None),
    )

    assert client.check_connection() is True
    assert seen["host"] == "configured"


def test_list_available_models_returns_ids() -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        assert request.url.path == "/v1/models"
        return httpx2.Response(200, json={"data": [{"id": "a"}, {"id": "b"}]})

    client = LmStudioClient("http://x:1234", transport=httpx2.MockTransport(handler))

    assert client.list_available_models() == ["a", "b"]


def test_list_available_models_can_test_a_candidate_base_url() -> None:
    seen: dict = {}

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen["host"] = request.url.host
        return httpx2.Response(200, json={"data": [{"id": "a"}]})

    client = LmStudioClient("http://x:1234", transport=httpx2.MockTransport(handler))
    client.list_available_models("http://candidate:2222")

    assert seen["host"] == "candidate"
