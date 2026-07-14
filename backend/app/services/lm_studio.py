from collections.abc import Callable
from dataclasses import dataclass

import httpx2
from pydantic import ValidationError

from app.schemas.extraction import ExtractionResult


@dataclass(frozen=True)
class LmStudioRuntimeConfig:
    """The base URL and preferred model to use for the next LM Studio call."""

    base_url: str
    model: str | None


EXTRACTION_SYSTEM_PROMPT = (
    "You are an intelligence analyst extracting events from a single source document. "
    "Only report what the document actually states. Leave a field null rather than guess "
    "or invent a value. Prefer an existing event type or actor over inventing a "
    "near-duplicate. The evidence_quote for every event must be copied verbatim from the "
    "document text, not paraphrased or summarized."
)


class ExtractionError(Exception):
    """Base class for LM Studio extraction failures."""


class LmStudioUnavailableError(ExtractionError):
    """LM Studio is unreachable, timed out, or has no model loaded."""


class LmStudioResponseError(ExtractionError):
    """LM Studio responded, but the payload could not be used."""


class LmStudioClient:
    """Local-only client for checking LM Studio availability and extracting events."""

    def __init__(
        self,
        base_url: str,
        transport: httpx2.BaseTransport | None = None,
        extraction_timeout: float = 120.0,
        config_provider: Callable[[], LmStudioRuntimeConfig] | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._transport = transport
        self._extraction_timeout = extraction_timeout
        self._config_provider = config_provider

    def _resolve(self) -> LmStudioRuntimeConfig:
        if self._config_provider is not None:
            config = self._config_provider()
            return LmStudioRuntimeConfig(base_url=config.base_url.rstrip("/"), model=config.model)
        return LmStudioRuntimeConfig(base_url=self._base_url, model=None)

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

    def extract_events(
        self, document_text: str, known_types: list[str], known_actors: list[str]
    ) -> ExtractionResult:
        config = self._resolve()
        try:
            with httpx2.Client(
                base_url=config.base_url,
                timeout=self._extraction_timeout,
                transport=self._transport,
            ) as client:
                model_id = config.model or self._discover_model(client)
                response = client.post(
                    "/v1/chat/completions",
                    json=self._build_request(model_id, document_text, known_types, known_actors),
                )
                if not response.is_success:
                    raise LmStudioResponseError(
                        f"LM Studio returned HTTP {response.status_code}."
                    )
                payload = response.json()
        except httpx2.TimeoutException as error:
            raise LmStudioUnavailableError("LM Studio did not respond in time.") from error
        except httpx2.HTTPError as error:
            raise LmStudioUnavailableError("LM Studio is unreachable.") from error
        except ValueError as error:
            raise LmStudioResponseError(
                "LM Studio returned a response that was not valid JSON."
            ) from error

        content = self._extract_message_content(payload)
        try:
            return ExtractionResult.model_validate_json(content)
        except ValidationError as error:
            raise LmStudioResponseError(
                "LM Studio's structured output did not match the expected schema."
            ) from error
        except ValueError as error:
            raise LmStudioResponseError(
                "LM Studio's structured output was not valid JSON."
            ) from error

    def _discover_model(self, client: httpx2.Client) -> str:
        response = client.get("/v1/models")
        if not response.is_success:
            raise LmStudioUnavailableError("LM Studio is offline.")
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise LmStudioUnavailableError("No model is loaded in LM Studio.")
        models = payload["data"]
        if not models:
            raise LmStudioUnavailableError("No model is loaded in LM Studio.")
        model_id = models[0].get("id") if isinstance(models[0], dict) else None
        if not isinstance(model_id, str) or not model_id:
            raise LmStudioUnavailableError("No model is loaded in LM Studio.")
        return model_id

    def _build_request(
        self,
        model_id: str,
        document_text: str,
        known_types: list[str],
        known_actors: list[str],
    ) -> dict:
        system_prompt = (
            f"{EXTRACTION_SYSTEM_PROMPT}\n\n"
            f"Known event types: {', '.join(known_types) or 'none yet'}\n"
            f"Known actors: {', '.join(known_actors) or 'none yet'}"
        )
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": document_text},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "extraction_result",
                    "schema": ExtractionResult.model_json_schema(),
                },
            },
        }

    def _extract_message_content(self, payload: object) -> str:
        try:
            content = payload["choices"][0]["message"]["content"]  # type: ignore[index]
        except (KeyError, IndexError, TypeError) as error:
            raise LmStudioResponseError(
                "LM Studio's response did not include message content."
            ) from error
        if not isinstance(content, str):
            raise LmStudioResponseError("LM Studio's message content was not text.")
        return content
