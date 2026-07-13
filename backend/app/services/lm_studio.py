import httpx2


class LmStudioClient:
    """Small local-only client used to check LM Studio availability."""

    def __init__(
        self, base_url: str, transport: httpx2.BaseTransport | None = None
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._transport = transport

    def check_connection(self) -> bool:
        try:
            with httpx2.Client(
                base_url=self._base_url, timeout=2.0, transport=self._transport
            ) as client:
                response = client.get("/v1/models")
                if not response.is_success:
                    return False
                payload = response.json()
        except (httpx2.HTTPError, ValueError):
            return False
        return isinstance(payload, dict) and isinstance(payload.get("data"), list)
