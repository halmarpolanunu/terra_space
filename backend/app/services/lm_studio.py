"""A thin, local-only LM Studio connectivity client.

The staged extraction pipeline that used to live here (parse_signals/classify_event_type/
classify_date/classify_locations/classify_actors and their request-building helpers) was retired
when Terra Space's application moved to Supabase as its source of truth -- the n8n Phase 1-3
workflows already do all event extraction now (see
project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md and decisions/
Automated-Final-Event-Record-Pipeline.md). What remains here is only what Settings' "Test
connection" feature and the app's own health/offline check still need: can LM Studio be reached,
and what models does it report.
"""

from collections.abc import Callable
from dataclasses import dataclass

import httpx2


@dataclass(frozen=True)
class LmStudioRuntimeConfig:
    """The base URL and preferred model to use for the next LM Studio call."""

    base_url: str
    model: str | None
    extraction_timeout_seconds: float = 300.0


class ExtractionError(Exception):
    """Base class for LM Studio connectivity failures."""


class LmStudioUnavailableError(ExtractionError):
    """LM Studio is unreachable, timed out, or has no model loaded."""


class LmStudioResponseError(ExtractionError):
    """LM Studio responded, but the payload could not be used."""


class LmStudioClient:
    """Local-only client for checking LM Studio availability."""

    def __init__(
        self,
        base_url: str,
        transport: httpx2.BaseTransport | None = None,
        extraction_timeout: float = 300.0,
        config_provider: Callable[[], LmStudioRuntimeConfig] | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._transport = transport
        self._extraction_timeout = extraction_timeout
        self._config_provider = config_provider

    def _resolve(self) -> LmStudioRuntimeConfig:
        if self._config_provider is not None:
            config = self._config_provider()
            return LmStudioRuntimeConfig(
                base_url=config.base_url.rstrip("/"),
                model=config.model,
                extraction_timeout_seconds=config.extraction_timeout_seconds,
            )
        return LmStudioRuntimeConfig(
            base_url=self._base_url,
            model=None,
            extraction_timeout_seconds=self._extraction_timeout,
        )

    def check_connection(self) -> bool:
        try:
            with httpx2.Client(
                base_url=self._resolve().base_url, timeout=2.0, transport=self._transport
            ) as client:
                response = client.get("/v1/models")
                if not response.is_success:
                    return False
                payload = response.json()
        except (httpx2.HTTPError, ValueError):
            return False
        return isinstance(payload, dict) and isinstance(payload.get("data"), list)

    def list_available_models(self, base_url: str | None = None) -> list[str]:
        """Return the ids of models LM Studio currently reports, for the connection test."""
        target = (base_url.rstrip("/") if base_url else self._resolve().base_url)
        try:
            with httpx2.Client(base_url=target, timeout=2.0, transport=self._transport) as client:
                response = client.get("/v1/models")
                if not response.is_success:
                    raise LmStudioUnavailableError("LM Studio is offline.")
                payload = response.json()
        except httpx2.HTTPError as error:
            raise LmStudioUnavailableError("LM Studio is unreachable.") from error
        except ValueError as error:
            raise LmStudioResponseError("LM Studio returned an invalid response.") from error
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise LmStudioResponseError("LM Studio returned an unexpected model list.")
        return [
            model["id"]
            for model in payload["data"]
            if isinstance(model, dict) and isinstance(model.get("id"), str)
        ]
