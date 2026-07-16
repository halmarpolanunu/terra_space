---
type: Implementation Plan
title: Event Type Descriptions Implementation Plan
description: Test-first plan for human-reviewed event-type descriptions that guide users and local AI classification.
tags: [project-knowledge, plan, event-types, extraction, lm-studio]
status: completed
---

# Event Type Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add human-reviewed descriptions to event types, require descriptions for activation,
show the selected definition during event editing, and make LM Studio compare existing definitions
before suggesting a new type.

**Architecture:** Add one nullable database column and carry it through the existing event-type API.
Keep legacy active rows working, but enforce descriptions on new active types and inactive-to-active
transitions. Extend the extraction contract with `suggested_description`, pass typed active
definitions to LM Studio, and render one reusable description hint in all type-selection flows.

**Tech Stack:** Python 3.13, FastAPI, Pydantic, SQLAlchemy, Alembic, SQLite, pytest, TypeScript,
React 19, Next.js 16, Vitest, Testing Library.

## Global Constraints

- All data and AI processing remain local; LM Studio stays the only AI path.
- Description length is at most 1,000 characters; blank input is normalized to `null`.
- A new active type and an inactive-to-active transition require a non-blank description.
- Existing active rows with no description remain usable and may be renamed or deactivated.
- AI suggestions remain inactive and may have a blank draft description.
- AI output never overwrites the description of an existing event-type record.
- LM Studio receives active type names and descriptions before it may suggest a new type.
- Compact filters and event summaries continue to show names only.
- Use test-driven development: every production behavior starts with a test that fails for the
  expected missing-feature reason.
- Do not add dependencies or unrelated refactors.

## File map

- `backend/alembic/versions/0007_event_type_descriptions.py`: reversible nullable-column migration.
- `backend/app/db/models.py`: persisted `EventType.description` attribute.
- `backend/app/schemas/event.py`: event-type read/create/update API contracts.
- `backend/app/services/events.py`: normalization and activation validation.
- `backend/app/api/routes/events.py`: route payload/result wiring and validation errors.
- `backend/app/schemas/extraction.py`: AI `suggested_description` contract and schema guidance.
- `backend/app/services/extraction.py`: safe persistence of new AI-suggested descriptions.
- `backend/app/services/lm_studio.py`: typed known definitions and prompt serialization.
- `backend/app/api/routes/processing.py`: query and pass active definitions.
- `frontend/src/lib/events-api.ts`: shared event-type response type.
- `frontend/src/lib/settings-api.ts`: create/update request payloads.
- `frontend/src/app/settings/event-type-settings.tsx`: description management and activation UI.
- `frontend/src/components/event-type-description.tsx`: reusable selected-definition hint.
- `frontend/src/app/event-review/add-event-form.tsx`: manual review-add hint.
- `frontend/src/app/event-review/event-card.tsx`: extracted-event edit hint.
- `frontend/src/app/events/event-editor.tsx`: approved-event edit hint.
- `frontend/src/app/globals.css`: restrained layout and hint styling.

---

### Task 1: Persist descriptions and enforce activation rules

**Files:**

- Create: `backend/alembic/versions/0007_event_type_descriptions.py`
- Modify: `backend/app/db/models.py:76-84`
- Modify: `backend/app/schemas/event.py:13-29`
- Modify: `backend/app/services/events.py:53-58,245-278`
- Modify: `backend/app/api/routes/events.py:61-101`
- Test: `backend/tests/test_database.py`
- Test: `backend/tests/test_event_types_actors_api.py`
- Test: `backend/tests/test_event_edit_approve_reject.py`

**Interfaces:**

- Produces: `EventType.description: str | None`.
- Produces: `EventTypeRead.description: str | None`.
- Produces: `EventTypeCreate(name: str, description: str)` with a 1,000-character maximum.
- Produces: `EventTypeUpdate.description: str | None` with field-presence semantics.
- Produces: `EventTypeDescriptionRequiredError` mapped to HTTP 422.
- Produces: `create_event_type(db, name, description)` and
  `update_event_type(..., description=_UNSET)`.

- [x] **Step 1: Write migration and API tests that describe the required behavior**

Add database coverage that the upgraded table contains nullable `description`. Add API tests with
these exact cases:

```python
from app.db.models import EventType


def _seed_event_type(
    client: TestClient,
    *,
    name: str,
    description: str | None,
    is_active: bool,
) -> str:
    with client.app.state.session_factory() as db:
        event_type = EventType(
            name=name,
            description=description,
            is_active=is_active,
        )
        db.add(event_type)
        db.commit()
        db.refresh(event_type)
        return event_type.id


def test_create_event_type_requires_and_returns_description(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    missing = client.post("/api/event-types", json={"name": "Airstrike", "description": "   "})
    assert missing.status_code == 422

    created = client.post(
        "/api/event-types",
        json={"name": "Airstrike", "description": "Use for an aerial weapons strike."},
    )
    assert created.status_code == 201
    assert created.json()["description"] == "Use for an aerial weapons strike."


def test_inactive_type_requires_description_before_activation(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Suggested type", description=None, is_active=False)
    response = client.patch(f"/api/event-types/{type_id}", json={"is_active": True})
    assert response.status_code == 422
    assert response.json()["detail"] == "Add a description before activating this event type."


def test_legacy_active_type_can_be_renamed_or_deactivated_without_description(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    type_id = _seed_event_type(client, name="Legacy", description=None, is_active=True)
    renamed = client.patch(f"/api/event-types/{type_id}", json={"name": "Legacy renamed"})
    assert renamed.status_code == 200
    assert renamed.json()["description"] is None
    assert client.patch(f"/api/event-types/{type_id}", json={"is_active": False}).status_code == 200


def test_active_description_cannot_be_cleared(tmp_path: Path) -> None:
    client = _client(tmp_path, {})
    created = client.post(
        "/api/event-types",
        json={"name": "Protest", "description": "Use for collective public demonstrations."},
    ).json()
    response = client.patch(f"/api/event-types/{created['id']}", json={"description": " "})
    assert response.status_code == 422


def test_approval_rejects_a_suggested_type_without_description(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(events=[ExtractedEvent(
        title="Something",
        summary="Summary.",
        event_type=ExtractedEventType(suggested="Report", suggested_description=None),
        epistemic_status="confirmed",
        evidence_quote=content,
    )])
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    event = client.get(f"/api/documents/{document['id']}/events").json()[0]
    response = client.post(f"/api/events/{event['id']}/approve")
    assert response.status_code == 422
    assert response.json()["detail"] == "Add a description before approving this event type."
    assert client.get(f"/api/events/{event['id']}").json()["review_status"] == "draft"


def test_approve_all_skips_a_suggested_type_without_description(tmp_path: Path) -> None:
    content = "Something happened on 2026-07-10."
    extraction = ExtractionResult(events=[ExtractedEvent(
        title="Something",
        summary="Summary.",
        event_type=ExtractedEventType(suggested="Report", suggested_description=None),
        epistemic_status="confirmed",
        evidence_quote=content,
    )])
    client = _client(tmp_path, {content: extraction})
    document = _create_and_process_document(client, content)
    body = client.post(
        f"/api/documents/{document['id']}/events/approve-all"
    ).json()
    assert body["approved_event_ids"] == []
    assert body["skipped"][0]["reason"] == "Event type needs a description."
```

- [x] **Step 2: Run the focused backend tests and confirm RED**

Run from `backend/`:

```powershell
uv run pytest tests/test_database.py tests/test_event_types_actors_api.py tests/test_event_edit_approve_reject.py -q
```

Expected: failures because the column, payload fields, and validation error do not exist yet. The
helper itself becomes usable as soon as the model field is added; before that, the expected
`description is an invalid keyword argument` failure proves the field is missing.

- [x] **Step 3: Add the migration, model field, schemas, and service validation**

Create revision `0007_event_type_descriptions` after `0006_lm_studio_timeout`:

```python
def upgrade() -> None:
    with op.batch_alter_table("event_types") as batch_op:
        batch_op.add_column(sa.Column("description", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("event_types") as batch_op:
        batch_op.drop_column("description")
```

Add the model and schema fields:

```python
# db/models.py
description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

# schemas/event.py
class EventTypeRead(BaseModel):
    description: str | None

class EventTypeCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1, max_length=1000)

class EventTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None
```

Normalize whitespace in the service, not only Pydantic, and enforce transitions:

```python
class EventTypeDescriptionRequiredError(Exception):
    """Raised when an active event type would have no usable description."""


def _clean_description(value: str | None) -> str | None:
    clean = (value or "").strip()
    return clean or None


def create_event_type(db: Session, name: str, description: str) -> EventType:
    clean_name = name.strip()
    if not clean_name:
        raise EventTypeNameConflictError("Event type name is required.")
    existing = list(db.execute(select(EventType)).scalars())
    if find_by_exact_name(existing, clean_name) is not None:
        raise EventTypeNameConflictError("An event type with this name already exists.")
    clean_description = _clean_description(description)
    if clean_description is None:
        raise EventTypeDescriptionRequiredError(
            "Add a description before creating this active event type."
        )
    event_type = EventType(name=clean_name, description=clean_description, is_active=True)
    db.add(event_type)
    db.commit()
    db.refresh(event_type)
    return event_type


def update_event_type(
    db: Session,
    event_type: EventType,
    *,
    name=_UNSET,
    description=_UNSET,
    is_active=_UNSET,
) -> EventType:
    if name is not _UNSET:
        clean_name = (name or "").strip()
        if not clean_name:
            raise EventTypeNameConflictError("Event type name is required.")
        others = [
            other
            for other in db.execute(select(EventType)).scalars()
            if other.id != event_type.id
        ]
        if find_by_exact_name(others, clean_name) is not None:
            raise EventTypeNameConflictError("An event type with this name already exists.")

    next_description = (
        event_type.description if description is _UNSET else _clean_description(description)
    )
    activates = is_active is True and not event_type.is_active
    clears_active_description = (
        event_type.is_active and description is not _UNSET and next_description is None
    )
    if (activates and next_description is None) or clears_active_description:
        raise EventTypeDescriptionRequiredError(
            "Add a description before activating this event type."
        )
    if name is not _UNSET:
        event_type.name = clean_name
    if description is not _UNSET:
        event_type.description = next_description
    if is_active is not _UNSET and is_active is not None:
        event_type.is_active = is_active
    db.commit()
    db.refresh(event_type)
    return event_type


def _require_description_before_type_activation(event_type: EventType | None, message: str) -> None:
    if event_type is not None and not event_type.is_active and not event_type.description:
        raise EventTypeDescriptionRequiredError(message)
```

Wire `description` through route construction and `model_fields_set`:

```python
EventTypeRead(
    id=event_type.id,
    name=event_type.name,
    description=event_type.description,
    is_active=event_type.is_active,
    in_use=event_type.id in referenced,
)

event_type = create_event_type(db, payload.name, payload.description)

if "description" in payload.model_fields_set:
    kwargs["description"] = payload.description

except EventTypeDescriptionRequiredError as error:
    raise HTTPException(status_code=422, detail=str(error)) from error
```

Keep the existing `EventTypeNameConflictError` mapping at HTTP 409.

Call `_require_description_before_type_activation` in `approve_event` before changing any event,
type, or actor status:

```python
_require_description_before_type_activation(
    event.event_type,
    "Add a description before approving this event type.",
)
```

Map that approval error to HTTP 422. In `approve_all_for_document`, catch it and append:

```python
except EventTypeDescriptionRequiredError:
    result.skipped.append(
        ApproveAllSkip(event_id=event.id, reason="Event type needs a description.")
    )
```

Update `_extraction_with_suggestions` in `test_event_edit_approve_reject.py` to include a valid
`suggested_description` so its existing successful-approval test continues to represent a reviewed
suggestion.

- [x] **Step 4: Run focused tests and confirm GREEN**

```powershell
uv run pytest tests/test_database.py tests/test_event_types_actors_api.py tests/test_event_edit_approve_reject.py -q
```

Expected: all selected tests pass.

- [x] **Step 5: Verify upgrade and downgrade on a disposable SQLite database**

Extend `test_alembic_migration_creates_foundation_schema` and add this migration-safety test:

```python
def test_event_type_description_migration_preserves_legacy_rows(tmp_path: Path) -> None:
    database_file = tmp_path / "migration.db"
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_file}")
    command.upgrade(config, "0006_lm_studio_timeout")
    engine = create_engine(f"sqlite:///{database_file}")
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO event_types "
            "(id, name, is_active, created_at, updated_at) "
            "VALUES ('legacy', 'Legacy', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ))

    command.upgrade(config, "0007_event_type_descriptions")
    with engine.connect() as connection:
        assert connection.execute(text(
            "SELECT description FROM event_types WHERE id = 'legacy'"
        )).scalar_one() is None

    command.downgrade(config, "0006_lm_studio_timeout")
    assert "description" not in {column["name"] for column in inspect(engine).get_columns("event_types")}
    command.upgrade(config, "head")
    assert "description" in {column["name"] for column in inspect(engine).get_columns("event_types")}
```

- [x] **Step 6: Commit Task 1**

```powershell
git add backend/alembic/versions/0007_event_type_descriptions.py backend/app/db/models.py backend/app/schemas/event.py backend/app/services/events.py backend/app/api/routes/events.py backend/tests/test_database.py backend/tests/test_event_types_actors_api.py backend/tests/test_event_edit_approve_reject.py
git commit -m "feat: add event type descriptions"
```

---

### Task 2: Persist AI-suggested descriptions without overwriting existing types

**Files:**

- Modify: `backend/app/schemas/extraction.py:9-12`
- Modify: `backend/app/services/extraction.py:63-80`
- Test: `backend/tests/test_event_types_actors_api.py`
- Test: `backend/tests/test_extraction_validation.py`

**Interfaces:**

- Consumes: `EventType.description` from Task 1.
- Produces: `ExtractedEventType.suggested_description: str | None` with max length 1,000.
- Guarantees: only a newly created suggested type receives the AI draft description.

- [x] **Step 1: Write failing persistence tests**

```python
SOURCE_TEXT = "Aircraft struck the depot."


def _process_source(client: TestClient, content: str) -> None:
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-16"},
    ).json()
    response = client.post(
        "/api/documents/process",
        json={"document_ids": [document["id"]]},
    )
    assert response.status_code == 202


def test_ai_suggested_event_type_keeps_its_draft_description(tmp_path: Path) -> None:
    extraction = ExtractionResult(events=[ExtractedEvent(
        title="Depot strike",
        summary="Aircraft struck the depot.",
        event_type=ExtractedEventType(
            suggested="Airstrike",
            suggested_description="Use for attacks delivered by military aircraft.",
        ),
        epistemic_status="confirmed",
        evidence_quote=SOURCE_TEXT,
    )])
    client = _client(tmp_path, {SOURCE_TEXT: extraction})
    _process_source(client, SOURCE_TEXT)
    event_type = client.get("/api/event-types").json()[0]
    assert event_type["description"] == "Use for attacks delivered by military aircraft."
    assert event_type["is_active"] is False


def test_ai_description_never_overwrites_an_existing_type(tmp_path: Path) -> None:
    extraction = ExtractionResult(events=[ExtractedEvent(
        title="Public protest",
        summary="People held a public protest.",
        event_type=ExtractedEventType(
            existing="Protest",
            suggested_description="AI replacement must be ignored.",
        ),
        epistemic_status="confirmed",
        evidence_quote="People held a public protest.",
    )])
    client = _client(tmp_path, {"People held a public protest.": extraction})
    existing = client.post(
        "/api/event-types",
        json={"name": "Protest", "description": "Human definition."},
    ).json()
    _process_source(client, "People held a public protest.")
    rows = client.get("/api/event-types").json()
    assert len(rows) == 1
    assert rows[0]["id"] == existing["id"]
    assert rows[0]["description"] == "Human definition."
    assert rows[0]["in_use"] is True
```

Add two more explicit cases using the same complete `ExtractionResult` shape: two events with
`suggested="Airstrike"` produce one row retaining the first normalized draft description:

```python
def test_repeated_ai_type_suggestion_creates_one_type_and_keeps_first_description(
    tmp_path: Path,
) -> None:
    events = [
        ExtractedEvent(
            title=f"Strike {index}",
            summary=SOURCE_TEXT,
            event_type=ExtractedEventType(
                suggested="Airstrike",
                suggested_description=description,
            ),
            epistemic_status="confirmed",
            evidence_quote=SOURCE_TEXT,
        )
        for index, description in enumerate(("  First definition.  ", "Second definition."), 1)
    ]
    client = _client(tmp_path, {SOURCE_TEXT: ExtractionResult(events=events)})
    _process_source(client, SOURCE_TEXT)
    rows = client.get("/api/event-types").json()
    assert len(rows) == 1
    assert rows[0]["description"] == "First definition."


def test_blank_ai_description_is_null_on_inactive_suggestion(tmp_path: Path) -> None:
    event = ExtractedEvent(
        title="Depot strike",
        summary=SOURCE_TEXT,
        event_type=ExtractedEventType(
            suggested="Airstrike",
            suggested_description="   ",
        ),
        epistemic_status="confirmed",
        evidence_quote=SOURCE_TEXT,
    )
    client = _client(tmp_path, {SOURCE_TEXT: ExtractionResult(events=[event])})
    _process_source(client, SOURCE_TEXT)
    row = client.get("/api/event-types").json()[0]
    assert row["description"] is None
    assert row["is_active"] is False
```

- [x] **Step 2: Run focused tests and confirm RED**

```powershell
uv run pytest tests/test_event_types_actors_api.py tests/test_extraction_validation.py -q
```

Expected: schema rejects/ignores `suggested_description`, or API returns `null` instead of the draft.

- [x] **Step 3: Extend the structured extraction schema and persistence**

```python
class ExtractedEventType(BaseModel):
    existing: str | None = Field(
        default=None,
        description="Exact name of a supplied active event type; prefer this whenever it fits.",
    )
    suggested: str | None = Field(
        default=None,
        description="New type name only when no supplied active definition fits.",
    )
    suggested_description: str | None = Field(
        default=None,
        max_length=1000,
        description="Draft definition for suggested; null when existing is used.",
    )
```

When `persist_extraction` creates a missing type, assign a normalized description only when the
model used `suggested`:

```python
suggested_description = (
    (event_data.event_type.suggested_description or "").strip() or None
    if event_data.event_type.suggested
    else None
)
event_type = EventType(
    name=type_name,
    description=suggested_description,
    is_active=False,
)
```

Do not write to `event_type.description` when `find_by_exact_name` returns an existing row. Keeping
the first created row in `existing_event_types` also guarantees one record per repeated name.

- [x] **Step 4: Run focused tests and confirm GREEN**

```powershell
uv run pytest tests/test_event_types_actors_api.py tests/test_extraction_validation.py -q
```

Expected: all selected tests pass.

- [x] **Step 5: Commit Task 2**

```powershell
git add backend/app/schemas/extraction.py backend/app/services/extraction.py backend/tests/test_event_types_actors_api.py backend/tests/test_extraction_validation.py
git commit -m "feat: preserve suggested type definitions"
```

---

### Task 3: Send existing definitions to LM Studio before allowing suggestions

**Files:**

- Modify: `backend/app/services/lm_studio.py:1-188`
- Modify: `backend/app/api/routes/processing.py:42-55`
- Modify: `backend/tests/test_processing.py`
- Modify: `backend/tests/test_event_types_actors_api.py`
- Modify: `backend/tests/test_event_edit_approve_reject.py`
- Modify: `backend/tests/test_events_api.py`
- Modify: `backend/tests/test_duplicate_resolution.py`
- Test: `backend/tests/test_lm_studio_extraction.py`
- Test: `backend/tests/test_events_api.py`

**Interfaces:**

- Produces: immutable `KnownEventType(name: str, description: str | None)`.
- Changes: `LmStudioClient.extract_events(document_text, known_types, known_actors)`, where
  `known_types` is `list[KnownEventType]`.
- Consumes: active `EventType.name` and `EventType.description` from Task 1.

- [x] **Step 1: Write a failing request-capture test**

```python
def test_extract_events_sends_active_type_definitions_and_reuse_instruction() -> None:
    seen: dict = {}

    def chat(request: httpx2.Request) -> httpx2.Response:
        seen.update(json.loads(request.content))
        return _chat_completion(WELL_FORMED_CONTENT)

    client = _client_for(_models_ok(), chat)
    client.extract_events(
        "A large protest occurred.",
        [KnownEventType(name="Protest", description="Collective public demonstration.")],
        [],
    )

    prompt = seen["messages"][0]["content"]
    assert '"name": "Protest"' in prompt
    assert '"description": "Collective public demonstration."' in prompt
    assert "Only suggest a new event type when none of these definitions fits" in prompt
```

Make the existing `FakeLmStudioClient` capture definitions and add this processing test:

```python
class FakeLmStudioClient:
    def __init__(self, outcomes: dict[str, ExtractionResult]) -> None:
        self._outcomes = outcomes
        self.known_types_seen: list[KnownEventType] = []

    def extract_events(
        self,
        document_text: str,
        known_types: list[KnownEventType],
        known_actors: list[str],
    ) -> ExtractionResult:
        self.known_types_seen = known_types
        return self._outcomes[document_text]


def test_processing_passes_only_active_event_type_definitions(tmp_path: Path) -> None:
    content = "A public protest occurred."
    fake = FakeLmStudioClient({content: ExtractionResult(events=[])})
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        lm_studio_check=lambda: True,
        lm_studio_client=fake,
    )
    client = TestClient(app)
    client.post(
        "/api/event-types",
        json={"name": "Protest", "description": "Collective public demonstration."},
    )
    with app.state.session_factory() as db:
        db.add(EventType(name="Unused suggestion", description=None, is_active=False))
        db.commit()
    document = client.post(
        "/api/documents",
        json={"title": content, "content": content, "document_date": "2026-07-16"},
    ).json()
    client.post("/api/documents/process", json={"document_ids": [document["id"]]})

    assert fake.known_types_seen == [
        KnownEventType(
            name="Protest",
            description="Collective public demonstration.",
        )
    ]
```

- [x] **Step 2: Run focused tests and confirm RED**

```powershell
uv run pytest tests/test_lm_studio_extraction.py tests/test_events_api.py -q
```

Expected: import/signature failures because `KnownEventType` and structured prompt content do not
exist.

- [x] **Step 3: Add the typed definition and deterministic JSON prompt**

```python
import json

@dataclass(frozen=True)
class KnownEventType:
    name: str
    description: str | None


def _known_type_json(known_types: list[KnownEventType]) -> str:
    return json.dumps(
        [{"name": item.name, "description": item.description} for item in known_types],
        ensure_ascii=False,
    )
```

Replace the comma-separated line with:

```python
f"Known active event types: {_known_type_json(known_types)}\n"
"Reuse an existing event type whenever its definition fits. Only suggest a new event type "
"when none of these definitions fits; include suggested_description for every new suggestion.\n"
```

In processing, build the list without filtering out legacy null descriptions:

```python
active_types = [
    KnownEventType(name=event_type.name, description=event_type.description)
    for event_type in db.execute(
        select(EventType).where(EventType.is_active.is_(True)).order_by(EventType.name)
    ).scalars()
]
```

Update all five named fake-client annotations to `list[KnownEventType]`. Their runtime behavior stays
unchanged except for the processing-route fake that captures the received definitions for its new
assertion.

- [x] **Step 4: Run focused tests and confirm GREEN**

```powershell
uv run pytest tests/test_lm_studio_extraction.py tests/test_events_api.py -q
```

Expected: all selected tests pass and the captured prompt contains structured definitions.

- [x] **Step 5: Run the complete backend suite**

```powershell
uv run pytest -q
```

Expected: all backend tests pass with zero failures.

- [x] **Step 6: Commit Task 3**

```powershell
git add backend/app/services/lm_studio.py backend/app/api/routes/processing.py backend/tests
git commit -m "feat: guide extraction with type definitions"
```

---

### Task 4: Manage descriptions safely in Settings

**Files:**

- Modify: `frontend/src/lib/events-api.ts:9-14`
- Modify: `frontend/src/lib/settings-api.ts:51-72`
- Modify: `frontend/src/app/settings/event-type-settings.tsx`
- Modify: `frontend/src/app/globals.css:472-487,965-996`
- Test: `frontend/tests/event-type-settings.test.tsx`
- Test fixture updates: `frontend/tests/duplicate-compare-panel.test.tsx`
- Test fixture updates: `frontend/tests/event-card.test.tsx`
- Test fixture updates: `frontend/tests/dashboard-workspace.test.tsx`
- Test fixture updates: `frontend/tests/event-review-page-motion.test.tsx`
- Test fixture updates: `frontend/tests/event-list.test.tsx`
- Test fixture updates: `frontend/tests/events-page.test.tsx`

**Interfaces:**

- Consumes: `EventTypeRead.description: string | null` from Task 1.
- Produces: `createEventType(name: string, description: string)`.
- Produces: `updateEventType(id, Partial<{name; description; is_active}>)`.

- [x] **Step 1: Update fixtures and write failing Settings interaction tests**

Add `description: null` or a meaningful definition to every `EventTypeRead` fixture in the seven
named test files. Then add:

```tsx
it("creates an active type with a required description", async () => {
  vi.mocked(settingsApi.createEventType).mockResolvedValue({
    id: "type-new", name: "Airstrike",
    description: "Use for attacks delivered by military aircraft.",
    is_active: true, in_use: false,
  });
  render(<EventTypeSettings eventTypes={TYPES} />);
  fireEvent.change(screen.getByLabelText("New event type"), { target: { value: "Airstrike" } });
  fireEvent.change(screen.getByLabelText("New event type description"), {
    target: { value: "Use for attacks delivered by military aircraft." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add event type" }));
  await waitFor(() => expect(settingsApi.createEventType).toHaveBeenCalledWith(
    "Airstrike", "Use for attacks delivered by military aircraft.",
  ));
});


it("blocks activation and explains when a suggested type has no description", () => {
  render(<EventTypeSettings eventTypes={[{
    id: "suggested", name: "New type", description: null,
    is_active: false, in_use: false,
  }]} />);
  expect(screen.getByLabelText("Active: New type")).toBeDisabled();
  expect(screen.getByText("Add a description before activating.")).toBeVisible();
});


it("saves a name and description together", async () => {
  render(<EventTypeSettings eventTypes={TYPES} />);
  fireEvent.change(screen.getByLabelText("Description for Protest"), {
    target: { value: "Collective public demonstration." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes for Protest" }));
  await waitFor(() => expect(settingsApi.updateEventType).toHaveBeenCalledWith(
    "type-active",
    { name: "Protest", description: "Collective public demonstration." },
  ));
});
```

- [x] **Step 2: Run the focused frontend test and confirm RED**

Run from `frontend/`:

```powershell
npm.cmd test -- event-type-settings.test.tsx
```

Expected: failures because the description fields, API payload, and activation guard are absent.

- [x] **Step 3: Extend types, requests, component state, and layout**

Update the shared type and requests:

```ts
export type EventTypeRead = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  in_use?: boolean;
};

export async function createEventType(name: string, description: string) {
  const response = await fetch(`${API_ROOT}/event-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return parseOrThrow<EventTypeRead>(response);
}

export async function updateEventType(
  id: string,
  patch: Partial<{ name: string; description: string | null; is_active: boolean }>,
) {
  const response = await fetch(`${API_ROOT}/event-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<EventTypeRead>(response);
}
```

Use controlled drafts so API responses reset both fields reliably:

```ts
type TypeDraft = { name: string; description: string };
const [drafts, setDrafts] = useState<Record<string, TypeDraft>>({});
const draftFor = (type: EventTypeRead): TypeDraft => drafts[type.id] ?? {
  name: type.name,
  description: type.description ?? "",
};
```

Add a textarea per row, call one `save(type)` with both normalized values, and disable only this
transition:

```tsx
const activationBlocked = !type.is_active && !draftFor(type).description.trim();
<input
  aria-label={`Active: ${type.name}`}
  checked={type.is_active}
  disabled={activationBlocked}
  onChange={() => toggle(type)}
  type="checkbox"
/>
{activationBlocked && <p className="event-type-required">Add a description before activating.</p>}
```

An active legacy blank type keeps an enabled checked box so it can be deactivated. Disable the new
type submit button until both name and description contain non-whitespace text. Add layout classes
that keep name, description, status, and actions readable without altering the global visual system.

- [x] **Step 4: Run focused tests and confirm GREEN**

```powershell
npm.cmd test -- event-type-settings.test.tsx
```

Expected: all Settings tests pass.

- [x] **Step 5: Run frontend lint to catch type/JSX issues**

```powershell
npm.cmd run lint
```

Expected: exit code 0 with no lint errors.

- [x] **Step 6: Commit Task 4**

```powershell
git add frontend/src/lib/events-api.ts frontend/src/lib/settings-api.ts frontend/src/app/settings/event-type-settings.tsx frontend/src/app/globals.css frontend/tests/event-type-settings.test.tsx
git commit -m "feat: manage event type descriptions"
```

---

### Task 5: Show the selected definition in Event Review and Events

**Files:**

- Create: `frontend/src/components/event-type-description.tsx`
- Modify: `frontend/src/app/event-review/add-event-form.tsx`
- Modify: `frontend/src/app/event-review/event-card.tsx`
- Modify: `frontend/src/app/event-review/page.tsx:204-224`
- Modify: `frontend/src/app/events/event-editor.tsx`
- Modify: `frontend/src/app/globals.css`
- Test: `frontend/tests/event-type-description.test.tsx`
- Test: `frontend/tests/event-card.test.tsx`
- Test: `frontend/tests/events-page.test.tsx`

**Interfaces:**

- Consumes: `EventTypeRead` from Task 4.
- Produces: `EventTypeDescription({eventType, unmatchedName?})` reusable hint component.
- Produces: `eventTypeNeedsDescription(eventType)` used by Event Review approval gating.
- Guarantees: filters and compact summaries are untouched.

- [x] **Step 1: Write failing component and integration tests**

```tsx
it("shows a selected type definition", () => {
  render(<EventTypeDescription eventType={{
    id: "protest", name: "Protest",
    description: "Collective public demonstration.",
    is_active: true,
  }} />);
  expect(screen.getByText("Collective public demonstration.")).toBeVisible();
});

it("marks a blank suggested definition as requiring review", () => {
  render(<EventTypeDescription eventType={{
    id: "new", name: "New type", description: null, is_active: false,
  }} />);
  expect(screen.getByText("Suggested type — description required before activation.")).toBeVisible();
});
```

Add these integration tests to the existing suites (and add `description` to their fixture types):

```tsx
it("shows the selected definition when manually adding a review event", () => {
  const eventType = {
    id: "protest", name: "Protest",
    description: "Collective public demonstration.",
    is_active: true,
  };
  render(<AddEventForm eventTypeOptions={[eventType]} onCancel={vi.fn()} onSubmit={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "Protest" } });
  expect(screen.getByText("Collective public demonstration.")).toBeVisible();
});


it("shows the selected definition before approving or editing an extracted event", () => {
  const event = makeEvent({
    event_type: {
      id: "attack", name: "Attack",
      description: "Deliberate use of force against a target.",
      is_active: false,
    },
  });
  render(
    <EventCard
      actorOptions={[]}
      approveDisabledReason={null}
      event={event}
      eventTypeOptions={[event.event_type!]}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(screen.getByText("Deliberate use of force against a target.")).toBeVisible();
});


it("updates the definition when the approved-event type changes", () => {
  const movement = {
    id: "movement", name: "Movement",
    description: "Movement of people or equipment.", is_active: true,
  };
  const protest = {
    id: "protest", name: "Protest",
    description: "Collective public demonstration.", is_active: true,
  };
  render(
    <EventEditor
      actorOptions={[]}
      event={makeEvent({ event_type: movement })}
      eventTypeOptions={[movement, protest]}
      onCancel={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "protest" } });
  expect(screen.getByText("Collective public demonstration.")).toBeVisible();
});
```

- [x] **Step 2: Run the focused tests and confirm RED**

```powershell
npm.cmd test -- event-type-description.test.tsx event-card.test.tsx events-page.test.tsx
```

Expected: missing module/component and missing description text failures.

- [x] **Step 3: Implement the focused hint component**

```tsx
import type { EventTypeRead } from "@/lib/events-api";

type Props = {
  eventType?: EventTypeRead;
  unmatchedName?: string;
};

export function EventTypeDescription({ eventType, unmatchedName }: Props) {
  if (eventType?.description) {
    return <p className="event-type-description">{eventType.description}</p>;
  }
  if (eventType && !eventType.is_active) {
    return <p className="event-type-description event-type-description-required">
      Suggested type — description required before activation.
    </p>;
  }
  if (unmatchedName?.trim()) {
    return <p className="event-type-description event-type-description-required">
      New type — add its description in Settings before activation.
    </p>;
  }
  return null;
}

export function eventTypeNeedsDescription(eventType?: EventTypeRead | null): boolean {
  return Boolean(eventType && !eventType.is_active && !eventType.description?.trim());
}
```

For text/datalist controls, resolve a type with a case-insensitive trimmed name:

```ts
const selectedType = eventTypeOptions.find(
  (type) => type.name.toLocaleLowerCase() === eventTypeName.trim().toLocaleLowerCase(),
);
```

For `EventEditor`, resolve by `id`. Render `EventTypeDescription` directly under each selection
control. In the EventCard read-only Type fact, render it beneath the type name as well, so the owner
sees an AI draft definition before pressing Approve; pressing Approve on a described suggestion is
the human confirmation that activates it, matching the existing confirmation flow. Add only
muted/helper styling and an amber warning variation; do not change dropdown labels or filter rows.

In Event Review, keep duplicate resolution as the first approval blocker and add the definition
blocker second:

```ts
const approveDisabledReason =
  currentEvent?.duplicate_flags.some((flag) => flag.resolution === "pending")
    ? "Resolve the duplicate flag below first."
    : eventTypeNeedsDescription(currentEvent?.event_type)
      ? "Add a description in Settings before approving this suggested type."
      : null;
```

Change the approve-all summary to avoid claiming every skip is a duplicate:

```ts
result.skipped.length > 0
  ? `Approved ${result.approved_event_ids.length}; skipped ${result.skipped.length} event(s) that need review.`
  : `Approved ${result.approved_event_ids.length} event(s).`
```

Add these exact assertions:

```tsx
it("requires a definition only for an inactive blank type", () => {
  const base = { id: "type", name: "Type", description: null, is_active: false };
  expect(eventTypeNeedsDescription(base)).toBe(true);
  expect(eventTypeNeedsDescription({ ...base, is_active: true })).toBe(false);
  expect(eventTypeNeedsDescription({ ...base, description: "Defined." })).toBe(false);
  expect(eventTypeNeedsDescription(null)).toBe(false);
});


it("disables approval with the supplied description-review reason", () => {
  render(
    <EventCard
      actorOptions={[]}
      approveDisabledReason="Add a description in Settings before approving this suggested type."
      event={makeEvent()}
      eventTypeOptions={[]}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  expect(screen.getByText(
    "Add a description in Settings before approving this suggested type.",
  )).toBeVisible();
});
```

- [x] **Step 4: Run focused tests and confirm GREEN**

```powershell
npm.cmd test -- event-type-description.test.tsx event-card.test.tsx events-page.test.tsx
```

Expected: all selected tests pass.

- [x] **Step 5: Run the complete frontend suite, lint, and build**

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: all tests pass; lint and production build exit 0.

- [x] **Step 6: Commit Task 5**

```powershell
git add frontend/src/components/event-type-description.tsx frontend/src/app/event-review/add-event-form.tsx frontend/src/app/event-review/event-card.tsx frontend/src/app/event-review/page.tsx frontend/src/app/events/event-editor.tsx frontend/src/app/globals.css frontend/tests
git commit -m "feat: explain selected event types"
```

---

### Task 6: End-to-end verification and Project Knowledge completion

**Files:**

- Modify: `project-knowledge/Feedback-Backlog.md`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify: `project-knowledge/plans/2026-07-16-event-type-descriptions.md` (`status: completed`)
- Test: existing browser/end-to-end scenario files if selectors need description-aware updates.

**Interfaces:**

- Consumes: all Tasks 1-5.
- Produces: verified local workflow and durable continuation record.

- [x] **Step 1: Run fresh full automated verification**

From `backend/`:

```powershell
uv run pytest -q
```

From `frontend/`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: zero failures/errors and successful production build. Record exact test counts.

- [x] **Step 2: Exercise the real local workflow without changing unrelated owner data**

Rebuild and restart the normal containers from repository root:

```powershell
docker compose build backend frontend
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-TerraSpace.ps1
```

Then verify in the browser:

1. Confirm legacy active blank types remain visible and can be deactivated.
2. Confirm a new active type cannot be created without a description.
3. Create a temporary described type and confirm Settings returns the saved definition.
4. Confirm a blank suggested type cannot be activated and explains why.
5. Confirm Event Review add/edit and Events edit show the selected definition.
6. Process a disposable document with LM Studio and capture the request or backend test evidence that
   active name/description pairs were sent before any suggestion.
7. Confirm an AI-suggested type remains inactive and its draft description is editable.

Prefer a disposable document and temporary type named `Verification — event type description`. If
that type is created in the owner's real database, delete it before completion only when the API
reports `in_use: false`; never delete owner-created types or events.

- [x] **Step 3: Update Project Knowledge with measured results**

Mark the Feedback Backlog item resolved only after all requirements are verified. Update Current
Status with the exact continuation point and test counts. Add one meaningful log entry and change
this plan's status to `completed`. Do not modify the North Star or Roadmap because this implements an
approved refinement without changing MVP milestones.

- [x] **Step 4: Validate Project Knowledge**

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: `0 error(s), 0 warning(s)`.

- [x] **Step 5: Inspect the final change set**

```powershell
git status --short
git diff --check
git diff --stat
```

Expected: only task-related files, no whitespace errors, no unexpected generated or owner files.

- [x] **Step 6: Commit Task 6**

```powershell
git add project-knowledge frontend backend
git commit -m "docs: record event type description verification"
```

## Completion checklist

- [x] Database migration upgrades and downgrades safely.
- [x] API returns normalized descriptions and enforces activation rules.
- [x] Legacy active blank types remain usable until deactivated.
- [x] A blank inactive type cannot become active through Settings, single approval, or approve-all.
- [x] AI draft descriptions persist only on newly suggested inactive types.
- [x] Existing human definitions are never overwritten by extraction.
- [x] LM Studio receives active names and descriptions in deterministic order.
- [x] Settings manages name and description together and explains blocked activation.
- [x] Event Review add/edit and Events edit show the selected description.
- [x] Filters and compact summaries remain name-only.
- [x] Backend and frontend full suites, lint, build, browser checks, and OKF validation pass.

## Related knowledge

- [Event Type Descriptions and AI Classification](../decisions/Event-Type-Descriptions-and-AI-Classification.md)
- [Feedback Backlog](../Feedback-Backlog.md)
- [Current Status](../Current-Status.md)
- [North Star](../North-Star.md)
