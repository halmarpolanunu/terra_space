---
type: Implementation Plan
title: Event Taxonomy Tree Implementation Plan
description: Safely introduces the approved four-level Event Taxonomy tree and tree-plus-inspector workspace.
tags: [project-knowledge, plan, event-types, taxonomy, terra-sense]
status: completed
okf_version: "0.1"
---

# Event Taxonomy Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use \`superpowers:subagent-driven-development\` (recommended) or \`superpowers:executing-plans\` to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Replace Terra Sense's flat Event Type list with the approved four-level Event Taxonomy tree and calm tree-plus-inspector management workspace.

**Architecture:** A new \`taxonomy_nodes\` adjacency-list table holds the four node levels. A leaf links to one existing Event Type, so event references remain on \`events.event_type_id\`; the API returns both the nested tree for management and an ordered path for each Event Type.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Next.js, TypeScript, Vitest, pytest, Docker Compose, SQLite.

## Global Constraints

- Keep event records, sources, attachments, actors, locations, duplicate flags, and settings.
- Only active Event Type leaves may be assigned to events or offered to LM Studio.
- Keep English interface copy; use \`Event Taxonomy\` as the page title.
- Exclude drag-and-drop, arbitrary ordering, and workflow editing.
- Back up before migrating the owner database and verify \`PRAGMA foreign_key_check\` afterward.
- Local AI must return an exact active leaf name or \`null\`; it must never suggest a type.

---

## File structure

- Create \`backend/alembic/versions/0009_event_taxonomy_tree.py\` for the table, seed tree, and Airstrike migration.
- Modify \`backend/app/db/models.py\`, \`backend/app/schemas/event.py\`, \`backend/app/services/events.py\`, and \`backend/app/api/routes/events.py\` for model/API behavior.
- Modify \`backend/app/api/routes/processing.py\` and \`backend/app/services/lm_studio.py\` to pass full leaf paths to LM Studio.
- Create \`frontend/src/app/sense/taxonomy-tree.tsx\` and \`frontend/src/app/sense/taxonomy-inspector.tsx\`; replace the flat list in \`frontend/src/app/settings/event-type-settings.tsx\`.
- Modify \`frontend/src/app/sense/event-types-workspace.tsx\`, \`frontend/src/lib/events-api.ts\`, \`frontend/src/lib/settings-api.ts\`, \`frontend/src/app/globals.css\`, Event Review/Events type pickers, and their focused tests.

### Task 1: Add the data model and safe seed migration

**Files:**
- Create: \`backend/alembic/versions/0009_event_taxonomy_tree.py\`
- Modify: \`backend/app/db/models.py\`
- Modify: \`backend/tests/test_migration_0008.py\`

**Interfaces:** Produces \`TaxonomyNode(id, name, level, parent_id, event_type_id)\`, where levels are \`domain\`, \`category\`, \`subcategory\`, and \`event_type\`.

- [ ] **Step 1: Write the failing migration test**

~~~python
def test_0009_creates_tree_and_untypes_legacy_airstrike(tmp_path: Path) -> None:
    # Seed 12 approved types, Airstrike, and a draft event using Airstrike.
    # Upgrade 0008 -> 0009.
    # Assert 3 domains, 12 linked leaves, no Airstrike, and the draft event has NULL type.
    # Assert connection.execute(text("PRAGMA foreign_key_check")).all() == [].
~~~

- [ ] **Step 2: Confirm the test fails**

Run: \`docker compose exec -T backend pytest tests/test_migration_0008.py -q\`  
Expected: FAIL because revision \`0009_event_taxonomy_tree\` is absent.

- [ ] **Step 3: Implement model and migration**

~~~python
class TaxonomyNode(TimestampedModel, Base):
    __tablename__ = "taxonomy_nodes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255))
    level: Mapped[str] = mapped_column(String(16))
    parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("taxonomy_nodes.id", ondelete="RESTRICT"), nullable=True
    )
    event_type_id: Mapped[str | None] = mapped_column(
        ForeignKey("event_types.id", ondelete="SET NULL"), unique=True, nullable=True
    )
~~~

Create only the new table, seed the exact approved paths, and link the twelve exact leaf names. If legacy Airstrike exists, set its draft events to \`NULL\` before deleting it and raise a clear migration error for a non-draft reference. If it is absent, do nothing: the owner database already has the intended state. Downgrade drops taxonomy nodes but retains Event Types/events.

- [ ] **Step 4: Run migration tests**

Run: \`docker compose exec -T backend pytest tests/test_migration_0008.py -q\`  
Expected: PASS for upgrade, downgrade, exact tree, retained draft event, and foreign-key integrity.

- [ ] **Step 5: Commit**

~~~powershell
git add backend/app/db/models.py backend/alembic/versions/0009_event_taxonomy_tree.py backend/tests/test_migration_0008.py
git commit -m "feat: add event taxonomy tree migration"
~~~

### Task 2: Expose and validate the taxonomy API

**Files:**
- Modify: \`backend/app/schemas/event.py\`
- Modify: \`backend/app/services/events.py\`
- Modify: \`backend/app/api/routes/events.py\`
- Modify: \`backend/tests/test_event_types_actors_api.py\`

**Interfaces:** Produces \`GET /api/event-taxonomy\`; node create/update/delete endpoints; and \`EventTypeRead.taxonomy_path: list[TaxonomyPathSegment]\`.

- [ ] **Step 1: Write failing API tests**

~~~python
def test_taxonomy_returns_nested_nodes_and_leaf_paths(client) -> None:
    tree = client.get("/api/event-taxonomy").json()
    assert tree[0]["level"] == "domain"
    assert tree[0]["children"][0]["children"][0]["children"][0]["event_type"]["name"]

def test_taxonomy_rejects_invalid_parent_level(client) -> None:
    response = client.post("/api/event-taxonomy/nodes", json={"name": "Bad", "level": "event_type"})
    assert response.status_code == 422
~~~

- [ ] **Step 2: Confirm the tests fail**

Run: \`docker compose exec -T backend pytest tests/test_event_types_actors_api.py -q\`  
Expected: FAIL because taxonomy routes and path fields do not exist.

- [ ] **Step 3: Implement schemas, service, and routes**

~~~python
TaxonomyLevel = Literal["domain", "category", "subcategory", "event_type"]

class TaxonomyNodeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    level: TaxonomyLevel
    parent_id: str | None = None
    description: str | None = Field(default=None, max_length=1000)
~~~

Accept only root→domain, domain→category, category→subcategory, and subcategory→event_type. Creating a leaf creates a linked active Event Type with required description. Reject deletion of nodes with children and leaf deletion while events reference it. Keep current name, description, and activation checks.

- [ ] **Step 4: Run API regression tests**

Run: \`docker compose exec -T backend pytest tests/test_event_types_actors_api.py tests/test_events_api.py -q\`  
Expected: PASS for legal edges, invalid edges, safe deletion, nested paths, and existing event edits.

- [ ] **Step 5: Commit**

~~~powershell
git add backend/app/schemas/event.py backend/app/services/events.py backend/app/api/routes/events.py backend/tests/test_event_types_actors_api.py
git commit -m "feat: expose managed event taxonomy API"
~~~

### Task 3: Keep local AI classification closed and leaf-only

**Files:**
- Modify: \`backend/app/api/routes/processing.py\`
- Modify: \`backend/app/services/lm_studio.py\`
- Modify: \`backend/tests/test_processing.py\`
- Modify: \`backend/tests/test_lm_studio_extraction.py\`

**Interfaces:** Produces \`KnownEventType(name: str, description: str, path: str)\` and sends only active linked leaves to LM Studio.

- [ ] **Step 1: Write the failing prompt test**

~~~python
def test_extract_events_sends_leaf_path_and_allows_only_exact_leaf_or_null() -> None:
    # Assert the prompt contains the full Military Mobilization path.
    # Assert ExtractedEventType still has exactly {"existing"}.
    # Assert closed-taxonomy wording remains present.
~~~

- [ ] **Step 2: Confirm the test fails**

Run: \`docker compose exec -T backend pytest tests/test_lm_studio_extraction.py tests/test_processing.py -q\`  
Expected: FAIL because \`KnownEventType\` has no \`path\`.

- [ ] **Step 3: Implement path context**

~~~python
@dataclass(frozen=True)
class KnownEventType:
    name: str
    description: str
    path: str
~~~

Label the path as classification context. Require the exact supplied leaf name in \`existing\` or \`null\`; add no suggested-type field and never send parent nodes as choices.

- [ ] **Step 4: Run extraction tests**

Run: \`docker compose exec -T backend pytest tests/test_lm_studio_extraction.py tests/test_processing.py tests/test_extraction_validation.py -q\`  
Expected: PASS; closed-taxonomy behavior is unchanged.

- [ ] **Step 5: Commit**

~~~powershell
git add backend/app/api/routes/processing.py backend/app/services/lm_studio.py backend/tests/test_processing.py backend/tests/test_lm_studio_extraction.py
git commit -m "feat: give local AI event taxonomy paths"
~~~

### Task 4: Build the calm tree-plus-inspector workspace

**Files:**
- Create: \`frontend/src/app/sense/taxonomy-tree.tsx\`
- Create: \`frontend/src/app/sense/taxonomy-inspector.tsx\`
- Modify: \`frontend/src/app/sense/event-types-workspace.tsx\`
- Modify: \`frontend/src/app/settings/event-type-settings.tsx\`
- Modify: \`frontend/src/lib/events-api.ts\`, \`frontend/src/lib/settings-api.ts\`, and \`frontend/src/app/globals.css\`
- Modify: \`frontend/tests/event-type-settings.test.tsx\`, \`frontend/tests/event-card.test.tsx\`, and \`frontend/tests/events-page.test.tsx\`

**Interfaces:** Consumes \`listEventTaxonomy(): Promise<TaxonomyNodeRead[]>\`; produces a left \`aria-label="Event taxonomy tree"\` and a selected-node inspector.

- [x] **Step 1: Write failing frontend tests**

~~~tsx
it("shows a collapsible tree and selected-node inspector", async () => {
  render(<EventTypesWorkspace />);
  expect(await screen.findByRole("heading", { name: "Event Taxonomy" })).toBeVisible();
  expect(screen.getByLabelText("Event taxonomy tree")).toBeVisible();
  expect(screen.getByRole("button", { name: "Edit event type" })).toBeVisible();
});
~~~

- [x] **Step 2: Confirm the tests fail**

Run: \`docker compose exec -T frontend npm run test -- event-type-settings.test.tsx\`  
Expected: FAIL because the current page renders repeated flat-row forms.

- [x] **Step 3: Implement the selected UI behavior**

Default-expand domains and select the first leaf. Show details/actions only in the inspector. Offer only valid next-level actions, hide edit fields until Edit is clicked, require confirmation for delete/deactivate, and expand matching ancestor paths while searching name/description. In Event Review/Events, keep leaf picker values/payloads unchanged and show the selected leaf's path; never offer parent nodes.

- [x] **Step 4: Run frontend tests**

Run: \`npm run test\`, \`npm run lint\`, \`npm run build\` locally (no Docker needed — node_modules
already installed).
Expected: PASS; the inspector stacks below the tree at narrow widths without horizontal overflow.
Actual: 187/187 tests, clean lint, successful build.

- [x] **Step 5: Commit**

Bundled into the single combined commit `feat: deliver Event Taxonomy tree and prior uncommitted
feature work` (`0973b2d`) rather than its own commit — see Task 5 Step 4 and Current-Status.md for
why the frontend and backend work landed together.

### Task 5: Verify and deploy safely

**Files:**
- Modify: \`project-knowledge/Current-Status.md\`
- Modify: \`project-knowledge/Project-Knowledge-Log.md\`
- Modify: this plan's status after completion.

- [x] **Step 1: Run complete isolated verification**

Actual (local tooling, not `docker compose exec`, since the running containers predate this code
and have no source bind-mount — see Current-Status.md): 187/187 backend tests (fresh `uv`-base
container), 187/187 frontend tests, clean lint, successful production build.

Expected: all suites pass before owner data is touched.

- [x] **Step 2: Back up and inspect owner data read-only**

Backup: `data/database-backups/2026-07-19_140115/terra-space.db`. No `Airstrike` Event Type existed
at all in the live database (so its removal path was a safe no-op). See Current-Status.md for the
pre-existing corrupted-remnant finding discovered and fixed during this step.

- [x] **Step 3: Apply migration and verify**

Ran \`docker compose up -d --build\`. Verified revision \`0009_event_taxonomy_tree\`, 33 taxonomy
nodes (3 domains, 6 categories, 12 subcategories, 12 leaves), no Airstrike, empty
\`PRAGMA foreign_key_check\`, and unchanged event/event-type/document counts. Inspected
\`/sense/event-types\`, \`/events\`, and \`/event-review\` read-only in the owner's real browser.

- [x] **Step 4: Final documentation and commit**

Documentation recorded in Current-Status.md. Committed as `feat: deliver Event Taxonomy tree and
prior uncommitted feature work` (`0973b2d`), merged to `main`, and pushed to GitHub at the owner's
request. The commit message notes it bundles this plan with several earlier, already-verified
features that had also accumulated uncommitted — see Current-Status.md for why they couldn't be
split into separate commits.

## Self-review

- Tasks 1–2 cover the database-backed tree and safe Airstrike removal.
- Task 3 preserves closed AI taxonomy while adding path context.
- Task 4 implements the selected calm tree-plus-inspector UI and leaf-only pickers.
- Task 5 covers backup, migration, automated verification, and documentation.
- Types appear before use: \`TaxonomyNode\`, \`TaxonomyPathSegment\`, \`EventTypeRead.taxonomy_path\`, then \`KnownEventType.path\`.

## Completion note (2026-07-19)

All five tasks are implemented, verified, applied to the owner's live database, committed, merged
to `main`, and pushed to GitHub (see [Current-Status.md](../Current-Status.md) for full detail).

Summary of what happened, in order: Tasks 1–3 (backend) were reviewed/verified first (187/187
backend tests, including a fix for 6 stale test fixtures and a confirmed-correct approval guard).
Task 4 (frontend tree-plus-inspector UI) was then implemented and verified (187/187 frontend tests,
clean lint, successful build, plus a real pre-existing bug fix in the Events approved-event editor
found along the way). Mid-session the owner's laptop crashed from process load; recovered by tearing
down the extra QA process/container and restarting only the owner's normal containers, then pausing
for the owner's go-ahead before Task 5. Task 5 (backup + live migration) then found and fixed a
pre-existing data issue unrelated to this session's own work — a stray, incompletely-applied
`taxonomy_nodes` table already sitting in the live database from an earlier, unrecorded migration
attempt — before safely backing up, verifying, and applying the migration to the owner's live
database.

## Navigation

- [Event Taxonomy Tree and Management](../decisions/Event-Taxonomy-Tree-and-Management.md)
- [Closed Event Type Taxonomy](../decisions/Closed-Event-Type-Taxonomy.md)
- [Project Knowledge](../Project-knowledge-Index.md)
