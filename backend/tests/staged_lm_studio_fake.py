"""Shared staged-pipeline test double for LmStudioClient.

Not a test module itself (no ``test_`` prefix, so pytest does not collect it). Lets tests
that only care about *which events land in the database* describe one document's outcome
as a flat list of event-shaped specs, without depending on the staged pipeline's own call
mechanics (Signal Parser, then four classifiers per candidate) -- mirroring the simplicity
of the pre-redesign ``{content: ExtractionResult}`` fake.
"""

from dataclasses import dataclass, field

from app.schemas.staged_extraction import (
    ClassifiedActors,
    ClassifiedDate,
    ClassifiedEventType,
    ClassifiedLocation,
    ClassifiedLocations,
    SignalCandidate,
    SignalParseResult,
)
from app.services.lm_studio import DocumentExtractionContext, KnownEventType, LmStudioResponseError


@dataclass
class FakeEventSpec:
    title: str
    summary: str
    evidence_quote: str
    epistemic_status: str = "confirmed"
    event_type: str | None = None
    event_date: str | None = None
    event_date_precision: str | None = None
    locations: list[dict] = field(default_factory=list)
    source_actors: list[str] = field(default_factory=list)
    recipient_actors: list[str] = field(default_factory=list)
    fail_stages: frozenset[str] = frozenset()


class FakeLmStudioClient:
    """Implements the staged pipeline's call surface, keyed by document content."""

    def __init__(self, outcomes: dict[str, list[FakeEventSpec] | Exception]) -> None:
        self._outcomes = outcomes
        self.calls: list[DocumentExtractionContext] = []
        self.known_type_calls: list[list[KnownEventType]] = []
        self.known_actor_calls: list[list[str]] = []

    def _specs_for(self, content: str) -> list[FakeEventSpec]:
        outcome = self._outcomes[content]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def parse_signals(self, document_context: DocumentExtractionContext) -> SignalParseResult:
        self.calls.append(document_context)
        specs = self._specs_for(document_context.content)
        return SignalParseResult(
            candidates=[
                SignalCandidate(
                    working_title=spec.title,
                    summary=spec.summary,
                    epistemic_status=spec.epistemic_status,
                    evidence_quote=spec.evidence_quote,
                )
                for spec in specs
            ]
        )

    def _spec_for(
        self, document_context: DocumentExtractionContext, candidate: SignalCandidate
    ) -> FakeEventSpec:
        for spec in self._specs_for(document_context.content):
            if spec.title == candidate.working_title:
                return spec
        raise AssertionError(f"No fixture spec for candidate {candidate.working_title!r}")

    def _fail_if_configured(self, spec: FakeEventSpec, stage: str) -> None:
        if stage in spec.fail_stages:
            raise LmStudioResponseError(f"Simulated {stage} classifier failure.")

    def classify_event_type(
        self,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_types: list[KnownEventType],
    ) -> ClassifiedEventType:
        self.known_type_calls.append(known_types)
        spec = self._spec_for(document_context, candidate)
        self._fail_if_configured(spec, "event_type")
        return ClassifiedEventType(existing=spec.event_type)

    def classify_date(
        self, document_context: DocumentExtractionContext, candidate: SignalCandidate
    ) -> ClassifiedDate:
        spec = self._spec_for(document_context, candidate)
        self._fail_if_configured(spec, "event_date")
        return ClassifiedDate(
            event_date=spec.event_date, event_date_precision=spec.event_date_precision
        )

    def classify_locations(
        self, document_context: DocumentExtractionContext, candidate: SignalCandidate
    ) -> ClassifiedLocations:
        spec = self._spec_for(document_context, candidate)
        self._fail_if_configured(spec, "locations")
        return ClassifiedLocations(
            locations=[ClassifiedLocation(**location) for location in spec.locations]
        )

    def classify_actors(
        self,
        document_context: DocumentExtractionContext,
        candidate: SignalCandidate,
        known_actors: list[str],
    ) -> ClassifiedActors:
        self.known_actor_calls.append(known_actors)
        spec = self._spec_for(document_context, candidate)
        self._fail_if_configured(spec, "actors")
        return ClassifiedActors(
            source_actors=spec.source_actors, recipient_actors=spec.recipient_actors
        )
