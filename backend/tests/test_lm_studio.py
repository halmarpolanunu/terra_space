import httpx2

from app.services.lm_studio import LmStudioClient


def test_lm_studio_client_accepts_a_valid_models_response() -> None:
    transport = httpx2.MockTransport(
        lambda request: httpx2.Response(200, json={"data": [{"id": "local-model"}]})
    )

    client = LmStudioClient("http://lm-studio:1234", transport=transport)

    assert client.check_connection() is True


def test_lm_studio_client_reports_offline_for_connection_errors() -> None:
    def raise_connection_error(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ConnectError("offline", request=request)

    client = LmStudioClient(
        "http://lm-studio:1234", transport=httpx2.MockTransport(raise_connection_error)
    )

    assert client.check_connection() is False


def test_lm_studio_client_rejects_malformed_models_response() -> None:
    transport = httpx2.MockTransport(lambda request: httpx2.Response(200, json=["not-an-object"]))

    client = LmStudioClient("http://lm-studio:1234", transport=transport)

    assert client.check_connection() is False
