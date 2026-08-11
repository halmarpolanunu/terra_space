import httpx2

from app.services.lm_studio import LmStudioClient, LmStudioRuntimeConfig


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
