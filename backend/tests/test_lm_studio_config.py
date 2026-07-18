import json

import httpx2

from app.services.lm_studio import DocumentExtractionContext, LmStudioClient, LmStudioRuntimeConfig

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

    client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", None, "A large protest occurred."), [], []
    )
    assert seen["host"] == "configured"
    assert seen["port"] == 5000
    assert seen["model"] == "chosen"

    # Changing what the provider returns changes the next call without rebuilding the client.
    state["config"] = LmStudioRuntimeConfig(base_url="http://switched:6000", model=None)
    client.extract_events(
        DocumentExtractionContext("Source", "2026-07-10", None, "A large protest occurred."), [], []
    )
    assert seen["host"] == "switched"
    assert seen["port"] == 6000
    assert seen["model"] == "discovered"


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
