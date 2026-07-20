import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

import httpx2
from pydantic import BaseModel, ValidationError

from app.schemas.extraction import ExtractionResult
from app.schemas.staged_extraction import (
    ClassifiedActors,
    ClassifiedDate,
    ClassifiedEventType,
    ClassifiedLocations,
    SignalCandidate,
    SignalParseResult,
)

StructuredModel = TypeVar("StructuredModel", bound=BaseModel)


@dataclass(frozen=True)
class KnownEventType:
    name: str
    description: str | None
    path: str


@dataclass(frozen=True)
class DocumentExtractionContext:
    title: str
    publication_date: str
    content: str


def _known_type_json(known_types: list[KnownEventType]) -> str:
    return json.dumps(
        [
            {"name": item.name, "description": item.description, "path": item.path}
            for item in known_types
        ],
        ensure_ascii=False,
    )


@dataclass(frozen=True)
class LmStudioRuntimeConfig:
    """The base URL and preferred model to use for the next LM Studio call."""

    base_url: str
    model: str | None
    extraction_timeout_seconds: float = 300.0


EXTRACTION_SYSTEM_PROMPT = (
    "You are an intelligence analyst extracting events from a single source document. "
    "Only report what the document actually states. Leave a field null rather than guess "
    "or invent a value. Prefer an existing event type or actor over inventing a "
    "near-duplicate. The evidence_quote for every event must be copied verbatim from the "
    "document text, not paraphrased or summarized.\n\n"
    "For every event, extract every location the document ties to that specific event: "
    "country, province/state (admin1), and city/regency, whenever the text states or "
    "clearly implies one. Do not skip a location just because it is named indirectly "
    "(a strait, a coastline, a region, 'the capital') if the document ties it to this "
    "event. Use the ISO 3166-1 alpha-3 country code (for example 'USA', 'IDN', 'IRN'), never "
    "the full country name. Leave a location field null only when the document truly gives "
    "no geographic detail for that event.\n\n"
    "Example: for the sentence \"Rebel forces attacked a checkpoint near Sana'a, Yemen, "
    "on Monday,\" the event's locations field must be "
    "[{\"country\": \"YEM\", \"admin1\": null, \"city_regency\": \"Sana'a\"}] — the country name "
    "is converted to its ISO code, the city name is kept as written, and admin1 stays null "
    "because no province/state was stated. Apply this same treatment to every event, "
    "including ones where the location is implied by a strait, coastline, or region rather "
    "than a country name spelled out directly."
)

SIGNAL_PARSER_SYSTEM_PROMPT = (
    "You are an intelligence analyst splitting a single source document into distinct "
    "signal candidates: separate, observable occurrences the document describes. Only "
    "split out occurrences the document actually describes; do not invent one. A document "
    "describing one occurrence produces one candidate; a document describing several "
    "distinct occurrences produces one candidate per occurrence.\n\n"
    "For every candidate, provide: a short working_title; a one- or two-sentence summary; "
    "its epistemic_status (confirmed, claim, rumor, or denied, based only on how the "
    "document itself presents it); and an evidence_quote copied verbatim from the document "
    "text, not paraphrased or summarized."
)

EVENT_TYPE_CLASSIFIER_SYSTEM_PROMPT = (
    "You are an intelligence analyst choosing an Event Type for one signal candidate drawn "
    "from a source document. Your only task: pick one active Event Type leaf, by its exact "
    "supplied name, that best fits this specific candidate — or null if none fits. Never "
    "invent, suggest, or describe a new event type."
)

DATE_CLASSIFIER_SYSTEM_PROMPT = (
    "You are an intelligence analyst determining the event date for one signal candidate "
    "drawn from a source document. Your only task: state the candidate's event date and its "
    "precision (exact, month, or year), or leave both null when the source content does not "
    "support a date, based only on the source content and the candidate's evidence quote."
)

LOCATIONS_CLASSIFIER_SYSTEM_PROMPT = (
    "You are an intelligence analyst identifying every location tied to one signal "
    "candidate drawn from a source document. Your only task: list every location — country, "
    "province/state (admin1), and city/regency — the source content ties to this specific "
    "candidate, whenever the text states or clearly implies one. Do not skip a location just "
    "because it is named indirectly (a strait, a coastline, a region, 'the capital') if the "
    "source content ties it to this candidate. Use the ISO 3166-1 alpha-3 country code (for "
    "example 'USA', 'IDN', 'IRN'), never the full country name. Leave a location field null "
    "only when the source content truly gives no geographic detail for that field. Return an "
    "empty list only when the source content gives no geographic detail for this candidate "
    "at all.\n\n"
    "Example: for the sentence \"Rebel forces attacked a checkpoint near Sana'a, Yemen, on "
    "Monday,\" the locations field must be "
    "[{\"country\": \"YEM\", \"admin1\": null, \"city_regency\": \"Sana'a\"}] — the country "
    "name is converted to its ISO code, the city name is kept as written, and admin1 stays "
    "null because no province/state was stated."
)

ACTORS_CLASSIFIER_SYSTEM_PROMPT = (
    "You are an intelligence analyst identifying the actors tied to one signal candidate "
    "drawn from a source document. Your only task: list source_actors (who initiated or "
    "executed this candidate) and recipient_actors (who it was directed at or who was "
    "affected), based only on the source content and the candidate's evidence quote. Prefer "
    "an exact supplied known actor name over inventing a near-duplicate. Leave a list empty "
    "when the source content does not identify that role for this candidate."
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

    def extract_events(
        self,
        document_context: DocumentExtractionContext,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> ExtractionResult:
        content = self._call_structured(
            lambda model_id: self._build_request(
                model_id, document_context, known_types, known_actors
            )
        )
        return self._parse_structured_content(content, ExtractionResult)

    def parse_signals(self, document_context: DocumentExtractionContext) -> SignalParseResult:
        content = self._call_structured(
            lambda model_id: self._build_signal_parser_request(model_id, document_context)
        )
        return self._parse_structured_content(content, SignalParseResult)

    def classify_event_type(
        self,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_types: list[KnownEventType],
    ) -> ClassifiedEventType:
        content = self._call_structured(
            lambda model_id: self._build_event_type_classifier_request(
                model_id, document_context, candidate, known_types
            )
        )
        return self._parse_structured_content(content, ClassifiedEventType)

    def classify_date(
        self, document_context: DocumentExtractionContext, candidate: SignalCandidate
    ) -> ClassifiedDate:
        content = self._call_structured(
            lambda model_id: self._build_date_classifier_request(
                model_id, document_context, candidate
            )
        )
        return self._parse_structured_content(content, ClassifiedDate)

    def classify_locations(
        self, document_context: DocumentExtractionContext, candidate: SignalCandidate
    ) -> ClassifiedLocations:
        content = self._call_structured(
            lambda model_id: self._build_locations_classifier_request(
                model_id, document_context, candidate
            )
        )
        return self._parse_structured_content(content, ClassifiedLocations)

    def classify_actors(
        self,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_actors: list[str],
    ) -> ClassifiedActors:
        content = self._call_structured(
            lambda model_id: self._build_actors_classifier_request(
                model_id, document_context, candidate, known_actors
            )
        )
        return self._parse_structured_content(content, ClassifiedActors)

    def _parse_structured_content(
        self, content: str, model_cls: type[StructuredModel]
    ) -> StructuredModel:
        try:
            return model_cls.model_validate_json(content)
        except ValidationError as error:
            raise LmStudioResponseError(
                "LM Studio's structured output did not match the expected schema."
            ) from error
        except ValueError as error:
            raise LmStudioResponseError(
                "LM Studio's structured output was not valid JSON."
            ) from error

    def _call_structured(self, build_payload: Callable[[str], dict]) -> str:
        """Resolve config/model, POST a structured chat-completion request built by
        ``build_payload(model_id)``, and return the raw message content. Raises a typed
        ``ExtractionError`` on any transport, HTTP, or JSON-decoding failure."""
        config = self._resolve()
        try:
            with httpx2.Client(
                base_url=config.base_url,
                timeout=config.extraction_timeout_seconds,
                transport=self._transport,
            ) as client:
                model_id = config.model or self._discover_model(client)
                response = client.post("/v1/chat/completions", json=build_payload(model_id))
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
        return self._extract_message_content(payload)

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
        document_context: DocumentExtractionContext,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> dict:
        system_prompt = (
            f"{EXTRACTION_SYSTEM_PROMPT}\n\n"
            "Known active Event Type leaves (their paths are classification context only): "
            f"{_known_type_json(known_types)}\n"
            "Use an exact supplied active event type name only when it fits. Otherwise set "
            "existing to null. Never invent, suggest, or describe a new event type.\n"
            f"Known actors: {', '.join(known_actors) or 'none yet'}"
        )
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Source title: {document_context.title}\n"
                        f"Publication Date: {document_context.publication_date}\n\n"
                        "Source content:\n"
                        f"{document_context.content}\n\n"
                        "Publication Date is when the source document was made. It is source "
                        "context only. Set Event Date only when the source content and evidence "
                        "quote support that event date."
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "extraction_result",
                    "schema": ExtractionResult.model_json_schema(),
                },
            },
        }

    def _build_signal_parser_request(
        self, model_id: str, document_context: DocumentExtractionContext
    ) -> dict:
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": SIGNAL_PARSER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Source title: {document_context.title}\n"
                        f"Publication Date: {document_context.publication_date}\n\n"
                        "Source content:\n"
                        f"{document_context.content}"
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "signal_parse_result",
                    "schema": SignalParseResult.model_json_schema(),
                },
            },
        }

    def _document_and_candidate_message(
        self,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        *,
        trailing: str = "",
    ) -> str:
        message = (
            f"Source title: {document_context.title}\n"
            f"Publication Date: {document_context.publication_date}\n\n"
            "Source content:\n"
            f"{document_context.content}\n\n"
            "Signal candidate:\n"
            f"Working title: {candidate.working_title}\n"
            f"Summary: {candidate.summary}\n"
            f"Evidence quote: {candidate.evidence_quote}"
        )
        if trailing:
            message += f"\n\n{trailing}"
        return message

    def _build_event_type_classifier_request(
        self,
        model_id: str,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_types: list[KnownEventType],
    ) -> dict:
        system_prompt = (
            f"{EVENT_TYPE_CLASSIFIER_SYSTEM_PROMPT}\n\n"
            "Known active Event Type leaves (their paths are classification context only): "
            f"{_known_type_json(known_types)}\n"
            "Use an exact supplied active event type name only when it fits this specific "
            "signal candidate. Otherwise set existing to null."
        )
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": self._document_and_candidate_message(document_context, candidate),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "classified_event_type",
                    "schema": ClassifiedEventType.model_json_schema(),
                },
            },
        }

    def _build_date_classifier_request(
        self,
        model_id: str,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
    ) -> dict:
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": DATE_CLASSIFIER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": self._document_and_candidate_message(
                        document_context,
                        candidate,
                        trailing=(
                            "Publication Date is when the source document was made. It is "
                            "context only. Set the event date only when the source content "
                            "and evidence quote support that event date."
                        ),
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "classified_date",
                    "schema": ClassifiedDate.model_json_schema(),
                },
            },
        }

    def _build_locations_classifier_request(
        self,
        model_id: str,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
    ) -> dict:
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": LOCATIONS_CLASSIFIER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": self._document_and_candidate_message(document_context, candidate),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "classified_locations",
                    "schema": ClassifiedLocations.model_json_schema(),
                },
            },
        }

    def _build_actors_classifier_request(
        self,
        model_id: str,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_actors: list[str],
    ) -> dict:
        system_prompt = (
            f"{ACTORS_CLASSIFIER_SYSTEM_PROMPT}\n\n"
            f"Known actors: {', '.join(known_actors) or 'none yet'}"
        )
        return {
            "model": model_id,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": self._document_and_candidate_message(document_context, candidate),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "classified_actors",
                    "schema": ClassifiedActors.model_json_schema(),
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
