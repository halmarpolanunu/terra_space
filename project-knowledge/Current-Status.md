---
type: Project Status
title: terra_space Current Status
description: Current continuation point for Terra Space MVP.
tags: [project-knowledge, status]
status: active
---

# terra_space Current Status

## Latest update

**2026-09-24 Home insight visual pass:** the owner found the lower Home charts and latest-event
list too plain after the cinematic first-screen change. Home now presents the most common event
types as a compact ranked chart with the remaining types in an expandable list, dated events as
monthly columns, and qualification as a proportion chart with linked counts. Unknown event dates
remain separate and publication dates are explicitly excluded. Recent signals are linked event
cards with type and status, including a featured first card. This pass uses the existing Phase 5
data and visual assets; it changes no database or n8n content. The next review is the owner's
assessment of the full Home composition in pull request #2, followed by deciding whether to
extend this visual language to older screens and Settings.

**2026-09-24 cinematic UI refinement in progress:** after reviewing the first pull request, the
owner said its buttons, text, and repeated boxes felt too rigid. The owner approved a more
cinematic Atlas-first visual example. The open `codex/guided-command-center` branch now uses a
compact top navigation on Home, Explore, and Prepare. Home places the real interactive globe in
a large first-screen canvas with one context overlay and linked totals; Explore gives its map a
full-width canvas; Prepare's six stages are a connected progression rather than equal cards.
The older routes retain their existing navigation, and no database or n8n data changed. A live
browser check with 109 current Phase 5 records showed the real globe and 31 mapped records.
The three focused workspace test files passed 10/10, and the changed components passed ESLint
and a final production build. Live browser review confirmed the globe and stage counts; a narrow
viewport check confirmed the Home headline, actions, globe, and context panel stack without
horizontal clipping. Project Knowledge validation passed with 0 errors and 0 warnings. The
refinement is ready for owner review in pull request #2; the next product decision is whether
this visual language should be carried into the older screens and Settings.

**2026-09-23 guided command center live-data review:** the
owner chose native execution. The `codex/guided-command-center` branch now has four primary
destinations (Home, Explore, Prepare, Settings), a shared Phase 5 view model, a globe-led Home
with linked charts, filtered map/timeline/list and evidence detail in Explore, a read-only six-stage
Prepare view, and a presentation URL state. Existing routes remain reachable with clear earlier
labels. A final review fixed shared map markers, rapid search input, pending qualification links,
date and geography interpretation, and explicit Prepare count scopes. With Docker running, the
local app and Supabase were started; the generated offline map and local `.env` were copied from
the owner's main checkout into this worktree for review. No data was written. The real API returned
109 Phase 5 records, including 99 Final, 10 Not Final, and 31 with resolved Event Geography. The
globe rendered with real pins, a shared marker opened each event, Explore showed source evidence,
and presentation mode retained the data labels. Live review also found a narrow-screen evidence
panel overlap and a Prepare API tied to an old table. Both were fixed. Prepare now reads 50 current
source reviews and 109 candidates; 10 candidates need review. Among 109 retained Phase 5 records,
10 Phase 4 results need review and 56 are safely incomplete. Prepare's Phase 5 counts still exclude
failures before a prepared record exists. The older Event Review route now reads the current split
Phase 2/3 tables as well; a live check showed 50 source reviews. Frontend verification:
243 tests, lint, and production build passed; the backend compiled and the new read endpoint
returned 50 reviews. An isolated Chrome renderer checked effective 90%, 100%, 110%, 125%, and
150% layout widths without horizontal clipping. A 16:9 capture prompted a smaller Home header so
the globe is visible sooner; a follow-up 16:9 capture confirmed the layout and map render. Direct
page-zoom controls in the in-app browser did not respond, so exact Chrome/Edge page-zoom behavior
remains an optional manual check. No n8n workflow or database content was changed by this redesign.
Next: choose whether to merge locally, push a review branch, or keep the worktree for further review.

**2026-09-23 redesign plan ready for owner review:** the owner approved the written guided command
center design. A six-task [implementation plan](plans/2026-09-23-guided-command-center-redesign.md)
now covers a verified read-only baseline, shared Phase 5 data model, four-part navigation, new
Home/Explore/Prepare routes, presentation state, and real-data visual QA. Existing routes remain
available. Next: owner reviews the plan and chooses an execution approach before product UI work.

**2026-09-23 UI and UX redesign draft ready for review:** the owner chose equal emphasis between
daily clarity and portfolio presentation, approved a guided command center, four main destinations
(Home, Explore, Prepare, Settings), reuse of the current brand, backgrounds, and globe, and Phase 5
as the primary event set. The written [redesign draft](decisions/Terra-Space-Guided-Command-Center-Redesign.md)
records the proposed screen behavior, data boundaries, assets, and verification. The live app was
not running during the code and asset audit. Next: owner review of the written design, then a
separate implementation plan before UI changes.

**2026-09-22 Portable n8n setup package completed:** the repository now carries a
credential-free export of all seven current Terra Space workflows under
tools/n8n/portable/workflows. The package includes a checked import command for a Docker n8n
container, a machine-readable manifest, and a test that confirms each export is present, inactive,
and does not contain credential markers. All seven exported workflows passed n8n runtime
validation with zero errors and zero warnings. The other device still needs its own local Supabase,
HTTP Basic Auth replay, and LM Studio setup; credentials and existing database data remain local.

**2026-09-22 Terra Space objects moved into their dedicated schema:** after owner approval,
moved all 24 live `terra_space_*` tables, their eight identity sequences, and six supporting views
from PostgreSQL `public` to the existing `terra_space` schema. No pipeline data was deleted or
processed. The Phase 5 fingerprint counts remain 109 prepared, 109 classified, 109 timeline and
geography, zero duplicate recommendations, and 99 `FINAL` plus 10 `NOT_FINAL` qualifications.
The backend read-only queries and Phase 5 workflow now use `terra_space`; all 30 workflow Supabase
nodes were changed together, then n8n validation passed with 73 nodes, 88 valid connections, zero
errors, and zero warnings. The workflow remains inactive. Next: verify the live application after
its services are started; do not execute the pipeline without owner approval.

**Portable workflow setup:** the credential-free inactive Phase 5 workflow export is versioned at
`tools/n8n/terra-space-phase5-workflow.json`, so it can be imported on another local device.
That device must connect its own Supabase and LM Studio credentials before the workflow can run.

**2026-09-22 Phase 5E full missing-only baseline completed; stopped for owner review:** after
explicit approval, a final read-only check confirmed exactly 106 unqualified Phase 5 event records
and unchanged protected Phase 1-5D content fingerprints. n8n execution `2198` then ran only the
temporary MCP-to-Phase-5E branch, filtered to those 106 records. It created exactly 106 latest and
106 append-only history rows, bringing Phase 5E to 109 latest and 109 history rows: 99 `FINAL`
and 10 `NOT_FINAL`. The three earlier pilot rows remain unchanged. Execution evidence shows only
the MCP trigger and 18 Phase 5E nodes ran: no Phase 5A-5D, LM Studio, merge, or publish node ran.
The workflow was immediately deactivated, normal MCP-to-Phase-5A wiring restored, and the
temporary filter removed. It validates with 73 nodes, 88 valid connections, zero errors, and zero
warnings. The live API/UI remains unchecked because the application was not running. Next: owner
review before any further pipeline work; UI/UX changes remain deferred.

**2026-09-22 Phase 5E three-event pilot passed; stopped for owner review:** the owner approved
the lean qualification design, implementation plan, and separate Task 1–5 checkpoints. GPT-5.6
Terra implemented the deterministic qualifier, additive latest/history storage, the 5E branch in
the existing single n8n workflow, and a separate read-only Phase 5 Events/Dashboard display.
The owner-approved pilot ran only Phase 5E for three exact IDs in execution `2197`: two `FINAL`
and one `NOT_FINAL`, matching the read-only forecast. Each has one latest and one history row.
Phase 1–5D counts stayed unchanged, but no pre-run content fingerprint was captured, so row-level
identity was not verified by hash. No model, upstream, merge, or publish nodes ran. The workflow
is inactive, normal wiring restored, temporary pilot filter removed, and validates with 73 nodes,
88 valid connections, zero errors/warnings. Frontend tests (227/227), lint, build, and a focused
containerized backend projection test passed. The live Terra Space API/UI was not checked because
the application was not running. Next: review the pilot and live app display before deciding on a
full 109-event 5E run; no full run or workflow activation is authorized yet.

**2026-09-21 Phase 5D pilot filter removed; accepted for the current baseline:** after the owner
approved the lean next step, removed only the temporary eight-ID pilot filter from the existing
Phase 5 workflow and its local backup. No execution was started. The workflow remains inactive and
validates with 54 nodes, 68 valid connections, zero errors/warnings. All 169 JavaScript tests pass;
Phase 5A-5C still have 109 rows each and Phase 5D latest/history remain empty. The full 109-event
baseline was already evaluated read-only under the strict rule: 31 same-date pairs, zero qualifying
recommendations. No full data run is needed for this unchanged baseline. The live positive-write
path has not been exercised because no real pair qualifies. Next: stop before Phase 5E and review
its lean qualification rules with the owner.

**2026-09-21 Phase 5D eight-event pilot completed; stopped for owner review:** after explicit
approval, added an exact eight-ID temporary filter to the Phase 5D comparison Code node, verified
all Phase 5A-5C pending queues were empty, then ran the existing Phase 5 workflow once through
its MCP webhook as execution `2195`. The run finished successfully and considered eight events:
28 unordered pairs, 23 excluded by the actual-date gate, five excluded by the strict title gate,
zero recommendations, and zero Phase 5D writes. Execution details show no Phase 5A-5C write node,
no LM Studio call, and no Phase 5D write node ran. Phase 5A-5C each remain at 109 rows with
identical before/after fingerprints; Phase 5D latest/history remain empty. The workflow was
deactivated immediately and validates with 54 nodes, 68 valid connections, zero errors/warnings.
The temporary eight-ID pilot filter remains in place. Next: owner reviews the pilot. The live
positive-write path remains untested because no current pair meets the approved strict rule;
do not remove the filter or run the full baseline without separate approval.

**2026-09-21 Phase 5D workflow edit saved; stopped before pilot:** after the owner's go-ahead,
added Phase 5D to the existing inactive Phase 5 n8n workflow through its MCP. The Phase 5C
empty-queue/completed-batch handoff now emits one control item, and Phase 5D reads the saved
5A/5C records, recommends only strict exact-date duplicates, and writes only its own latest and
history tables when a pair qualifies. n8n runtime validation reports 54 nodes, 68 valid
connections, zero errors, and zero warnings; all 168 JavaScript tests pass. A read-only run of the
matcher on the current 109-event baseline found 31 same-date pairs, all excluded by the strict
title gate, so the current expected recommendation count is zero. Phase 5D latest/history tables
still contain zero rows and the workflow remains inactive. n8n ungrouped the Phase 5C canvas
group label while saving; its nodes and connections remain intact. Next: owner review and separate
approval before any pilot execution.

**2026-09-21 Phase 5D storage migration applied; stopped before workflow edit:** after explicit
owner approval, applied the additive Phase 5D migration to local Supabase. Both new recommendation
tables have RLS enabled and contain zero rows. The rollback-only SQL contract passes. Phase 5A,
5B, and 5C each still contain 109 rows, with exactly the same before/after fingerprints. No
existing events were changed, and no n8n workflow was edited or run. Next: prepare and review the
Phase 5D workflow change before separately approved application.

**2026-09-21 Phase 5D matcher and migration artifacts prepared; stopped before application:**
the strict deterministic matcher and seven focused tests are in place. The complete JavaScript
suite passes 155/155. A Phase 5D additive migration and rollback-only SQL contract were created;
the contract first failed as expected without the tables, then passed when the migration was staged
inside a transaction that rolled back. Read-only confirmation found both Phase 5D tables still
absent and all 109 Phase 5A event records unchanged. The workflow has not been edited or run.
Next: owner approval is required before applying the migration; workflow editing and pilot execution
each remain separate later gates.

**2026-09-21 Phase 5D design and implementation plan ready for owner review:** the owner chose deterministic-only,
strict possible-duplicate recommendations for pairs that describe the same action on the same
actual exact date, comparing both same-article and cross-article records. Different actions in one
story stay separate. The draft [Phase 5D Deterministic Duplicate Recommendations](decisions/Phase-5D-Deterministic-Duplicate-Recommendations.md)
defines conservative lexical and specific-subject gates, explainable outputs, and no automatic
merge or publication. The [Phase 5D implementation plan](plans/2026-09-21-phase-5d-deterministic-duplicates.md)
breaks work into matcher, storage, workflow, and pilot checkpoints. No Phase 5D table, workflow
node, pilot, or data run exists. The single Phase 5 workflow remains inactive. Next: owner reviews
the plan before implementation.

**2026-09-21 Phase 5C full baseline completed; stopped before Phase 5D:** after the owner accepted
the pilot and authorized continuation, removed only the temporary 12-ID filter, confirmed exactly
97 pending inputs, and ran them once through the permanent MCP webhook. The complete baseline now
has 109 latest rows, 109 unique history rows, zero pending inputs, zero failed results, and 110
deduplicated `SYSTEM_UNRESOLVED` suggestions covering all 110 unique unresolved subjects. Read-only
audit found zero invalid event-coordinate mappings, zero invalid actor-coordinate mappings, zero
timeline-basis mismatches, and zero duplicate latest/history identities. The suggestion path now
batch-deduplicates before direct insertion, avoiding the n8n lookup node that collapsed empty
results. Focused tests pass 35/35; n8n validates with 39 nodes, 50 valid connections, zero errors,
and zero warnings. The workflow is inactive. The legacy rollback contract is not reusable against
populated Phase 5C tables because its synthetic identity now collides with a real row; its failed
transaction changed nothing. Phase 5C-specific advisors show only expected RLS/no-policy and
unused-index informational notices. Next: stop for owner review before designing Phase 5D.

**2026-09-21 Phase 5C 12-event pilot audited; stopped for owner acceptance:** the pilot has exactly
12 latest rows, 12 history rows, and zero selected inputs pending. A rollback-tested additive
backfill derived only from the saved unresolved event/actor fields inserted the 13 suggestions
missed by execution `2193`; together with the two earlier rows, all 15 unique unresolved subjects
now have one `SYSTEM_UNRESOLVED` suggestion. The audit found zero missing suggestion links, zero
invalid event-coordinate mappings, zero invalid actor-coordinate mappings, zero failed results,
and zero timeline-basis mismatches. The corrected batch workflow validates with 42 nodes, 53 valid
connections, zero errors, and zero warnings, and remains inactive. Next: owner accepts or rejects
the pilot. Do not remove the 12-ID filter or process the remaining 97 baseline events yet.

**2026-09-19 Phase 5C pilot indexes applied; stopped before Task 6:** after explicit owner approval,
added exactly two covering indexes for `phase5b_classification_id` on the Phase 5C latest and
history tables. The two Phase 5C unindexed-foreign-key notices are gone. This changed no event
data: suggestions/results remain 0/0 and all 109 inputs remain pending. The Phase 5 workflow is
still inactive. Next: request separate approval for the controlled 12-event Task 6 pilot.

**2026-09-19 Phase 5C Task 5 workflow edit completed; stopped before Task 6 pilot:** after explicit
owner approval, added 13 Phase 5C nodes to the same Phase 5 n8n workflow through the n8n MCP. The
new group starts only after Phase 5B completes, processes one event at a time, uses only approved
references, keeps unmatched locations/actors visible as deduplicated `SYSTEM_UNRESOLVED`
suggestions, and writes one latest plus one history result. It makes no model call and adds no
Phase 5D/5E placeholder. A live lookup prevents repeated unresolved names across events from
causing duplicate-insert failures. n8n runtime validation reports 42 nodes, 56 valid connections,
zero invalid connections, zero errors, and zero warnings. The focused workflow contract passes
7/7, all 147 JavaScript tests pass, and the rollback-only database contract passes with protected
fingerprints unchanged. The workflow remains inactive; suggestions/results remain 0/0, and all
109 inputs remain pending because nothing was executed. Next: stop for owner review before the
controlled 12-event Task 6 pilot. The two required foreign-key indexes were subsequently applied.

**2026-09-19 Phase 5C Task 4 pure transformer completed; stopped before Task 5:** added the
standalone timeline, event-geography, actor-geography, suggestion, and result-building functions
plus 17 focused tests. The complete JavaScript suite passes all 140 tests. Test-first review caught
and fixed two edge cases: multiple aliases for the same approved place no longer cause a false
partial status, and invalid out-of-range coordinates are rejected. The code makes no network or
filesystem calls, no n8n workflow was edited or run, and no Phase 5C event was processed. The
single Phase 5 workflow remains inactive. Next: stop for owner review before Task 5 workflow edit.
The two known non-blocking foreign-key indexes still require separate approval before the pilot.

**2026-09-19 Phase 5C Task 3 safe reference seed applied and verified; stopped before Task 4:**
after explicit owner approval, inserted exactly 38 geographic references and 24 actor references.
No suggestion, latest-result, or history row was created; all 109 inputs remain pending. Verified
projected coverage is 32/48 location occurrences across 21 events and 55/164 actor occurrences
across 30 events. The full rollback-only database contract passes after replacing its former real
`United States`/`US` fixture aliases with isolated fictional `Contractland` aliases; this changed
test fixtures only, not production data or behavior. The Phase 5 workflow is present and inactive
according to the n8n MCP inventory. No Phase 5C security warning was reported. Two known
non-blocking missing foreign-key indexes still require a small separately approved migration before
the pilot. Next: stop for owner review before Task 4 transformer implementation.

**2026-09-18 Phase 5C Task 3 safe reference seed ready but not applied:** trimmed the draft to
remove mixed-context Iran, Syria, and Ukraine country references plus their dependent actor
mappings. The safe seed now contains 38 geographic references and 24 actor references. A
rollback-only double-run remained exactly 38/24, and the full Phase 5C database contract passed.
Projected initial coverage is 32 of 48 location occurrences across 21 events and 55 of 164 actor
occurrences across 30 events. Thirteen unique location labels and 97 unique actor labels remain
unresolved without guessed pins. The live Phase 5C tables remain empty, 109 inputs remain pending,
and the n8n workflow remains inactive. Next: obtain explicit approval before applying the safe
reference seed.

**2026-09-18 Phase 5C Task 3 draft seed blocked by a contextual-location design gap:** coding-agent
review created and rollback-tested a 41-geography/30-actor draft, but correctly stopped it from
application. The current global alias design cannot distinguish the same label used as a true event
location in one record and only as the subject of another; for example, `Iran` is valid for an
Iranian government appointment but not as the physical location of a warning about Iran. Applying
the draft could therefore create misleading pins. The seed is marked `DRAFT ONLY - DO NOT APPLY`.
All live Phase 5C tables still contain zero rows, the pending queue remains 109, the database
contract passes, and the n8n workflow is inactive. Next: agree on the smallest contextual
include/exclude mechanism before finalizing Task 3.

**2026-09-18 contextual reference review deferred by owner:** do not add a sixth Phase 5C review
table now and do not make review a prerequisite for processing. Context-sensitive or unmatched
locations and actors remain visible without map points. Codex or Claude may investigate them only
when the owner explicitly requests a later pipeline review. Next: trim the draft seed to universally
safe references, accept lower initial map coverage, and return to the normal Task 3 approval gate.

**2026-09-18 Phase 5C reference-review responsibility simplified:** the owner does not want to
manually review individual gazetteer matches, coordinates, actor links, or unresolved database
rows. During an owner-requested pipeline review, a coding agent such as Codex or Claude will verify
unmatched references, record sources and rationale, and leave uncertain items unresolved without a
map point. Runtime AI suggestions remain non-authoritative and cannot approve themselves. Owner
checkpoints will use aggregate results and material exceptions, with explicit approval still
required before reference rows are inserted or targeted processing is run.

**2026-09-18 Phase 5C Task 2 applied and verified; stopped before Task 3:** after explicit owner
approval, applied the additive Phase 5C foundation through the local Supabase MCP. Supabase
registered authoritative migration version `20260918110834`, and the local migration file is
aligned to that version. It defines
exactly five empty Phase 5C tables, one targeted pending view, normalized collision-safe aliases,
approved-reference-only coordinates and actor relationships, honest date-basis validation,
deduplicated direct-review suggestions, reusable aliases after a human mapping decision,
latest-plus-append-only history, indexes, RLS, API privilege restrictions, and plain-language
comments. A reviewed cross-border `special_area` may omit a single country code; ordinary country,
admin1, and city references may not. Static scope checks found one transaction, five tables, one
view, five RLS statements, six table/view privilege revocations, and no Phase 1-5B alteration,
delete, or truncate statement. The rollback-only contract now passes, all 15 protected Phase 1-5B
counts and fingerprints are unchanged, all five Phase 5C tables are empty, and the pending view
contains 109 inputs. Direct `anon` and `authenticated` grants are absent. Advisor review found only
expected empty-table notices and two non-blocking missing foreign-key indexes; add those through a
separately approved follow-up migration before the pilot. The workflow remains inactive. Next:
obtain explicit approval before Task 3 prepares any baseline reference rows.

**2026-09-11 Phase 5C Task 1 completed at the intended red-test checkpoint:** after the owner
approved working in the current dirty `main` checkout, added only the rollback-contained Phase 5C
database contract. The frozen baseline contains 109 Phase 5A latest/history records, 109 Phase 5B
latest results (56 `CLASSIFIED`, 53 `UNCLASSIFIED`, zero `FAILED`), 196 classification history
rows, 40 pending proposals, and zero Phase 5A/5B pending inputs. The contract specifies the five
approved tables, pending view, authority/status/date rules, alias-collision protection, targeted
reprocessing, immutable history, and all 15 protected Phase 1-5B fingerprints. Its first run failed
for the intended reason: `terra_space_phase5_geographic_references` does not exist. All protected
counts and fingerprints were identical afterward. No migration, reference row, workflow edit,
model call, or pipeline execution occurred; the workflow remains inactive. Next: stop for owner
review and require explicit approval before Task 2 creates or applies the additive schema.

**2026-09-11 Phase 5C design and implementation plan approved and documented; stopped before
implementation:** the owner approved a hybrid local reference design for timeline, Event Geography,
and Actor Network preparation. Authoritative coordinates and actor relationships come only from
approved local reference data; optional local AI may create a pending review suggestion but cannot
apply facts. Missing geography remains visible and does not fail an event. The initial design uses
five additive tables, one primary typed actor relationship, deduplicated direct-database review,
and targeted reruns. The approved design and test-first seven-task implementation plan are linked
below. Project Knowledge validation must pass before handoff. The Phase 5 workflow remains inactive;
no migration, reference row, workflow edit, model call, or data execution occurred. Next: begin
Task 1 only when the owner explicitly asks, then stop at every durable-data/workflow checkpoint.

**2026-09-11 Phase 5B accepted for progression; Phase 5C design checkpoint started:** the owner
accepted moving forward without first consolidating the 40 isolated Event Type proposals. Phase 5B
therefore remains accepted with a provisional 12-type taxonomy that may be refined later; proposal
review is still required before Phase 5E qualification or production release. No proposal was
approved, mapped, activated, or deleted. The Phase 5 workflow remains inactive. Read-only Phase 5C
baseline inspection found 34 of 109 prepared events with an actual event date, all 109 with a source
publication date, 44 with at least one event location (48 references total), and 90 with at least one
actor (164 references total). The active Supabase database currently has no canonical location,
actor, affiliation, or coordinate reference tables, so these must be designed and owner-approved
before Phase 5C implementation. Next: complete the Phase 5C timeline and geography design one
decision at a time; do not edit or run the workflow yet.

**2026-09-11 Phase 5B 37-record repair run passed technically; initially stopped for taxonomy review:**
owner-approved n8n execution `2148` processed exactly the prepared 37-record queue and finished
successfully. The complete baseline now has 109 latest classifications: 56 `CLASSIFIED`, 53 visible
`UNCLASSIFIED`, zero `FAILED`, and zero pending. All 109 latest results have safeguard `ACCEPT`; the
37 repaired results use classifier/safeguard prompt version `v2`, while the 72 unaffected accepted
results retain their truthful `v1` versions. There are 196 unique append-only history rows, zero
duplicate latest identities or submission keys, zero invalid active-type references, and zero
Phase 1-5A fingerprint changes. Forty proposals now exist, all isolated in `PENDING_REVIEW`, with
exact bounded evidence and no automatic mapping or activation; 13 Unclassified results have no
proposal. The proposal set contains clear overlapping families (especially legal/judicial,
legislative, cyber, defense spending, military exercises, and civilian harassment). The workflow
is inactive. This was the technical stop before the owner subsequently accepted progression to
Phase 5C with taxonomy consolidation deferred.

**2026-09-11 Phase 5B affected-record queue prepared; stopped before execution:** after explicit
owner approval and a guarded pre-delete check, removed exactly 32 latest classifications whose
status was `UNCLASSIFIED` with safeguard `REJECT`. All 32 had preserved append-only history and none
had a proposal. Verification now shows 77 latest rows (53 `CLASSIFIED`, 19 `UNCLASSIFIED`, 5
`FAILED`), all 159 history rows preserved, all 10 proposals preserved, and exactly 37 pending inputs:
32 without a latest row plus 5 retryable failures. The workflow remains inactive and execution
`2147` is still the latest run. Next: obtain separate execution approval for this exact 37-record
queue, disclose the write/model-call bounds, execute once, audit every changed result, and stop
again before Phase 5C.

**2026-09-11 Phase 5B systemic repair installed; stopped before reprocessing:** after explicit owner
approval, added two failing regression tests and then repaired only four Phase 5B Code nodes in the
existing single workflow. Classifier and safeguard prompts are now version `v2`. The classifier no
longer recopies proposal evidence; the parser deterministically attaches the complete bounded
prepared-event evidence. The safeguard now explicitly recognizes both an approved-type match and
an Unclassified result with an optional proposal as valid review modes. The live workflow remains
inactive with 29 nodes, 38 valid connections, zero validation errors, and zero validation warnings.
All 123 JavaScript tests pass, the credential-free backup is synchronized, execution `2147` remains
the latest execution, and database counts remain unchanged at 53 `CLASSIFIED`, 51 `UNCLASSIFIED`,
5 `FAILED`, 159 history rows, and 10 proposals. The existing pending view can directly retry only
the 5 FAILED rows; it intentionally excludes the 32 finalized safeguard rejections. Next: obtain
separate destructive-data approval to remove exactly those 32 latest rows while retaining their
append-only history, then obtain execution approval to reprocess the resulting exact 37-record
queue, audit every changed result, and stop again before Phase 5C.

**2026-09-11 Phase 5B failure diagnosis completed read-only:** the five retryable failures share
one chain. Four initially produced proposals with exact supporting evidence, but the safeguard
incorrectly rejected them because its prompt does not explicitly explain that an Unclassified
result may carry a valid new-type proposal. Later corrective attempts then paraphrased evidence and
failed the exact-substring parser; the fifth record paraphrased on its first attempt. Across the
full baseline, all 32 safeguard-rejected Unclassified records exhausted three attempts, and 19
final rejection reasons explicitly treated proposals as forbidden or invalid merely because no
active type was selected. In execution `2147` alone, 68 of 85 proposal-rejection attempts used that
same mistaken rationale. Recommended narrow repair: clarify the safeguard's two valid review modes
and make proposal evidence canonical from the already-bounded prepared event instead of relying on
the model to reproduce punctuation invisibly and perfectly. No workflow or data was changed or
rerun; the workflow remains inactive. Next: owner reviews and explicitly approves or rejects the
narrow repair before test-first implementation and selective reprocessing.

**2026-09-11 Phase 5B full-baseline run finished; stopped for repair review:** owner-approved n8n
execution `2147` processed all 97 records remaining after the accepted pilot. The complete 109-record
latest baseline now contains 53 `CLASSIFIED`, 51 visible `UNCLASSIFIED`, and 5 retryable `FAILED`
records. All five failures conservatively retained no assignment because proposal evidence was not
an exact excerpt of the prepared event evidence. The run produced 159 append-only history rows and
10 isolated Event Type proposals, all still `PENDING_REVIEW`; there are zero duplicate latest event
identities, zero duplicate submission keys, and zero reviewed or automatically mapped proposals.
The workflow is inactive. Phase 5B is not production-ready or accepted yet. Next: diagnose the
common exact-evidence failure and the safeguard's treatment of new-type proposals, propose a narrow
repair for owner approval, rerun only affected identities if approved, then complete verification
and stop again before Phase 5C.

**2026-09-11 Phase 5B controlled pilot accepted by the owner:** the owner accepted the verified
12-record pilot with 10 `CLASSIFIED`, 2 visible `UNCLASSIFIED`, zero `FAILED`, and one isolated
`PENDING_REVIEW` Event Type proposal. Task 6 is complete. This acceptance does not authorize the
full Phase 5B run: the exact pilot filter remains installed, the workflow remains inactive, and 97
records remain untouched. Next: obtain separate explicit approval for Task 7 before removing only
the Phase 5B pilot filter and processing those 97 records. After the full-run audit, stop again
before Phase 5C.

**2026-09-11 Phase 5B Task 6 repair passed; stopped for owner acceptance:** after the owner accepted
the narrow recommendation, the classifier prompt was changed to require proposal
`supporting_evidence` as a verbatim exact excerpt and to return no proposal when no such excerpt
exists. Regression coverage increased to 120/120 passing JavaScript tests, and live n8n validation
remained at 29 nodes, 38 valid connections, zero errors, and zero warnings. Execution `2146`
reprocessed only the two retryable pilot failures. Both are now safely `UNCLASSIFIED`: **Economic
cost of extreme heat and wildfires** passed safeguard with one exact-evidence **Climate Change
Economic Impact** proposal in `PENDING_REVIEW`; **South Korea shortens Ulchi Freedom Shield
drills** exhausted two corrective retries and was rejected by the safeguard as not matching an
approved type, with no proposal retained. The complete 12-record pilot now contains 10
`CLASSIFIED` and 2 visible `UNCLASSIFIED` results, zero `FAILED`, one proposal, 62 append-only
history rows across all preserved technical attempts, and 97 untouched pending records. The exact
pilot filter remains installed and the workflow is inactive. Next: owner accepts or rejects the
pilot. Do not remove the filter, run the remaining 97 records, or begin Phase 5C without separate
approval.

**2026-09-11 Phase 5B Task 6 pilot executed; stopped for production-readiness review:** after
owner-approved technical repairs, n8n execution `2145` processed the exact 12-record pilot through
the permanent MCP webhook. Ten records finished as `CLASSIFIED` with safeguard `ACCEPT`, zero
corrective retries, exact active Event Type references, and no technical error. Two records remain
retryable `FAILED` before safeguard because the model proposed a new Event Type but its supporting
evidence was not an exact excerpt of the prepared event evidence: **Economic cost of extreme heat
and wildfires** and **South Korea shortens Ulchi Freedom Shield drills**. The conservative boundary
worked correctly: neither failure retained a selected type, assignment, proposal, or guessed data.
The pilot has 12 unique latest identities, 60 append-only history rows across five technical pilot
attempts, zero duplicate submission keys, zero proposals, and 99 pending records. Live runtime
validation reports 29 nodes, 38 valid connections, zero errors, and zero warnings; the focused
workflow contract passes 9/9 and the full JavaScript suite passes 119/119. The exact pilot filter
remains installed and the workflow is inactive. Next: owner reviews the 10 classifications and
decides whether to approve a narrow fix for the two evidence-boundary failures. Do not run the
remaining baseline or begin Phase 5C.

**2026-09-10 Phase 5B Task 5 controlled pilot prepared; stopped before execution:** selected 12
pending Phase 5A records through read-only review and installed only their exact IDs in the Phase 5B
pending-read filter. The set contains 8 NORMAL and 4 LIMITED records; 7 lack an exact event date, 3
have no extracted actors, and 6 have no extracted locations. It spans security, diplomacy, and
economy/energy review hypotheses, including clear candidates, plausible overlaps, inherited review
status, and likely no-approved-match/proposal cases. The exact IDs and review purposes are recorded
in the Phase 5B implementation plan. The workflow contract passes all 6 tests and live runtime
validation remains at 26 nodes, 34 valid connections, zero errors, and zero warnings. The workflow
is inactive and no model call or execution occurred; database state remains 109 pending inputs and
zero Phase 5B latest, history, or proposal rows. Next: require explicit owner approval before Task 6
runs the 12-event pilot, which may make 24-72 local model calls.

**2026-09-10 Phase 5A completed and stopped before 5B:** after the owner delegated the full-run
decision, accepted the clean six-record pilot, removed only its temporary input filter, revalidated
the still-inactive workflow, and manually ran the remaining 103 records as n8n execution `2138`.
The complete Phase 5A baseline now contains 109 unique latest records and 109 unique append-only
history snapshots: 43 `VALID -> NORMAL`, 56 `INCOMPLETE -> LIMITED`, and 10 `NEEDS_REVIEW ->
LIMITED`, all `PREPARED`. There are zero pending records, failures, duplicate Phase 4 identities,
or limited records without reasons. All 109 latest records exactly match their Phase 1/3/4 source
fields and all 109 history snapshots exactly match their latest records. All eight protected
Phase 1-4 counts and fingerprints remain unchanged. The database contract and all 88 JavaScript
tests pass; n8n runtime validation and Project Knowledge validation report zero errors and zero
warnings. The credential-free backup now reflects the unrestricted pending input. The workflow
remains inactive. Next: stop for owner review and begin the separate Phase 5B Event Type design
only when the owner asks to continue.

**2026-09-10 Phase 5A six-record pilot passed and is stopped for review:** after explicit owner
approval, manually ran the inactive Phase 5 workflow once as n8n execution `2137`. It completed
successfully in about 1.4 seconds and produced exactly six latest records plus six append-only
history records: two `VALID -> NORMAL`, two `INCOMPLETE -> LIMITED`, and two `NEEDS_REVIEW ->
LIMITED`, all `PREPARED`, with zero failures. Every copied field in all six records exactly matches
its Phase 1/3/4 source, including title, description, evidence, facts, statuses, reasons, unknown
dates, and empty arrays; every history snapshot also exactly matches its latest record. The general
pending count is now 103. All eight protected Phase 1-4 counts and full-row fingerprints are
unchanged. The database contract passes with rollback, the focused transformer tests pass 8/8,
the complete local JavaScript suite passes 88/88, and n8n runtime validation reports zero errors
and zero warnings. The six-ID pilot filter remains installed and the workflow remains inactive.
Next: owner reviews the pilot. Do not remove the filter, process the remaining 103 records, or begin
5B without separate explicit approval.

**2026-09-10 Phase 5A workflow restricted to the six-record pilot:** after owner approval, added
one temporary PostgREST filter to `Get Pending Phase 5A Records` containing only the six reviewed
Phase 4 UUIDs. No eligibility rule or other node changed. Runtime validation still reports zero
errors and zero warnings; the workflow remains inactive with zero executions. The credential-free
backup now records the same pilot filter. Both Phase 5A tables remain empty and the general pending
view still contains 109 inputs. Next: obtain separate owner approval to execute the pilot once,
creating at most six latest rows and six history rows, then inspect every result and stop.

**2026-09-10 six-record Phase 5A pilot set selected read-only:** selected two exact Phase 4 IDs for
each eligible status. VALID uses sequence/candidate `46/c1` (exact date, actors and location) and
`115/c1` (unknown date, empty actors/locations); INCOMPLETE uses `73/c1` (exact date, actors and
location) and `47/c3` (unknown date, empty actors/locations); NEEDS_REVIEW uses `98/c2` (exact date,
actor and location) and `63/c1` (unknown date, actors, empty locations). Both review inputs carry
Phase 3 result-level and candidate-level review context plus a Phase 4 reason. All six are present
in the pending view. No workflow filter was changed and no execution occurred. Next: obtain owner
approval to restrict the existing Phase 5 workflow to these six exact Phase 4 IDs, revalidate, then
request separate approval before executing the pilot.

**2026-09-10 single inactive Phase 5 workflow created with 5A only:** after separate owner approval,
created n8n workflow `FAxBx6a9fnXjLfVO`, **Terra Space - Phase 5 - Generate and Qualify Events**, in
the `Terra_Space` folder. Its eight-node Phase 5A group reads the pending view in sequence/candidate
order, processes one item at a time, deterministically prepares a record, creates or retries only
the exact FAILED latest identity, and appends history. Runtime validation reports zero errors and
zero warnings. Strict validation adds two generic error-handling advisories; eligible record-level
transform errors are already converted to retryable FAILED rows, while contract/infrastructure
errors intentionally stop instead of allowing unverified writes. The workflow is inactive and has
zero executions. Its credential-free recovery export contains no credential, model call, Phase 1-4
write, 5B-5E, final-event, merge, or publication node. Phase 5A tables remain empty with 109 pending
inputs. Next: select six exact pilot candidates read-only and request separate execution approval.

**2026-09-10 Phase 5A deterministic transformer implemented and tested:** followed a red-green TDD
cycle for the pure local `preparePhase5ARecord` transformer. Eight focused tests cover exact field
copying, VALID-to-NORMAL and INCOMPLETE/NEEDS_REVIEW-to-LIMITED routing, facts deep-copying,
unknown dates and empty arrays, unsupported-status rejection, required limited reasons, unique
attempt UUIDs, and the absence of later-stage fields. The focused suite passes 8/8 and the complete
local JavaScript suite passes 88/88. No n8n workflow was created or run, and Phase 5A storage
remains empty with 109 pending inputs. Next: obtain separate owner approval to create one inactive
5A-only workflow in n8n's `Terra_Space` folder.

**2026-09-10 Phase 5A database contract applied and verified:** after separate owner approval,
applied only migration `202609100001` and recorded it in local migration history. It created two
empty RLS-protected Phase 5A tables and the retry-aware pending view. The rollback-only contract
passes, including routing, exact upstream copying, retry behavior, history retention, and upstream
immutability checks. After rollback, latest/history counts are both zero, the pending view exposes
all 109 eligible Phase 4 results, and every Phase 1-4 count and fingerprint matches Task 1 exactly.
No workflow exists and no Phase 5 event has been prepared. Next: implement and locally test the
pure deterministic Phase 5A transformer, then stop before workflow creation.

**2026-09-10 Phase 5A additive migration file prepared but not applied:** created the reviewed
`202609100001_phase5a_event_records.sql` migration file for two empty Phase 5A tables and one
retry-aware pending view. It includes deterministic NORMAL/LIMITED route constraints, exact
upstream snapshot fields, retryable technical failure support, indexes, an updated-at trigger, RLS,
and plain-language comments for all columns. Static checks found no Phase 1-4 mutation or
destructive SQL. The migration has not been run; the database still contains no Phase 5 object or
row. Next: obtain separate owner approval to apply this exact additive database change, then run
the rollback-only contract and compare all Phase 1-4 fingerprints.

**2026-09-10 Phase 5A Task 1 completed; stopped before migration:** recorded read-only counts and
stable full-row fingerprints for all eight Phase 1-4 latest/history tables, then added the
rollback-only Phase 5A database contract test. The verified Phase 4 baseline remains 109 results:
43 `VALID`, 56 `INCOMPLETE`, 10 `NEEDS_REVIEW`, zero `FAILED`, and zero pending. The first test run
failed at the intended boundary because `terra_space_phase5_pending_event_records` does not yet
exist. A second read-only fingerprint check exactly matched the starting baseline. No Phase 5
database object or row exists, and no workflow was created or run. Next: obtain explicit owner
approval before creating the additive Phase 5A migration file and later applying it.

**2026-09-10 lean Phase 5 design and 5A implementation plan prepared for owner review:** Phase 5 is
one inactive, manually started n8n workflow in the `Terra_Space` folder. Its checkpointed stages
prepare normal/limited event records, classify approved Event Types while retaining Unclassified
events, prepare honest timeline and map data, recommend possible duplicates without merging, and
make all retained events visible while qualifying safe events under rules deferred to 5E. Event
Geography and Actor Network remain distinct; publication dates are labelled timeline references,
not invented event dates. The test-first 5A plan preserves the verified 109-result Phase 4 baseline
without a model call and stops separately before migration, workflow creation, pilot, full run, and
5B. No Phase 5 migration, workflow, pilot, or data run has occurred.

**2026-09-09 clean Phase 4 baseline repaired and ready for Phase 5 design:** all 109 Phase 3
candidates have exactly one Phase 4 result and processing run, with an empty Phase 4 queue. The
final status distribution is 43 `VALID`, 56 `INCOMPLETE`, and 10 `NEEDS_REVIEW`; all ten review
results correctly inherit genuine Phase 3 review status, while incomplete results retain explicit
omission reasons. The audit found one unsafe retained location on sequence 59 candidate c1: `EU`
used evidence extending beyond the candidate boundary. After owner-approved selective deletion,
the same inactive workflow was repaired to require location evidence to stay wholly inside the
candidate boundary and the result was regenerated without that location. Final verification covers
341 retained fact-evidence fields: all are exact cleaned-source substrings and all stay inside their
candidate boundaries. There are zero failed latest results, zero failed Phase 4 history rows, zero
malformed fact payloads, and no non-valid result without a reason. Phase 5 has not been run. The
complete local suite passes 80/80 tests.

**2026-09-09 clean Phase 3 baseline repaired and ready for Phase 4:** audited all 16 originally
review-flagged candidates and repaired the existing Phase 3 workflow's detector and safeguard
prompts, evidence parser, and prompt-version tracking. Selective regeneration reduced false review
flags and eliminated non-contiguous evidence. The final latest-result baseline contains 50 results
and 109 complete candidates: 99 `VALID` and 10 genuine `NEEDS_REVIEW`; every evidence quote is an
exact cleaned-source substring, no latest result is `FAILED`, and the Phase 3 pending queue is empty.
All 109 candidates are exposed by the Phase 4 pending view. Two failed attempts for sequence 53 are
preserved only in the append-only processing history; the latest result is `VALID` and those audit
rows are not Phase 4 inputs. Phase 4 result/run tables remain empty, the workflow remains inactive,
and Phase 5 remains paused. The complete local suite passes 79/79 tests.

**2026-09-09 stale Phase 1 failure history removed:** after explicit owner confirmation, deleted
exactly 50 Phase 1 processing-run rows with outcome `FAILED` from the LM Studio-offline attempt.
Verification now shows 50 retained source articles all `completed`, exactly 50 Phase 1 runs all
`SUCCESS`, 50 Phase 2 results all `VALID`, and 50 Phase 2 runs all `VALID`. Phase 3 and Phase 4
results/runs remain empty. Twenty successful Phase 1 runs retain their truthful deterministic-
fallback warning; these are successful audited outcomes, not stale failures. Phase 5 remains paused.

**2026-09-09 clean Phase 2 baseline repaired and verified:** the deterministic named-detail
validator now checks meaningful tokens rather than requiring every detected capitalized phrase to
appear contiguously with identical punctuation. Regression coverage preserves rejection of a truly
absent multi-word person name while accepting the four audited variations. The first browser-editor
replay halted before saving because browser text entry stripped regex backslashes; the workflow was
then restored through n8n's export/import path, with the node code verified byte-for-byte against
the tested local source. With owner confirmation, the four old results and four old run rows for
sequences 98, 101, 105, and 114 were removed and selectively regenerated. Final Phase 2 state is
50 `VALID + ACCEPT + VERIFIED`, 50 distinct sources, 50 processing runs, zero errors, zero non-exact
quotes, zero Phase 2 pending, and 50 Phase 3 pending. The existing workflow remains inactive and
Phase 3–5 were not run.

**2026-09-09 clean Phase 2 review flags audited as validator false positives:** the four
`NEEDS_REVIEW` results at sequences 98, 101, 105, and 114 were grounded and accepted by the
model safeguard, but a deterministic named-phrase check rejected them incorrectly. It requires
contiguous wording even when an acronym/full-name variation is clearly supported (98), treats
separately supported possessive/name wording as unsupported (101), constructs the nonsensical
phrase `Americans of` (105), and retains terminal punctuation so `Strait of Hormuz.` fails against
the quote (114). The audit itself made no data or workflow changes; the repair and selective replay
described above subsequently resolved all four flags.

**2026-09-09 clean Phase 2 replay completed:** all 50 completed
Phase 1 sources produced exactly one Phase 2 result. The latest state is 46 `VALID + ACCEPT` and
4 `NEEDS_REVIEW + REJECT`, with no missing payloads and all 50 evidence quotes verified as exact
substrings of cleaned source text. The review-flagged sources are sequences 98, 101, 105, and 114;
their named-detail safeguard reasons were queued for focused audit before Phase 2 acceptance.
All 50 results are exposed to the Phase 3 pending view, but Phase 3 has not
been run in this clean replay. Phase 5 remains paused.

**2026-09-09 clean Phase 1 replay completed:** the first replay attempt returned all 50 sources
as `failed` because the n8n container could not reach LM Studio on port 1234. After LM Studio was
started and connectivity was confirmed from both Windows and the n8n container, the workflow was
retried successfully. Database verification now shows 50 `completed` sources, 50 non-empty cleaned
texts, and zero processing errors. Phase 2–4 result tables remain empty and Phase 5 remains paused.

**2026-09-09 clean full-pipeline replay baseline prepared:** with explicit owner confirmation,
all 826 derived result and processing-history rows were removed while all 50 original Phase 1
source articles and their metadata were retained. The removed rows were 113 Phase 1 runs, 50
Phase 2 results and 57 runs, 50 Phase 3 results and 73 runs, plus 166 Phase 4 results and 317
runs. The sources were initially reset to `draft`, which the Phase 1 queue query does not select;
after a zero-item owner run exposed this mismatch, all 50 were corrected to `queued`. Old cleaned
text and processing errors remain cleared.
Post-change verification confirmed every Phase 1–4 result/run table is empty and exactly 50
original sources remain ready for a clean replay. Phase 5 remains paused and unimplemented.

**2026-09-08 Phase 4 second ten-article batch repaired and verified:** the v10 workflow now
classifies a result as `INCOMPLETE` when an optional actor or location is rejected and safely
omitted, while technical failures and inherited Phase 3 uncertainty remain `NEEDS_REVIEW`.
The database contract was aligned to permit reason-bearing `INCOMPLETE + REJECT` results without
weakening the `VALID + ACCEPT` rule. Location levels are deterministically normalized to
`unknown` for Gaza/Gaza Strip, the Falklands, and directional regions such as southern Iran;
unresolved actor references are omitted; and source roles now require a reporting verb tied to
that actor. Eight approved results were regenerated, and the final China role correction was
applied deterministically without another model call. Final sequences 108–117 state is 8
`VALID`, 10 `INCOMPLETE`, 2 inherited `NEEDS_REVIEW`, 0 `FAILED`, 28 preserved processing
attempts, and no pending candidate. The 28-node workflow remains inactive. Phase 5 remains paused.

**2026-09-08 Phase 4 second ten-article batch run audited:** all 20 candidates exposed by the
Phase 4 pending view for sequences 108–117 were processed, with 20 history attempts and no pending
candidate. Latest status is 8 `VALID`, 8 `INCOMPLETE`, 4 `NEEDS_REVIEW`, and 0 `FAILED`.
All retained fact evidence is an exact source substring and every non-valid result has a reason.
However, 108 c2 and 113 c1 are false review tags: rejected optional actors were already omitted,
leaving usable partial results that should be `INCOMPLETE`. The audit also found location-level
errors for Gaza/Gaza Strip, southern Iran, and the Falklands, plus unresolved actor label
`the official` in 114 c3. Phase 4 is therefore technically complete but not accepted for
production quality. Repair the existing workflow and selectively regenerate only affected rows;
Phase 5 remains paused and untouched.

**2026-09-08 Phase 3 second ten-article batch repaired and selectively regenerated:** the
detector now requires complete supporting excerpts, preserves speaker attribution, and avoids
splitting one occurrence into duplicate candidates. The safeguard accepts equivalent neutral
reporting verbs, and the evidence validator now restores literal escaped paragraph breaks before
matching the exact source. Six affected sources (111, 113–117) were regenerated, followed by one
final selective retry of 113 after the newline validator repair. Final sequences 108–117 contain
21 candidates: 18 `VALID` and 3 genuine `NEEDS_REVIEW`, with 17 processing attempts preserved.
All valid evidence quotes are exact source substrings and every review has a reason. The inactive
18-node workflow validates with 0 errors and 0 warnings, and all 12 focused tests pass. Phase 4
has not run for this batch; its pending view contains 18 valid candidates and 2 review candidates
(the remaining non-exact review candidate is safely excluded). Phase 5 remains paused.

**2026-09-08 Phase 3 second ten-article batch run audited:** sequences 108–117 produced 10
latest results and 25 candidates with no failed source or pending input. Four source-level results
are `VALID`; six are `NEEDS_REVIEW`. Candidate-level status is 16 `VALID` and 9
`NEEDS_REVIEW`; every review has a reason, while one sequence 114 quote is not an exact source
substring. The review set exposes overly narrow evidence selection, unsupported wording added to
descriptions, and at least one overly literal safeguard rejection (sequence 116 candidate c3).
Phase 3 is therefore complete technically but not yet accepted for production quality. Do not run
Phase 4 for sequences 108–117 until the Phase 3 workflow is repaired and the affected sources are
selectively regenerated. Phase 5 remains paused and untouched.

**2026-09-08 Phase 2 second ten-article batch repaired and verified:** sequences 108–117 now
have 10 `VALID` latest Main Issues, no errors, and 14 preserved processing attempts. Review found
two accepted descriptions containing unsupported named people (sequences 111 and 115). The
existing Phase 2 workflow was strengthened with prompt guidance plus a deterministic named-detail
check. A regression in that check, which joined the end of a title to the start of a description,
was fixed test-first. Sequence 115 regenerated correctly, and sequence 111's already-correct
result was reclassified from the false `NEEDS_REVIEW` tag without another model call. All ten
evidence quotes occur verbatim in their source articles, all 10 focused tests pass, and the
21-node workflow validates with 0 errors and 0 warnings. It remains inactive. The ten articles
are pending Phase 3, but Phase 3 was not run; Phase 5 remains paused and untouched.

**2026-09-08 Phase 1 second ten-article batch cleaned and verified:** sequences 108–117 all
completed without processing errors. Manual inspection found leftover publisher noise in 108,
109, 113, 114, and 116: advertisement/promo text, a Reuters image caption and credit, a video
heading, and an escaped Anadolu sharing footer. The deterministic cleaner was repaired test-first
for all five formats, installed in the existing inactive 16-node Phase 1 workflow, and only those
five sources were reprocessed. Final inspection finds none of the targeted artifacts, all raw
source text remains preserved, and the batch has 15 append-only Phase 1 attempts. No Phase 2,
Phase 3, or Phase 4 result exists for sequences 108–117. Phase 2 is the next controlled step;
Phase 5 remains paused and untouched.

**2026-09-08 Phase 4 audited cleanup and final selective retry completed:** the owner-confirmed
retry regenerated only sequence 107 candidate c1 through the v9 workflow. It is now `VALID`, with
the current statement date `2026-09-01`, `reported` epistemic status, Masoud Pezeshkian and the US
as grounded actors, and no invented location. The ten-article batch now contains 17 `VALID`, 8
`INCOMPLETE`, 5 genuine `NEEDS_REVIEW`, and 0 `FAILED` latest results, with 37 append-only history
attempts and no pending candidate. Every retained evidence quote is an exact cleaned-source
substring and every incomplete/review result has a reason. All 37 focused Phase 4 tests pass. The
28-node workflow is restored to `terra_space_phase4_pending_event_candidates`, remains inactive,
and uses `phase4-narrow-extraction-v9-statement-date`; the temporary one-candidate view was removed.
The three older sequence 97 candidates remain pending and untouched. Phase 5 remains paused and
untouched.

**2026-09-08 Phase 4 incomplete-status contract and workflow repair installed:** the owner-approved
database contract now accepts `INCOMPLETE` as a safe, reason-bearing partial result distinct from
`NEEDS_REVIEW`. The same existing Phase 4 workflow now uses
`phase4-narrow-extraction-v8-incomplete-status`, normalizes grounded month names and the model
precision synonym `day`, rejects actors found only in neighboring temporal clauses, and tells the
date extractor to focus on the candidate action rather than an older referenced agreement. The
workflow remains inactive, has 28 nodes, and reads the normal pending view. All 36 focused Phase 4
JavaScript tests and the rollback-only database contract test pass. No latest result or processing
history row changed: sequences 98–107 remain 9 `VALID`, 21 `NEEDS_REVIEW`, 0 `FAILED`. The next
separate action is to obtain approval to reclassify/regenerate the audited rows; Phase 5 remains
paused and untouched.

**2026-09-08 Phase 4 review audit completed:** all 21 `NEEDS_REVIEW` results from sequences
98–107 were manually checked against their candidates, full cleaned articles, retained facts, raw
model responses, and review reasons. Five (23.8%) are false review tags where the workflow correctly
discarded an unnecessary or unsupported proposal and the remaining result is usable; seven (33.3%)
are incomplete because an optional detail is not safely stated in the candidate evidence; and nine
(42.9%) truly need review. Five true reviews inherit unsupported Phase 3 descriptions, while four
(101 c4, 105 c3, 105 c4, and 107 c1) expose Phase 4 date/focus defects. No data or workflow was
changed. The exact findings and recommended repair are in
[Phase 4 Review Audit — 2026-09-08](Phase-4-Review-Audit-2026-09-08.md). The current Phase 4
contract has no explicit incomplete status, so implementing the classification requires an approved
decision change before migration, workflow edits, and selective regeneration. Phase 5 remains
paused.

**2026-09-08 Phase 4 weekday repair regenerated and verified:** after the configured LM Studio
model was loaded, the selective retry for sequence 98 candidate c1 completed successfully. The
stored event date is now `2026-09-02` (the Wednesday after the Tuesday `2026-09-01` publication),
with `VALID`, `FACTS_FOUND`, and safeguard `ACCEPT` statuses under
`phase4-narrow-extraction-v7-weekday-direction`. The ten-article batch remains 30 latest rows: 9
`VALID`, 21 `NEEDS_REVIEW`, 0 `FAILED`; there are 32 append-only processing attempts and no pending
candidate in sequences 98–107. All retained evidence quotes are exact cleaned-source substrings,
every review row has a reason, and both Phase 4 policy dry-runs report no proposed changes across
143 stored rows. The date dry-run was corrected to include candidate title and description, making
its inputs match the live validator. The temporary one-candidate view was removed, the normal
pending view was restored, and the 28-node workflow remains inactive. The three older sequence 97
candidates remain pending and untouched. Phase 5 remains paused and untouched.

**2026-09-07 Phase 4 weekday workflow repair installed; regeneration blocked by loaded model:**
the date validator now preserves a proposed ISO date only when it matches the named weekday and is
within six days of publication. This fixes the sequence 98 c1 case (`2026-09-01` Tuesday
publication, planned Wednesday talks → `2026-09-02`) while retaining the prior deterministic
fallback for mismatched proposals. The new regression failed with the old `2026-08-26` behavior
and then passed; all 26 focused Phase 4 policy tests pass. The inactive workflow now uses
`phase4-narrow-extraction-v7-weekday-direction`. The selective live retry could not complete
because LM Studio no longer has the workflow's configured `google/gemma-4-12b-qat` model loaded;
only other models are currently listed. Its empty `NEEDS_REVIEW` placeholder was removed, leaving
sequence 98 c1 pending and all history preserved. Load the configured model, then rerun only this
candidate. Phase 5 remains paused and untouched.

**2026-09-07 Phase 4 new-batch run completed but date audit found one blocker:** an
owner-approved, batch-scoped manual run processed all 30 Phase 3 candidates from sequences 98–107
without touching the three older pending candidates from sequence 97. The batch now has 30 latest
Phase 4 rows: 9 `VALID`, 21 `NEEDS_REVIEW`, 0 `FAILED`; 30 append-only history rows; and no pending
candidate in sequences 98–107. All retained evidence quotes are exact cleaned-article substrings
and every review row has a reason. The normal workflow was restored after the scoped run and
remains inactive. Post-run date-policy validation found one new-batch error: sequence 98 candidate
c1 was assigned `2026-08-26` for talks planned on “Wednesday” even though its source was published
Tuesday `2026-09-01`; the detector's raw proposal was correctly `2026-09-02`. Phase 4 is therefore
not yet accepted for this batch. Next, repair the relative-weekday normalization and selectively
regenerate only sequence 98 candidate c1 after explicit owner approval. Phase 5 remains paused and
untouched.

**2026-09-07 Phase 3 false-positive safeguard repaired and verified:** the safeguard now
explicitly accepts meaning-preserving grammatical paraphrases, including active/passive wording,
when every factual detail is supported by the candidate's exact evidence quote. A rejection must
identify a concrete absent or contradicted fact. Only the owner-approved latest result for sequence
102 was deleted and regenerated; append-only history was preserved. Sequence 102 candidate c2 is
now correctly `VALID` with safeguard `ACCEPT`. Final ten-article state is 10 latest rows: 6
`VALID`, 4 `NEEDS_REVIEW`, 0 `FAILED`; 30 candidates (25 `VALID`, 5 `NEEDS_REVIEW`); 14 history
runs; and an empty pending view. There are no invalid exact quotes, review candidates without a
reason, or Kevin Warsh candidates. Nine focused Phase 3 regression tests pass. The workflow remains
inactive. Phase 4 was not run for this batch, and Phase 5 remains paused and untouched.

**2026-09-07 Phase 3 ten-article repair verified:** the owner-approved run of sequences 98–107
initially exposed two blockers: sequence 98 failed twice on an unescaped quotation mark inside an
otherwise usable `evidence_quote`, and sequence 106 retained two false-valid Kevin Warsh candidates
unrelated to its Bessent/Iran Main Issue. Test-first repairs now recover only the tightly bounded
malformed `evidence_quote` JSON shape and require every detected candidate to be directly relevant
to the supplied Phase 2 Main Issue. The failed sequence 98 row was retried through the normal update
path; only sequence 106's approved latest row was deleted and regenerated, with all processing
history preserved. Final batch state is 10 latest rows: 5 `VALID`, 5 `NEEDS_REVIEW`, 0 `FAILED`,
30 candidates (24 `VALID`, 6 `NEEDS_REVIEW`), 13 append-only history rows, and an empty pending
view. All candidates have complete fields; every `VALID` quote is an exact substring of its cleaned
article; every review candidate has a reason; and no Kevin Warsh candidate remains. Eight focused
Phase 3 regression tests pass. The workflow remains inactive. Phase 4 was not run for this batch,
and Phase 5 remains paused and untouched.

**2026-09-07 Phase 3 review-flag audit found one false positive:** all six `NEEDS_REVIEW`
candidates were checked against their full cleaned articles and Phase 2 Main Issues. Five flags are
correct because the saved description adds a fact not established by its selected quote: sequence
100 candidates c1 and c3, sequence 103 c5, sequence 104 c1, and sequence 107 c3. In several cases
nearby article text could support a narrower rewritten candidate or a better evidence excerpt, but
the currently saved candidate is correctly prevented from being `VALID`. Sequence 102 candidate c2
(`European Defence conference`) is incorrectly flagged: its quote explicitly says the initiative
will be formally launched at an EEAS-organized conference, which supports the description. The
safeguard rejection reason contradicts that evidence. Phase 3 therefore needs one narrow safeguard
repair and selective regeneration of sequence 102 before Phase 4 begins.

**2026-09-04 Phase 2 new-batch semantic repair verified:** the ten-article batch (`sequence_id`
98–107) now has 10 `VALID` latest results, all with `VERIFIED` evidence and safeguard `ACCEPT`,
and no failed or review result. Manual semantic review found two initially false-valid secondary
issues: sequence 103 selected Canada's retaliatory tariffs instead of Mark Carney's central rebuke,
and sequence 106 selected Iran's response to sanctions instead of Bessent's warning that Iran's
economy could collapse. The inactive Phase 2 workflow now gives the detector, safeguard, and repair
path the article headline and opening context and explicitly rejects secondary-topic switching. A
second safeguard tightening rejects causal wording that is not explicit in the selected quote.
Only these two latest rows were regenerated for centrality, then sequence 106 once more for causal
grounding; all 13 Phase 2 processing-history rows were preserved. Final inspection confirms both
issues match their article headlines and their descriptions are supported by their exact quotes.
Phase 3 has 0 candidates for this batch, the Phase 2 workflow remains inactive, and Phase 5 remains
paused and untouched.

**2026-09-04 Phase 1 new-batch cleaning repair verified:** ten newly submitted articles
(`sequence_id` 98–107) completed Phase 1. Manual inspection found opening image captions in 100
and 106, a standalone live-updates link in 103, and an Anadolu subscription footer in 105. The
deterministic cleaner now removes a caption only when it substantially repeats the preceding image
alt text, removes standalone live-update navigation, and removes the identified subscription
footer while preserving unrelated opening paragraphs. Four test-first regression cases pass. Only
the four affected sources were reprocessed through **Terra Space - Phase 1 - Process New
Articles**; the other six remained unchanged and all original run history was preserved. Final
batch state is 10 `completed`, 0 queued/failed, 14 Phase 1 history runs, and 0 Phase 2 results. The
workflow remains inactive; Phase 2–5 were not run.

**2026-09-04 Phase 1 workflow names clarified:** the existing n8n workflows
`gABPryH3jTe2Ktz5` and `aAVDCkvD02JWkbvJ` were renamed to **Terra Space - Phase 1 - Input New
Article** and **Terra Space - Phase 1 - Process New Articles**. Their IDs, nodes, connections,
behavior, and inactive publication state are unchanged.

**2026-09-04 Phase 4 production-readiness repair completed:** the previously failing deterministic
20-row manual audit was repaired and rechecked. Candidate-boundary rules now cover dates,
epistemic evidence, actors, physical locations, actor/metonym locations, actor-affiliation
countries, neighboring visit clauses, Markdown-grounded evidence, actor-role correction, and
grounded month-day normalization. With explicit owner approval, only affected latest-result rows
were selectively regenerated; all append-only history was preserved. Final Phase 4 state is 113
latest rows: 16 `VALID`, 97 `NEEDS_REVIEW`, 0 `FAILED`, an empty queue, and 249 processing-history
rows. All 31 focused Phase 3/4 regression tests pass and the whole-table 113-row dry run reports
zero affected rows. The protected replay webhook is unpublished. A verified clean local Supabase
backup was created at `data/backups/supabase/20260904-165741/local-supabase.dump` on the D: drive
(24,024,890 bytes; SHA-256 `3b2b34370ebb828faf3d145db3b5b787978d3a9099c661288cf85092bd1cf044`).
Phase 4 is completed; Phase 5 remains paused and untouched.

**2026-09-04 Phase 4 post-repair manual audit reopened production readiness:** a deterministic
sample of ten `VALID` and ten `NEEDS_REVIEW` rows found only 6/10 valid rows and 4/10 review rows
fully clean. Four sampled `VALID` rows still contained false-valid actor/location interpretations,
including `White House` and metonymic `Kyiv` stored as physical event locations. Six sampled
`NEEDS_REVIEW` rows had an appropriate overall review status but still retained at least one unsafe
fact, including unrelated epistemic evidence, an unsupported `Orsk` location, and a statement date
used as the event date. A read-only whole-table check found 15/113 rows whose epistemic evidence is
outside the Phase 3 candidate boundary and 4/89 retained locations whose name is absent from its
own evidence (some are legitimate aliases and require semantic review). The database was not
changed and no clean-baseline backup was created. Phase 4 is again `in-progress`; next repair the
epistemic boundary, location entity/type validation, actor/location metonym handling, and date-event
alignment, then selectively regenerate affected rows and repeat the manual audit. Phase 5 remains
paused.

**2026-09-04 Phase 4 candidate-boundary repair verified:** deterministic date and location gates
now require proposed evidence to belong to the Phase 3 candidate boundary, not merely appear
somewhere in the same article. Relative weekdays are resolved from the publication date, future
programme dates outside the candidate are omitted, neighboring-event locations are rejected, and
unsupported political labels such as `Turkish state` are not stored as countries. With explicit
owner approval, only the 42 affected latest Phase 4 rows were deleted and regenerated; 71
unaffected rows and all prior history were preserved. The final latest state is 113 rows: 39
`VALID`, 74 `NEEDS_REVIEW`, 0 `FAILED`, and an empty queue. All 13 focused Phase 3/4 regression
tests pass, a full 113-row boundary dry run finds 0 remaining violations, and n8n validates with
0 errors and 0 warnings. The replay webhook was repaired, used for this run, and unpublished
afterward. These automated contracts passed, but the later manual audit above found additional
semantic gaps. Phase 5 remains paused and was not touched.

**2026-09-03 Phase 4 manual quality audit found production blockers:** a read-only trace of five
`VALID` and five representative `NEEDS_REVIEW` rows against their source articles found all five
review rows conservatively handled, but only one of five sampled valid rows was clean. Material
false-valid examples include using the IRIS² programme's expected 2029 launch year as the date of
an already-signed implementation agreement, storing `Turkish state` as the event's geographic
location, and attaching Damascus evidence from Bashar al-Assad's sentencing to Maher al-Assad's
separate candidate. Relative weekday resolution also produced at least one one-day error: a source
published Monday 2026-08-10 was assigned Sunday 2026-08-09 for text stating `on Monday`. Root-cause
inspection shows the deterministic checks prove only that evidence quotes are exact substrings and
values have valid shapes; they do not deterministically prove that a quoted date or location belongs
to the candidate event. Phase 4 therefore remains technically complete but is not production-ready.
Do not start Phase 5. Next, repair candidate-boundary validation for dates and locations, add
regression tests for these observed cases, then selectively regenerate and re-audit Phase 4.

**2026-09-03 Phase 4 controlled replay completed:** the Phase 4 input view now requires
`quote_validation_status = VERIFIED`, preventing rejected Phase 3 evidence from entering downstream
fact extraction. Its database contract test passes with 113 eligible candidates and zero rejected
candidates in the queue. Controlled execution `2030` processed all 113. One actor safeguard
repeatedly omitted its final indexed decision; the prompt now states the exact decision count and
complete index range, covered by a focused regression test. Execution `2032` successfully repaired
that single row. Final Phase 4 state is 113 latest rows: 50 `VALID`, 63 `NEEDS_REVIEW`, 0 technical
failures, an empty queue, and 454/454 retained evidence quotes found exactly in their cleaned source
articles. There are 115 append-only processing-history rows. Phase 4 validates with 0 errors and
0 warnings and is unpublished. Phase 5 remains paused and was not touched.

**2026-09-03 Phase 3 clean replay and review retouch completed:** Phase 3 now contains all 29
source results with 18 `VALID`, 11 `NEEDS_REVIEW`, and 0 `FAILED`. A focused retouch taught the
validator to restore exact source excerpts across harmless Markdown emphasis, capitalization, and
spacing inside quotation marks. Controlled execution `2029` regenerated only the 11 review rows.
The final 114 candidates contain 113 exact cleaned-article evidence quotes and one rejected
non-contiguous quote. The remaining review tags are genuine: 17 candidates have descriptions with
details their own quote does not fully support, and one candidate stitched separated source
paragraphs into a single proposed quote. During the earlier replay, LM Studio produced one response
with a stray quote that broke JSON parsing. A narrowly scoped parser repair was added with a
regression test; all 6 Phase 3 validator tests pass and n8n runtime validation reports 0 errors and
0 warnings. The Phase 3 workflow and all other phase workflows are unpublished; Phase 4 remains
empty and Phase 5 remains paused. Next, Phase 4 can be prepared for a controlled run that consumes
only Phase 3 candidates allowed by its input contract.

**2026-09-02 controlled webhook repaired and verified:** the Phase 2 webhook was returning 403
because its **Ignore Bots** option classified n8n MCP's automated caller as a bot. Removing that
option allowed the authenticated MCP call to return HTTP 200. The local n8n 2.32.5 process also
requires a restart after MCP publication before a newly published webhook is registered; this is
an operational limitation to retain for future Phase 3/4 replay. Phase 2 was tested only with its
empty pending queue, so its verified 29 latest and 29 history rows did not change. The same bot
filter was removed from the Phase 3 and Phase 4 webhook triggers. All three workflows validate with
0 errors and 0 warnings and are unpublished. The previously considered scheduled continuation was
not created. Phase 5 remains paused.

**2026-09-02 clean test reset and Phase 2 replay verified:** with explicit owner approval, all
generated Phase 2–4 latest and processing-history rows were deleted in one guarded transaction
while preserving the 29 Phase 1 source articles. Owner-started Phase 2 execution `2021` then
completed successfully with 29 latest rows and 29 history rows. All 29 results are `VALID`, all 29
evidence quotes are exact cleaned-article substrings, no required Issue field is empty, and all 29
sources are represented once. The Phase 1 fingerprint remains
`a6e63e1b6880794834ed7509ca61fe38`; Phase 3 and Phase 4 remain empty and were not started. Protected
replay webhook triggers were added to the same three workflows, but n8n's webhook registry rejected
the automated calls before execution; all three workflows are unpublished. Stop here as requested.
The next action, only when the owner returns, is to resolve the webhook-registration problem or
manually run Phase 3; do not start Phase 3 or Phase 4 without a new request.

**2026-09-02 Phase 2 evidence repair prepared and dry-tested:** the inactive **Terra Space -
Phase 2 - Detect Main Issues** workflow now restores accepted evidence to the exact text found in
the cleaned Phase 1 article and can make at most two automatic correction attempts when a detector
or safeguard proposal adds unsupported wording. A read-only dry run against the same 29 saved
articles passed 29/29. Runtime validation reports 0 errors and 0 warnings across 20 nodes and 24
valid connections. No workflow execution was started, no Supabase row was changed, Phase 5 remains
paused, and no HTML report was created. The next optional action is a separately approved controlled
Phase 2 replay if the owner wants these corrected results written to Supabase.

**2026-08-31 Phase 5 conservative draft direction approved:** the owner does not want to manually
review the 60 Phase 4 `NEEDS_REVIEW` results. The next planned stage will automatically continue
all 109 results through two paths: 49 `VALID` results become normal event drafts, while 60
`NEEDS_REVIEW` results become limited drafts using only facts retained by Phase 4. Rejected or
unsupported details stay omitted; unknown values stay unknown; exact evidence and review reasons
remain traceable. No draft becomes a final event automatically, and duplicate merging remains
prohibited. This is direction only: no workflow, migration, table, or data change is approved yet.
Next, hold a Phase 5 design discussion and prepare a minimal input/output contract. See
[Phase 5 Conservative Event Drafts](decisions/Phase-5-Conservative-Event-Drafts.md).

**2026-08-31 Phase 4 narrow reliability correction and full replay verified:** the inactive
workflow now uses the Phase 3 candidate evidence quote as the event boundary while retaining the
complete cleaned article as supporting context. It excludes reporters, commenters, background
people and places, and related events; an existing grounded date is retained as `NEEDS_REVIEW`
when a rerun returns an unknown or conflicting date. Two identical five-candidate executions
(`2017` and `2018`) matched on status and complete facts for all 5 candidates. Controlled full
execution `2019` then processed all 109 candidates successfully with 0 failures. A final audit
found three near-match quotes caused by permissive whitespace/quotation-mark normalization; the
validator was tightened to require an exact cleaned-article substring and execution `2020`
repaired only those three candidates. Latest Phase 4 state is 109 rows (49 `VALID`, 60
`NEEDS_REVIEW`, 0 `FAILED`), 392 append-only history rows, and 411 retained evidence quotes, all
found exactly in their cleaned articles with none truncated. The workflow is inactive, validates
with 0 errors and 0 warnings across 27 nodes and 35 valid connections, reads the normal empty
queue directly with no obsolete pilot-limit node, and its exact recovery copy remains in
`Terra_Space`. With explicit owner approval, the three temporary pilot, replay, and exact-quote
repair views were deleted; they stored no rows, and post-cleanup verification confirms all latest
results and history remain intact. Phase 4 reliability work is complete. The next phase should be
discussed and approved before any new workflow or data contract is created. See [Phase 4 Narrow
Event Fact Extraction Implementation Plan](plans/2026-08-31-phase-4-narrow-event-fact-extraction.md).

**2026-08-31 Phase 4 narrow workflow prepared and validated:** an inactive exact backup of the
original workflow was created as **Terra Space - Phase 4 - Extract Event Facts - Backup
2026-08-31** (`Ixbz3rFqr2sbuFOs`) in `Terra_Space`. The original inactive workflow
(`EqBqTU8NoWmGuCsp`) now uses narrow date/epistemic, actor-only, and location-only extraction plus
separate indexed actor and location safeguards. Unsupported individual facts are omitted while
other usable fields continue as `NEEDS_REVIEW`; raw responses are grouped for audit. Runtime
validation passes with 0 errors and 0 warnings across 28 nodes and 36 connections. No candidate
ran and the database remains 109 latest Phase 4 results, 245 history rows, and an empty queue. Next,
select five candidates read-only and request separate approval before preparing or running a pilot.
See [Phase 4 Narrow Event Fact Extraction Implementation Plan](plans/2026-08-31-phase-4-narrow-event-fact-extraction.md).

**2026-08-31 Phase 4 narrow-extraction implementation plan ready:** read-only inspection confirmed
that the existing Phase 4 facts, raw-output, prompt-version, and status columns can represent the
approved narrow date/epistemic, actor, and location steps. No migration is needed. The plan keeps
the existing inactive workflow and Supabase persistence, adds separate item-level actor and
location safeguards, retains partial usable output, and requires non-writing behavior tests before
a separately approved five-candidate pilot. No workflow or data was changed. See
[Phase 4 Narrow Event Fact Extraction Implementation Plan](plans/2026-08-31-phase-4-narrow-event-fact-extraction.md).

**2026-08-31 Phase 4 reliability adjustment approved for design:** the owner chose to improve a
single Phase 4 run before considering repeated-run stabilization. The existing inactive Phase 4
workflow will keep the complete cleaned article but split its combined factual work into narrow
date/epistemic, actor-only, and location-only extraction steps. Actors and locations will each have
their own deterministic evidence check and narrow safeguard. Unsupported individual facts will be
omitted with a concrete `NEEDS_REVIEW` reason without erasing other usable fields; `FAILED` remains
reserved for a technical problem that prevents any usable result. No workflow, migration, table,
or data has been changed. Next, inspect the existing Phase 4 storage and workflow in read-only mode
and prepare an implementation plan; obtain separate approval before any workflow edit or pilot.
See [Phase 4 Event Fact Extraction](decisions/Phase-4-Event-Fact-Extraction.md).

**2026-08-28 Phase 4 controlled reliability comparison verified:** owner-started execution `2010`
ran the latest workflow against the same 109 Phase 3 candidate inputs as the first Phase 4 attempt.
All 109 results were saved, adding 109 append-only history rows (245 total), with no `FAILED`
latest result and an empty normal queue. Compared to the first attempt per candidate, 104/109
(95.4%) retained the same overall status and 72/109 (66.1%) retained an exactly identical full
facts payload. Dates stayed identical in all 109; epistemic status changed in 5, actor arrays in
29, and location arrays in 25. The new results are 16 `VALID` and 93 `NEEDS_REVIEW`; every review
has a reason, all 523 retained actor/location quotes are grounded and non-truncated, and Phase 1-3
fingerprints remain unchanged. The workflow was restored to the normal pending view and remains
inactive in `Terra_Space`. Owner-approved cleanup then removed the unused pilot and reliability
temporary views; neither stored data nor history was removed.

**2026-08-27 Phase 4 five-candidate retry verified:** the owner manually ran the bounded retry
after the routing correction. Execution `2002` completed successfully: it updated exactly the five
pilot latest rows and appended five new processing-run rows (10 runs total), leaving the normal
pending queue at 104 candidates. Results remain 1 `VALID` and 4 `NEEDS_REVIEW`; all stored payloads
are complete and review rows have a reason. Phase 1-3 counts remain 29/29/29 with 109 candidates.
The retry confirms that the revised safeguard instructions reached the model, but it still sometimes
uses the Phase 3 candidate quote despite being told to judge each fact against its own quote. One
`NEEDS_REVIEW` location quote is visibly truncated with `...` and is not found verbatim in its
cleaned article. Do not process the remaining candidates. Next, decide whether to make the evidence
validator reject truncated quotes and simplify the safeguard input further, then validate another
bounded retry before any full run.

**2026-08-27 Phase 4 paused after safe structure preparation:** additive migrations
`202608270003` and `202608270004` created the Phase 4 factual-result contract and corrected only
its unknown-date JSON-null validation. The inactive **Terra Space - Phase 4 - Extract Event Facts**
workflow (`EqBqTU8NoWmGuCsp`) is in `Terra_Space`; it has not been executed. The Phase 4 pending
view contains 109 candidates and the latest/history tables are empty. Read-only counts and
fingerprints prove Phase 1-3 remain unchanged. Resume by validating the inactive workflow and its
stored Code-node behavior, then select a five-candidate pilot; no live execution is approved yet.
See [Phase 4 Event Fact Extraction Implementation Plan](plans/2026-08-27-phase-4-event-fact-extraction.md).

**2026-08-27 Phase 4 implementation plan ready:** the owner approved the minimal Event Fact
Extraction design. The implementation plan defines an additive Supabase contract, one-candidate
n8n processing, deterministic evidence checks, a separate safeguard, complete review retention,
failed-result retry, and a five-candidate pilot before any full run. Recommended execution setting
is `gpt-5.6-terra` with medium reasoning effort. No migration, workflow, or live data has been
changed. See [Phase 4 Event Fact Extraction Implementation Plan](plans/2026-08-27-phase-4-event-fact-extraction.md).

**2026-08-27 Phase 4 direction approved for design:** the owner selected the minimal **Extract Event
Facts** scope after the verified Phase 3 baseline. The draft design processes every retained Phase 3
candidate independently and adds only an evidence-grounded date, epistemic status, actors, and
locations. Taxonomy, normalization, deduplication, final events, Dashboard writes, and Phase 1-3
changes remain outside scope. No workflow, table, migration, or live data has been changed. See
[Phase 4 Event Fact Extraction](decisions/Phase-4-Event-Fact-Extraction.md).

**2026-08-27 Phase 1–3 video redesigned and delivered:** after owner feedback, the static
three-lane presentation was replaced with a continuous “Living Data Flow.” A moving camera now
follows one glowing trace as an article is cleaned, distilled into a grounded Main Issue, branched
into Event Candidates, and connected to retry and verified totals. The silent 15-second,
1920×1080 H.264 MP4 remains at `terra-weekly-brief/out/terra-space-phase-pipeline.mp4`; the weekly
brief is unchanged. Motion-contract tests, lint/TypeScript, and six-frame visual review passed. See
[Phase 1 to Phase 3 Pipeline Video Implementation Plan](plans/2026-08-27-phase1-to-phase3-pipeline-video.md).

**2026-08-27 Phase 3 failed-result retry verified:** the owner manually ran the retry workflow.
Both previously failed articles (sequences 63 and 64) now retain complete Event Candidate arrays
as `NEEDS_REVIEW`, rather than `FAILED`; neither was blanked or dropped. The pending queue is now
empty. Phase 3 has exactly 29 latest results: 12 `VALID` and 17 `NEEDS_REVIEW`, containing 109
candidates (81 `VALID`, 28 `NEEDS_REVIEW`). Read-only checks found no incomplete candidate, no
review candidate without a reason, and no `VALID` evidence quote absent from its cleaned article.
The retry updated only the two failed latest rows and appended run history: sequence 63 has
`FAILED -> FAILED -> NEEDS_REVIEW`, and sequence 64 has `FAILED -> NEEDS_REVIEW`.

**2026-08-27 Phase 3 first pilot evaluated:** owner-started manual execution `1994` completed and
created exactly 29 latest results plus 29 append-only run records for the 29 eligible articles.
Phase 1 and Phase 2 remain at 29 rows each, the pending view is empty, and no duplicate latest
source exists. The outcomes are 12 `VALID`, 15 `NEEDS_REVIEW`, and 2 `FAILED`; retained candidates
total 96 (71 `VALID`, 25 `NEEDS_REVIEW`). Every retained candidate has a non-empty title,
description, and evidence quote; all 71 valid quotes were found in their cleaned article; every
review candidate has a review reason. The two failures are local-model non-JSON detector responses
for source sequences 63 and 64, not a storage or data-link failure. The next action is a
read-only review of candidate quality and a small, separately approved parser/retry decision for
the two failures before reprocessing any record.

**2026-08-27 Phase 3 Event Candidate Detection structure ready:** additive migration
`202608270001_phase3_event_candidate_detection` created the Phase 3 latest-result table,
append-only run table, and pending-source view without changing Phase 1 or Phase 2 records. The
inactive **Terra Space - Phase 3 - Detect Event Candidates** workflow (`S5HKb5Sfag80cvkd`) is in
`Terra_Space`; it uses Supabase nodes for normal data reads/writes and processes one source at a
time. Database contract testing passed in rollback, and n8n runtime validation passed with 0 errors
and 0 warnings. Current counts are 29 Phase 1 sources, 29 Phase 2 Issues, 29 Phase 3 pending
sources, and 0 Phase 3 latest/history rows. Do not start the manual workflow until the owner
explicitly approves processing the 29 articles.

**2026-08-27 Phase 3 Event Candidate Detection planned:** the owner approved the minimal next-stage
design and implementation plan. Phase 3 will accept every complete Phase 2 Main Issue, including
`NEEDS_REVIEW`, and retain zero or more candidates with title, neutral description, evidence quote,
and candidate-level `VALID`/`NEEDS_REVIEW` status. It deliberately excludes actors, countries,
relationships, taxonomy detail, and final events. No table or workflow has been created; wait for
the owner's explicit execution approval before applying the planned migration or creating the
inactive manual n8n workflow. See [Phase 3 Event Candidate Detection](decisions/Phase-3-Event-Candidate-Detection.md)
and its [implementation plan](plans/2026-08-27-phase-3-event-candidate-detection.md).

**2026-08-27 Phase 2 evidence-alignment reprocess verified:** manual execution `1992` completed
successfully with 29 complete latest results and no pending source, null source ID, empty Issue
field, or invalid accepted quote. The evidence-alignment correction increased `VALID` results from
13 to 21 and reduced `NEEDS_REVIEW` from 16 to 8. Seven remaining review rows have a proposed
title or description that still adds a detail outside its quote; one has a non-verbatim proposed
quote. All eight retain complete fields and a review reason. This is a material improvement while
preserving the requested full-output behavior.

**2026-08-27 owner-approved Phase 2 evidence-alignment reprocess prepared:** deleted exactly 29
latest Phase 2 rows with an atomic count guard after the detector and quote-validation correction.
All 29 completed Phase 1 articles are pending again, while all 157 append-only Phase 2 processing
history rows remain preserved. The workflow was not run during deletion and is ready for one
owner-started reprocess.

**2026-08-26 Phase 2 evidence alignment correction ready:** detector instructions now require its
title and description to be supported by one selected quote, rather than adding context beyond that
quote. Quote validation now normalizes only whitespace, curly/straight quote marks, and terminal
punctuation. A stored-node test reproduced the prior punctuation-only rejection and now correctly
routes it to the safeguard with `VERIFIED` quote status. n8n runtime validation reports 0 errors
and 0 warnings. Reprocess current latest rows only after owner-approved deletion to measure the
reduced `NEEDS_REVIEW` rate.

**2026-08-26 NEEDS_REVIEW quality analysis:** all 16 review-flagged results retain complete Issue
fields. Thirteen have a scope gap: the selected quote is narrower than a detail in the proposed
title or description. Two have a wording/relationship discrepancy between description and quote,
and one has a semantic match blocked only by terminal punctuation. The smallest safe improvement is
to instruct the detector to write its title and description from one selected quote only, removing
any unsupported qualifier, and to normalize only whitespace plus terminal punctuation before the
verbatim quote check. This keeps the one-pass workflow and `NEEDS_REVIEW` flag; it does not add a
repair loop or stop later articles.

**2026-08-26 Phase 2 always-retain reprocess verified:** manual execution `1985` completed
successfully and created 29 latest results for 29 distinct Phase 1 sources, with no pending source,
null source ID, or empty Issue field. The outcomes are 13 `VALID` and 16 `NEEDS_REVIEW`. All valid
rows have a verified quote and safeguard acceptance; direct comparison found 0 valid quotes absent
from their cleaned article. Fifteen review rows retain a verified quote plus a specific safeguard
reason; one retains its proposal with a quote-rejection flag. This is the requested full-output,
review-by-exception behavior.

**2026-08-26 owner-approved Phase 2 reprocess prepared after always-retain correction:** deleted
exactly 29 latest Phase 2 rows with an atomic count guard. All 29 completed Phase 1 articles are
pending again, while all 128 append-only Phase 2 history rows remain preserved. The workflow was
not run during deletion and is ready for one owner-started reprocess using the always-retain
`NEEDS_REVIEW` behavior.

**2026-08-26 Phase 2 Issue-output rule corrected:** `NEEDS_REVIEW` no longer permits empty Issue
fields in the latest-result table. The two earlier empty rows were restored from their saved model
outputs: one had a safeguard model failure and one had a non-verbatim proposed quote. The workflow
now preserves a detected proposal even when its quote is rejected, retains proposals on safeguard
errors, and uses the article headline plus opening article text as a clearly flagged fallback if
the detector itself is unavailable. Non-writing behavioral tests confirmed both paths keep a title,
description, and quote. n8n runtime validation reports 0 errors and 0 warnings.

**2026-08-26 Phase 2 NEEDS_REVIEW reprocess evaluated:** manual execution `1983` completed
successfully and saved a latest result for every one of the 29 completed Phase 1 articles; no
source is pending and no source ID is missing. The results are 13 `VALID`, 14 evidence-grounded
`NEEDS_REVIEW` rows retaining their proposal fields and safeguard reason, one `NEEDS_REVIEW` row
without a proposal because its quote was not verbatim, and one `FAILED` row because LM Studio
reported no model loaded. The batch continued despite that failure, as intended. All 13 valid
quotes were found verbatim in their cleaned articles. This demonstrates the review-flag baseline;
the lone `FAILED` result can be retried later after confirming the model remains loaded.

**2026-08-26 owner-approved Phase 2 reprocess prepared after review-flag update:** deleted exactly
12 partial latest Phase 2 rows (4 `VALID`, 8 `NEEDS_REVIEW`) with an atomic count guard. The latest
table now has 0 rows and all 29 completed Phase 1 articles are pending for reprocessing under the
new `NEEDS_REVIEW` behavior. All 99 append-only Phase 2 history rows remain preserved; the workflow
was not run as part of the deletion.

**2026-08-26 Phase 2 review flag renamed for clarity:** migration
`202608260004_phase2_needs_review_status` renamed every stored `WITHHELD` value to
`NEEDS_REVIEW` in both latest results and append-only history, preserving all rows and fields.
The workflow now emits `NEEDS_REVIEW` for every review outcome; `VALID` and `FAILED` are unchanged.
Current partial latest results are 4 `VALID` and 8 `NEEDS_REVIEW`, with 17 sources still pending
after the interrupted run. Runtime workflow validation reports 0 errors and 0 warnings.

**2026-08-26 Phase 2 now keeps review-flagged proposals and continues after errors:** approved
minimal design changes retain an evidence-grounded title, description, and quote when the safeguard
returns `REJECT`; `WITHHELD` is the sole review flag and its existing recorded reason explains why.
No table, queue, or extra status was added. Migration `202608260003_phase2_review_flagged_results`
allows that shape in both the latest-result and append-only-history tables. Both detector and
safeguard technical-error paths now carry the source ID, so they can save a `FAILED` result rather
than stopping the batch. Database transaction testing and stored-node behavioral tests passed;
n8n runtime validation reports 0 errors and 0 warnings. A prior interrupted run has 12 old-format
latest results and 17 pending sources; reprocess all 29 after owner-approved deletion to make every
row consistent with this new baseline.

**2026-08-26 owner-approved all-result Phase 2 reprocessing prepared:** deleted exactly all 29
current latest Phase 2 result rows (12 `VALID`, 17 `WITHHELD`) from
`terra_space_phase2_main_issues`, using an atomic count guard. The latest table now has 0 rows and
all 29 completed Phase 1 articles are again pending. All 87 append-only Phase 2 processing-history
rows and all Phase 1 source data remain unchanged. The corrected inactive workflow is ready for
one owner-started manual reprocessing run; inspect the result read-only before replacing the
baseline decision.

**2026-08-26 Phase 2 result reprocessing evaluated: ready for baseline approval:** the latest
results now cover all 29 completed Phase 1 articles with no pending source, no null source ID, and
no orphaned link. Twelve results are `VALID`, each with `VERIFIED` evidence and safeguard `ACCEPT`;
a direct database comparison found every one of their evidence quotes verbatim in its cleaned
article. The remaining 17 are safely `WITHHELD` after safeguard rejection, with clear recorded
reasons that the proposed description went beyond its quote. Manual sample review of all 12 valid
results found titles, neutral descriptions, and evidence aligned with their articles. Execution
`1981` completed successfully; earlier interrupted execution `1979` and cancelled execution `1980`
had already saved some individually complete rows, then `1981` completed the remaining pending
sources. This is suitable to lock as the Phase 2 Main-Issue baseline if the owner approves.

**2026-08-26 Phase 2 safeguard-result mapping corrected after execution `1978`:** execution `1978`
stopped before saving any row because **Prepare Phase 2 Result** mistakenly inspected the LM Studio
safeguard response for `p2_needs_safeguard`; that response does not carry the prepared proposal or
its `p2_status`. The node now reads the proposal from **Validate Main Issue Evidence**, preserves
its fields, and also unwraps complete Markdown JSON fences from the safeguard response. The exact
previous failure case now produces `VALID`, `VERIFIED`, and `ACCEPT` in a non-writing behavioral
test. Workflow runtime validation reports 0 errors and 0 warnings. No latest result was created;
all 29 sources remain pending for an owner-started run.

**2026-08-26 Phase 2 latest withheld results deleted with owner approval:** deleted exactly 29
`WITHHELD` latest-result rows from `terra_space_phase2_main_issues` using an atomic count guard.
The latest-result table now has 0 rows and the pending-source view again exposes all 29 completed
Phase 1 articles. The 58 append-only Phase 2 processing-history rows and all 29 Phase 1 articles
remain unchanged. The corrected inactive **Terra Space - Phase 2 - Detect Main Issues** workflow
is ready for one owner-started reprocessing run; request a read-only evaluation afterwards before
locking a Phase 2 baseline.

**2026-08-26 Phase 2 reprocessing review: not ready as a baseline:** owner-started manual execution
`1977` completed successfully and saved a latest Phase 2 row for every one of the 29 completed
Phase 1 articles; no source is pending, no source ID is missing, and Phase 1 data is unchanged.
However, all 29 latest rows are `WITHHELD`, with zero verified quotes, zero safeguard calls, and
zero valid Main Issues. The model returned usable-looking nested `MAIN_ISSUE_FOUND` JSON (17 rows)
or Markdown-fenced JSON (12 rows), while the currently installed **Validate Main Issue Evidence**
node still accepts only one bare, top-level JSON shape. This means the earlier intended parser
correction was not present in that live validator. Do not treat this result as the Phase 2 baseline.
The safe next step is to correct and validate that validator, then obtain separate owner approval
before deleting and reprocessing the 29 current `WITHHELD` latest rows.

**2026-08-26 Phase 2 validator corrected and validated:** the inactive **Terra Space - Phase 2 -
Detect Main Issues** workflow (`AkdHAcebfzmnOSST`) now strips complete Markdown JSON fences and
accepts the observed nested `MAIN_ISSUE_FOUND` response (including optional `decision: YES`) while
still rejecting unexpected fields, non-JSON responses, and evidence quotes that do not appear
verbatim in the cleaned article. A validate-only workflow update passed; runtime validation reports
0 errors and 0 warnings. A non-writing behavioral check of the stored validator confirmed both
nested and fenced accepted examples proceed to the safeguard, while a non-verbatim quote remains
`WITHHELD`. The workflow was not run. The 29 current `WITHHELD` latest rows remain until the owner
confirms their exact deletion.

**2026-08-26 Phase 2 save mapping corrected after execution errors:** owner-started executions
`1975` and `1976` stopped when the Supabase latest-result node attempted to save a null
`phase1_source_id`, despite that ID being available in the preparation node. The inactive
**Terra Space - Phase 2 - Detect Main Issues** workflow (`AkdHAcebfzmnOSST`) now explicitly carries
the ID as `p2_phase1_source_id` and maps the Supabase field from that same value. A validate-only
check and n8n runtime validation passed with 0 errors and 0 warnings; the workflow was not rerun.
Six `WITHHELD` latest rows from the interrupted attempt remain, while 23 sources are pending. Do
not delete or reprocess those six without the owner's separate approval. The owner may now run the
workflow to process the 23 pending sources, then request a read-only review.

**2026-08-26 Phase 2 parser corrected and reprocessing prepared:** the owner approved the deletion
of exactly the 29 `WITHHELD` *latest-result* rows created by manual execution `1974`. The deletion
removed 29 rows from `terra_space_phase2_main_issues`, preserved all 29 append-only rows in
`terra_space_phase2_main_issue_processing_runs`, and left all 29 Phase 1 sources unchanged. The
pending-source view now again exposes all 29 sources. The inactive **Terra Space - Phase 2 - Detect
Main Issues** workflow (`AkdHAcebfzmnOSST`) now accepts a leading/trailing Markdown `json` fence,
the observed `{"MAIN_ISSUE_FOUND": {...}}` detector shape (with either title/description field
names), and its original expected shapes. It still requires an exact evidence quote and the
independent local-AI safeguard. Static parser validation and n8n runtime validation both passed;
runtime reported 0 errors and 0 warnings. The owner should now open the workflow in n8n and click
**Execute Workflow** once, then request a read-only review of the saved results before treating
them as a Phase 2 baseline. See [Phase 2 Main-Issue Detection Implementation Plan](plans/2026-08-26-phase-2-main-issue-detection.md).

**2026-08-26 Terra Space field descriptions completed:** additive migration
`202608260002_terra_space_field_descriptions` added plain-language database descriptions to every
field in all four current Terra Space tables. Verification found 0 missing field descriptions. This
metadata-only change did not alter sources, Phase 2 results, or n8n workflow behavior.

**2026-08-26 Phase 2 Main-Issue workflow ready for its first owner run:** local migration
`202608260001_phase2_main_issue_foundation` added the Phase 2 latest-result table, append-only run
table, and pending-source view without changing the 29 Phase 1 articles. Inactive workflow **Terra
Space - Phase 2 - Detect Main Issues** (`AkdHAcebfzmnOSST`) is now in `Terra_Space`; it uses a
manual trigger, processes one pending source at a time, calls LM Studio twice (detector and
safeguard), and writes through Supabase nodes. Runtime validation passed with 0 errors and 0
warnings. The owner should open it in n8n and click **Execute Workflow** when ready; afterwards,
review the saved Main Issues against the articles before treating this as a verified Phase 2
baseline. See [Phase 2 Main-Issue Detection Implementation Plan](plans/2026-08-26-phase-2-main-issue-detection.md).

**2026-08-26 Phase 2 Main-Issue direction approved:** the next post-reset build is one inactive
manual n8n workflow, **Terra Space - Phase 2 - Detect Main Issues**, in the `Terra_Space` folder.
It will process every unprocessed completed Phase 1 source one at a time, storing at most one
grounded Main Issue. The issue has only title, neutral description, and an exact evidence quote;
countries, actors, event candidates, and final events remain out of scope. A verbatim quote check
and an independent local-AI safeguard must both accept it; otherwise it is saved as `WITHHELD`.
Supabase nodes must be used for the normal database reads and writes. See [Phase 2 Main-Issue
Detection](decisions/Phase-2-Main-Issue-Detection.md).

**2026-08-26 verified Phase 1 cleaning baseline locked:** the owner ran the corrected manual
processor against all 29 requeued sources (sequences 46–74). All 29 finished `completed` with
non-empty cleaned text. A read-only raw-versus-cleaned comparison found no accidental LM Studio
reply, no lost main article section, and at most one removed non-article section per source
(photo caption, image credit, or live-coverage notice). The four most shortened results were
checked individually and passed. The manual one-at-a-time processor, raw-field mapping, non-empty
gate, conservative deterministic cleaner, fidelity guard, and append-only processing history are
now the approved Phase 1 baseline. Do not change it without owner approval and an equivalent
read-only comparison. See [Verified Phase 1 Cleaning Baseline](decisions/Verified-Phase-1-Cleaning-Baseline.md).

**2026-08-26 blank-output processor bug fixed and recovered:** manual execution `1972` had marked
29 sources `completed` with empty `cleaned_content_text`, even though their original raw article
text remained intact. The cause was a field-name mismatch: the pre-cleaner read
`p1_raw_content_text`, but the Supabase fetch supplied `raw_content_text` without a mapping. The
processor now maps that field and has a **Has Nonempty Cleaned Text** gate: an empty result enters
the failed/retry path instead of being marked completed. Runtime validation passed with 0 errors and
0 warnings. With owner approval, exactly the 29 affected sources (sequences 46–74) were returned to
`queued` with null cleaned text and no processing error. The 29 original bad `SUCCESS` run records
remain preserved as evidence; the owner can now run the corrected processor when ready.

**2026-08-26 processor now starts from n8n's Manual Trigger:** **Terra Space - Process All Saved
Articles** (`aAVDCkvD02JWkbvJ`) is intentionally inactive and starts only when the owner opens it in
n8n and clicks **Execute Workflow**. It has no form page or public URL. A regular Supabase **Get
Queued or Failed Sources** node fetches waiting work, then an explicit batch-size-one loop sends one
article at a time to LM Studio and returns for the next article. Successes become `completed`;
failures remain `failed` for the next owner-started run. This design assumes the owner starts only
one processor run at a time. The existing database claim function remains unused; no article was
processed during this change. n8n validation reports 0 errors and 0 warnings.

**2026-08-26 backup re-entry completed:** after the owner requested re-entry, the 25-row Excel
backup was checked for repeated URLs. It contained 23 unique articles: the owner had already entered
the first one, so the other 22 unique articles were submitted through the active Input News Manual
form one at a time. All 23 sources are now `queued`, have no cleaned text, and have no duplicate
URL. The two repeated backup rows (original sequences 14 and 33) were intentionally skipped under
the approved duplicate rule. The 25 detached historical processing-run rows remain unchanged; do
not run the processor until the owner is ready for cleaning.

**2026-08-26 owner-approved Phase 1 source reset:** exported all 25 rows from
`public.terra_space_phase1_sources` to
`outputs/2026-08-26-phase1-sources-export/terra-space-phase1-sources-before-reset.xlsx`, then
deleted those 25 source rows at the owner's explicit request so they can be re-entered. The source
table now contains 0 rows. The 25 append-only Phase 1 processing-run rows remain as history, with
their former source links set to null by the existing foreign-key rule. The active intake workflow
is ready for the owner to submit articles again as new queued sources.

**2026-08-26 duplicate-submission rejection verified:** active **Terra Space - Input News Manual**
(`gABPryH3jTe2Ktz5`) now trims the submitted article values, checks the trimmed `source_url` against
saved Phase 1 sources before insertion, and returns `REJECTED_DUPLICATE` when it finds a match. A
duplicate does not create a source row, queue item, or processing run; only a new URL continues to
the existing `queued` intake path. Live execution `1938` submitted an already-saved URL, returned
the rejection result, skipped the save node, and left the source total at 25. The workflow remains
active and n8n validation reports 0 errors and 0 warnings. See [Separated Manual Intake and Deferred
Queue Processing](decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md).

**2026-08-25 deferred Phase 1 queue processing completed:** active **Terra Space - Input News
Manual** (`gABPryH3jTe2Ktz5`) now only saves one valid article as `queued`; it does not call LM
Studio, does not create a processing-run row, and accepts a blank author. Active **Terra Space -
Process All Saved Articles** (`aAVDCkvD02JWkbvJ`) is in the `Terra_Space` folder. Its one-button
form atomically claims and cleans each queued or failed source, records each success/failure, and
continues after individual LM Studio errors; a stale interrupted claim becomes eligible again after
15 minutes. An empty-queue live form submission passed without changing any of the 25 retained
completed sources. Both workflows passed n8n validation with 0 errors and 0 warnings. See the
[Deferred Phase 1 Queue Processing Implementation
Plan](plans/2026-08-25-deferred-phase1-queue-processing.md).

**2026-08-25 owner-approved Input News Manual cleaning safeguard:** the live **Terra Space - Input
News Manual** workflow now uses an expanded deterministic cleaner for known standalone photo-credit
and contributor-credit forms, while retaining the LM Studio cleaning call. A new fidelity guard
accepts an LM Studio response only when every pre-cleaned source paragraph remains and every output
paragraph is grounded in that source; otherwise it saves the deterministic text, preserves the raw
model response, and records why it was rejected in the append-only Phase 1 run. The prompt now
explicitly preserves reporter-written long/live-blog/BBC text and keeps support/helpline information.
No historical source was changed, no duplicate check was added, and no article was submitted for
testing. Runtime validation reports 0 errors and 0 warnings. During publication, a stale n8n draft
omitted the six `Phase 1 Internal Input` field types; all six were immediately restored to `string`
and the corrected active workflow was revalidated. The owner also set the durable operational rule
that any new Terra Space n8n workflow belongs in the `Terra_Space` folder. See [Terra Space n8n
Workflow Folder Placement](decisions/Terra-Space-n8n-Workflow-Folder-Placement.md).

**2026-08-25 read-only Input News Manual cleaning audit:** at the owner's request, audited the live
**Terra Space - Input News Manual** workflow (still the only active workflow since the 2026-08-24
reset) and all 25 retained `terra_space_phase1_sources` rows by comparing `raw_content_text` against
`cleaned_content_text` row by row. Result is mixed: 15 of 25 rows are fully clean, 8 have minor
leftover photo-caption/credit junk, and 2 (`possible_overcleaning`) show a few genuine
reporter-written sentences dropped on long BBC articles alongside legitimate boilerplate; no row has
material junk. The root cause is the workflow's own current cleaning logic (a deterministic regex
with a too-narrow caption pattern, a small local LM Studio model that is inconsistent on ambiguous
captions and long documents, and a length-only safety net that cannot detect content-level fidelity
loss) — not a pending decision or a data-loss defect. Nothing was changed; this was a strictly
read-only audit. See [Feedback
Backlog](Feedback-Backlog.md#input-news-manual-cleaning-leaves-minor-junk-and-drops-some-real-content-on-long-articles-2026-08-25).

**2026-08-24 owner-approved pipeline reset:** a verified full Supabase backup was created at
`data/backups/supabase/20260824-173329/terra-space-before-pipeline-reset.dump`, and current copies
of the four deleted n8n workflows were saved in `.n8n-backups/20260824/`. The owner then approved
the permanent deletion of all Terra Space tables except `terra_space_phase1_sources` and
`terra_space_phase1_processing_runs`. The other 31 `terra_space_*` tables and four dependent
Issue-first views were dropped in one successful database transaction. The original submitted
articles and their Phase 1 processing history remain. The four former live workflows—**Full News
Processing**, **Event Candidates**, **Event Records**, and **Issue-first Analysis**—were
deactivated and permanently deleted. **Input News Manual** remains active and all retired
experiments remain untouched. The former five-workflow operating guide and active-workflow
boundary are now superseded; do not run the old pipeline. A new workflow and database design is
required before resuming normal end-to-end processing.

**2026-08-22 operational clarity cleanup:** the supported n8n pipeline is now explicitly limited
to five live workflows: **Full News Processing**, **Input News Manual**, **Event Candidates**,
**Event Records**, and **Issue-first Analysis**. Six confirmed inactive Terra Space experiments
were moved—without deletion or reactivation—to the n8n folder `Terra Space — Retired (do not
run)`. The visual [Complete Current Pipeline Guide](Terra-Space-Operating-Guide.md) now explains
the normal article path, all validation stages, data scheme, optional relationship rule, and what
not to run. See [Active Workflow
Boundary](decisions/Active-Workflow-Boundary.md).

**2026-08-22 first new-article check after Issue-first v3:** an owner-submitted AP News article,
*Taiwan proposes a record $35B defense budget for 2027 as China’s military pressure grows*,
completed the normal **Full News Processing** workflow successfully (execution `1920`). Phase 2
found six candidates; Phase 3 produced four `FINAL` Events and retained two `EXCEPTION` records.
Issue-first v3 independently completed and published one evidence-backed Issue with five valid
Issue Events. It published no relationship, which is the expected optional outcome because the
article did not provide complete explicit relationship evidence. The read API now returns 25
valid Issues. No manual Issue/Event correction or inferred relationship was made.

**2026-08-22 local application configuration repaired and verified:** with owner approval, the
saved local `.env` now supplies both required backend connection URLs for this machine's local
Supabase database on port `55422`, replacing the retired `54322` read-only URL and adding the
previously missing primary URL. Terra Space was fully recreated from that saved configuration—no
session override—and the backend became healthy. The `/issues` API returned HTTP 200 and 24 Issue
records; the browser screen shows `24 VALID` with no unavailable-data message. No application,
Issue, Event, or database data was changed.

**2026-08-22 owner-approved Issue-first v3 workflow change and full reprocess completed:**
the active **Terra Space - Issue-first Analysis** n8n workflow now has an `issue-first-v3` prompt
that makes relationships explicitly optional, plus a read-only country-reference lookup and a
non-inferential normalizer before the existing guarded recorder. It removes an Event only when its
own evidence fails, and removes a relationship when any actor, country, ISO, location, or quote
test fails; it never substitutes, maps, or invents a value. The workflow has 11 nodes and passed
n8n runtime validation with 0 errors and 0 warnings. After LM Studio returned to port 1234, all 13
affected sources were reprocessed sequentially through Issue-first only. Every latest source run
is now `succeeded`: the local read projections report 24 valid Issues, 114 valid Issue Events, and
5 complete evidence-backed relationships. The earlier `ECONNREFUSED` run remains as technical
history; no output was reset or manually repaired. The web application group was stopped during
verification, so port 3000 could not provide an API read; the database projections are the
verified result. See [Issue-first Independent Evidence Retention](decisions/Issue-First-Independent-Evidence-Retention.md).

**2026-08-22 read-only Issue-first failure review:** all 13 latest withheld runs have a valid
main-Issue evidence quote. The blocker is therefore not the article-level Issue itself: it is an
all-or-nothing recorder outcome when one optional Event or relationship fails grounding. A
read-only replay of the existing validation rules found 48 of the 54 proposed Events independently
have an exact evidence quote; the six remaining Events should stay withheld. Of 18 proposed
relationships, only 3 meet every existing explicit actor, country, ISO, location, and quote rule;
the other 15 should simply be omitted. This supplied the evidence for the owner-approved
non-inferential normalization now active above; the guarded database recorder remains the final
authority.

**Open Issue-first pipeline-quality follow-up:** after the fresh 24-source rebuild, 13 sources
were withheld from Issues because the extracted evidence was not sufficiently grounded: 5 lacked
location wording in the endpoint evidence, 4 altered an event/relationship quote, 2 lacked actor
name support, and 2 paired a country name with the wrong ISO code. This is an intended safety
outcome, not a data-loss defect: the affected Phase 3 Events remain available while Issue-first
withholds the analytical output. Future work must improve the Issue-first prompt/normalization and
then reprocess affected sources; do not manually edit, approve, or repair Issues or Events. See
[Feedback Backlog](Feedback-Backlog.md#issue-first-coverage-is-limited-by-evidence-grounding-2026-08-20).

**2026-08-20 owner-approved fresh pipeline rebuild:** a full local Supabase backup was created
and verified at `data/backups/supabase/20260820-165447/local-supabase.dump` before reset. The
reset removed only derived output—Phase 2 candidates/runs, Phase 3 Events/runs/derived actors and
locations, and all Issue-first runs/output—while retaining all 24 Phase 1 source articles,
taxonomy, gazetteer, settings, workflows, and containers. All 24 sources were then reprocessed
sequentially through Phase 2, Phase 3, and Issue-first using n8n MCP. The rebuilt result is 85
Events (61 `FINAL`, 24 `EXCEPTION`), 11 valid Issues, 48 valid Issue events, and 2 complete
evidence-backed relationship arcs. Thirteen Issue-first runs were withheld by validation; this is
expected under the no-inference rule. The read API confirmed all 11 valid Issues and no source is
missing a Phase 2 result or Issue-first run. The Phase 2 and Phase 3 single-source chat entries
were also explicitly enabled and validated (0 errors / 0 warnings) to support this controlled
reprocess path.

**2026-08-20 Issue-first evidence-quote fix verified:** via n8n MCP, the active Issue-first
prompt was upgraded to `issue-first-v2` to require character-for-character source quotes and to
forbid abbreviations inside evidence. The workflow validated at 0 errors / 0 warnings, then only
the previously submitted source was reprocessed through the Issue-first branch (not Phase 1–3).
Run `a44a571b-6b47-4379-b1b1-b073ee79be56` succeeded and published one valid Issue with 5 valid
Issue events and 1 complete evidence-backed actor relationship. The read API sees the new Issue;
the valid total is now 10 Issues / 40 Issue events. The earlier rejected run remains preserved as
history. No manual Issue or Event correction occurred.

**2026-08-20 first new-article live check:** main workflow execution `1825` successfully saved
the real CNBC article *UAE severs trade with Iran after reported missile strike* (source
`a4bbad2b-7b38-466e-bbc3-4c97f4bfd367`). Phase 2 found 6 candidates; Phase 3 created 5 `FINAL`
Event records and retained 1 `EXCEPTION`. Issue-first also ran, but correctly withheld its
proposed Issue because the first event evidence quote changed the source wording from
“The United Arab Emirates” to “The UAE”; the evidence rule requires a verbatim source quote.
The main workflow therefore succeeded without a technical error, no new Issue was published, and
the valid Issue totals remain 9 Issues / 35 Issue events. The next pipeline change, if approved,
is to make the Issue-first prompt preserve evidence quotes verbatim and then reprocess this one
source through the pipeline—never repair the Issue by hand.

**2026-08-20 main runtime consolidation:** the Issue-first work is merged into local `main`.
The final application now runs only as the `terra_space` Docker Compose group (one healthy
frontend on `localhost:3000` and one healthy backend); the temporary Issue-first preview and
both disposable bridge-test database containers were removed without deleting any volume or
Supabase data. The final `/api/issues` check returned 9 valid Issues and the browser preview
rendered the same 9 results. The `issue-first-preview-2026-08-20` Git tag remains as the
pre-merge checkpoint.

**2026-08-20 Phase 3 recovery:** after the local Supabase endpoint repair, the saved
real source article was rerun from Phase 3 only—without creating a second source article.
The run completed with no technical error: two Event records reached `FINAL`, while one
was retained as an `EXCEPTION` because the pipeline safeguard rejected it. This is normal
pipeline validation, not a review or manual correction.

**2026-08-20: the verified Issue-first rollout is merged into local `main`.** The separate
Issue-first workflow produced 9 valid
Issues and 35 valid events; 13 results remain withheld by pipeline validation, with no manual
review or correction. `/issues` is live beside the unchanged `/dashboard` and `/events` fallback
routes. No relationship arc was stored because no article supplied two fully grounded actor
locations. See the [rollout evidence](plans/evidence/issue-first/live-rollout-2026-08-20.md).

**Next action:** use the active main form for the next real article and observe its normal
pipeline result in the existing fallback and Issue-first views. Do not create synthetic articles
only for testing. Analytics, pipeline-status UI, and any retirement of existing routes remain
separate owner-approved work.

**2026-08-20 workflow integration:** the main **Terra Space - Full News Processing** workflow
now starts the guarded Issue-first workflow immediately after Phase 1 saves an article, in parallel
with its existing Phase 2/3 event flow. The main workflow and the four required child workflows
were activated after MCP validation confirmed the whole graph has zero errors and zero warnings.
No article was reprocessed or created during activation. The main form is the normal entry point;
the child workflows are published because current n8n requires every referenced sub-workflow to be
published before it can activate the parent.

**2026-08-20 local Supabase environment note:** this machine reserves Windows ports
`54271`–`54370`, so Supabase cannot use its default `54320`–`54329` port group. The
local Supabase configuration at `D:\local-supabase\supabase\config.toml` therefore uses
the matching `55420`–`55429` range instead (API `55421`, database `55422`, Studio
`55423`).

**2026-08-20 n8n Supabase connection repair:** the shared n8n **Supabase account**
credential was repaired with the active local API port `55421` and its matching local
service key. All 14 Supabase nodes in the three active Terra Space pipeline workflows use
that shared credential; the active main, Phase 1, Phase 2, Phase 3, and Issue-first
workflows passed MCP structural validation with zero errors and zero warnings. The next
normal article submission is the live connection check; no synthetic source article was
created for this repair. A later live run identified one separate Phase 3 HTTP request
that had its old API port `54321` written directly into the node instead of using the
shared credential; it was updated and confirmed in both the saved and active workflow
versions as port `55421`.

**2026-08-15: owner set a pipeline-only data-correction rule while designing the Issue-first Terra
Insight experience.** Terra Space will not offer event or Main Issue review, approval, edits, or
other correction controls. Defects must be fixed in the responsible pipeline stage and affected
source articles reprocessed, while preserving run history. Terra Insight will become a read-only
Issue-first analysis workspace: a selected article-level Main Issue filters its related events on
the globe; selecting an event can show all evidence-backed source-to-target actor arcs. The
standalone Events and Event Review menus are to be removed in the forthcoming redesign; a future
Analytics menu will analyse all Issues together. See [Pipeline-Only Data Correction](decisions/Pipeline-Only-Data-Correction.md).
Only fully pipeline-valid Issues will enter Terra Insight; exceptions remain in pipeline
observability. After implementation and verification, the owner plans to reprocess every article
currently stored in the Terra Space database. The current application and pipeline remain the
fallback until the owner confirms the redesigned version is solid after that reprocess; only then
may the current version be removed.

**2026-08-16 scope revision:** keep the first Issue-first release deliberately small: build only
the parallel validated data path and one new Issues screen, then demonstrate it with safe test
data. Analytics, Pipeline Status, full-database reprocessing, and removal of current menus/routes
are deferred. The current application and pipeline remain unchanged as the fallback.

**2026-08-11: fixed a real parallel-save failure in the n8n Phase 3 pipeline.** Master workflow
execution `1697` failed after Phase 2 found four candidates because several Phase 3 event requests
tried to create the same country-level Syria location simultaneously. The database's unique-place
protection correctly rejected the duplicate insert, but the authority function did not safely
reuse the already-created row. Migration `20260811190923_make_phase3_location_creation_atomic`
now uses an atomic create-or-reuse operation inside
`terra_space_phase3_create_pipeline_event`; it changes only the function code and does not modify
or delete existing data. A real PostgreSQL regression test sends eight simultaneous candidates for
the same Syria location and confirms all eight events are saved while sharing one location row
(`5` focused Phase-3 model tests pass). `Terra Space - Event Records` validates at 0 errors and 0
warnings. A fresh owner-triggered master rerun remains the live confirmation step; it was not run
automatically because it would create real pipeline records.
**2026-08-20 Issue preview recovery:** the local Supabase database retained its 9 valid Issues
and 35 valid Issue events. A preview restart lacked the read-only `TERRA_SUPABASE_URL`, so the
Issue API returned 503 and the server-rendered page incorrectly showed an empty list. The local
read-only connection was restored; the Issue API and `/issues` preview again return all 9 valid
Issues. The screen now preserves an unavailable-API error instead of presenting it as “0 valid.”

**2026-08-20 header simplification:** the global LM Studio status indicator was removed
from the application header. Processing belongs to the backend/n8n pipeline, so its
connection status no longer distracts from Terra Insight; LM Studio connection controls
remain in Settings.

**2026-08-16: the reduced Issue-first Terra Insight release is complete on branch
`codex/issue-first-terra-insight`, with the safe preview owner-reviewed.** It adds a parallel
validated Issue pipeline contract, GET-only Issue API, standalone `/issues` screen, and
evidence-backed actor arcs. The owner simplified the preview to an Issue list on the left and a
single globe on the right: selecting an Issue displays all of its valid actor arcs together. The
article card, event list, evidence/relationship text, and separate map frame were removed.

The current application, routes, pipeline, and database data remain unchanged as the fallback. No
real articles were reprocessed and no live database migration was applied. Safe preview processes
were stopped at the owner's request after review. See [Issue-first Implementation](plans/2026-08-15-issue-first-terra-insight-implementation.md).

**Next action:** when the owner returns, decide whether to keep refining the safe preview or plan
the owner-approved real local rollout. Do not apply the new migrations to the live local Supabase
database, reprocess articles, or remove the current application without explicit owner approval.

## Current focus

**2026-08-11 update: the full Terra Space Supabase application transition is implemented and verified by the automated test suites; live browser verification against real local Supabase is still owner-pending, per the owner's own choice not to run write-heavy scenarios against real data unattended.** Following the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md), Terra Space's own backend now uses local Supabase/PostgreSQL as its only live database — Dashboard and Events have full authority (publish, reject, archive, restore, edit, delete), not just read-only preview. SQLite is preserved, untouched, as rollback material.

- **A real architectural gap was surfaced to the owner rather than guessed.** The Postgres schema has no equivalent of Terra Space's own staged extraction pipeline (Add document → Process → draft events → approve). The owner chose to retire it rather than rebuild it against Postgres, since n8n already does that job end to end. See the [retirement decision](decisions/Retire-Terra-Space-Own-Extraction-Pipeline.md). Removed: `extraction.py`, `classifiers.py`, `signal_parser.py`, `extraction_log.py`, the old `Source` model (Document *is* the Phase 1 source now), the universal draft/approve-all workflow, and the `/api/documents/process`/`retry`/`extraction-log` and `/api/events/{id}/approve-all` routes.
- **Backend:** `TERRA_DATABASE_URL` is now required to start (a plain-language error otherwise); SQLite is only ever used when a test explicitly passes a `sqlite:///` URL. Every SQLAlchemy model now maps to its real `terra_space_`-prefixed table (`Document` → `terra_space_phase1_sources`, `Event` → `terra_space_phase3_events`, etc.), using a `Uuid(as_uuid=False)` type on every id/FK column — a real psycopg3/PostgreSQL `uuid`-vs-`varchar` mismatch that only real Postgres integration tests caught. `Event` gained `origin` (`pipeline`/`manual`), `pipeline_outcome`, `dashboard_status`, and human-modification metadata; `dashboard_status` transitions (`publish`/`reject`/`archive`/`restore`) are enforced service-side (`merged` blocks direct edit/delete/restore). Duplicate detection now compares against `published` events. Two frozen Alembic migrations that used to import the evolving ORM `Location` model were rewritten to use raw SQL instead, since frozen historical migrations must not depend on today's Postgres-shaped models.
- **Frontend:** Dashboard and Events now call the primary `events-api.ts` (not the read-only bridge), with Edit, Publish, Reject, Archive, Restore, and protected Delete wired into the event-detail panel on both screens; every action refetches the selected event, event list, and summary so the map/timeline/list update immediately. `EventRead` carries `origin`/`pipeline_outcome`/`dashboard_status`/`human_modified_at`/`human_modified_fields`. Terra Sense's Overview now reports `hidden`/`published` Phase 3 event counts instead of the old local draft/approved queue, since that queue no longer exists. Four event-review components with zero real importers (`add-event-form.tsx`, `event-card.tsx`, `epistemic-status-control.tsx`, `duplicate-compare-panel.tsx`, referencing the now-removed `ReviewStatus`/`claim`/`rumor` types) were deleted as dead code rather than fixed.
- **Ops tooling:** `Start-TerraSpace.ps1` now fails fast with a plain-language message when `TERRA_DATABASE_URL` is missing or local Supabase isn't reachable on its port, instead of waiting out the full startup timeout. `Backup-TerraSpaceDatabase.ps1`/`Restore-TerraSpaceDatabase.ps1` now operate on a `pg_dump`/`pg_restore` of Terra Space's own tables only (never the pipeline's `phase2_*` tables or any other Supabase project data) plus an attachments manifest; restore requires typed confirmation and refuses to run against anything that isn't clearly the local Supabase instance. `tools/Test-Persistence.py` now uses a disposable Postgres sentinel row, removed through the real `DELETE /api/event-types/{id}` endpoint rather than raw SQL. README documents the new `.env` requirement and a manual legacy-SQLite-inspection path (no automated SQLite restore exists, and none restores into Supabase automatically).
- **Tests:** full backend suite — 237 passed, run against both SQLite (unit) and a disposable real PostgreSQL service, including new `test_phase_prefixed_models.py` (schema-drift vs `information_schema`, NOT NULL/dedup/FK-restrict behavior) and `test_phase3_event_authority.py` (published/hidden visibility, rejected/archived exclusion, restore roundtrip, human-modified metadata, deletion leaves `phase3_event_runs` untouched, duplicate detection against real data). Frontend: 218 tests passed (several rewritten from bridge-api mocks to events-api/documents-api mocks, including new coverage for publish/edit/delete flows), clean lint, clean production build.
- **What's deliberately not done yet:** the live browser scenarios (Documents, Event Review, Events/Dashboard, Settings, offline LM Studio, responsive) have not been run against the owner's actual local Supabase instance — those flows publish/reject/archive/delete real event rows, and the owner chose not to run them against real data without being present. A live check also found the currently-running Terra Space containers (pre-dating this session's code) still writing to the archived SQLite file (`terra-space.db`, `sha256:71b68fd3…`, last written under the old pre-cutover code) — this is expected until the containers are rebuilt with this session's code, at which point the checksum should freeze for good; that rebuild-and-recheck is part of the owner-pending live verification above, not yet done. Documents/Sources stays on the read-only Supabase bridge built in the prior step (`source-bridge-list.tsx`) — reviving full Documents CRUD against the primary API was considered but is out of this plan's Task 5 scope, so it was left alone.
- Not committed yet, per instruction: the owner reviews this result before anything is committed.

**Next action:** the owner reviews this implementation, then decides whether to run the live browser verification pass (Documents, Event Review, Events/Dashboard, Settings, offline LM Studio, responsive) against real local Supabase data before approving final cutover, per the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md)'s completion gate.

**2026-08-11 update: automatic event visibility and manual Dashboard filtering are built, tested, and verified against real live data — the direction changed right after the bridge above, based on real owner feedback.** Right after the read-only bridge went live, the owner watched a real article produce four Phase 2 candidates that all became Phase 3 `EXCEPTION` records — and none of them appeared anywhere in Terra Space, because the bridge only ever showed `dashboard_status: published`. The owner's new direction: every processed event should appear automatically, exception or not, with the owner filtering or hiding events manually instead of the pipeline hiding them automatically. See the [Automatic Event Visibility With Manual Filtering decision](decisions/Automatic-Event-Visibility-With-Manual-Filtering.md) (which amends the [Fresh Phase-Prefixed Supabase Architecture](decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md) decision's Dashboard-authority rule), its [design](plans/2026-08-11-automatic-event-visibility-design.md), and its [implementation plan](plans/2026-08-11-automatic-event-visibility-implementation.md), all `completed`.

- **Backend:** the bridge's event query (`app/services/supabase_bridge.py`) now selects `dashboard_status in ('published', 'hidden')` instead of `published` only — `rejected`/`archived`/`merged` (a deliberate future owner decision, not yet possible) stay excluded. `EventRead` gained three optional fields (`pipeline_outcome`, `dashboard_status`, `exception_reason`), and `DashboardSummaryRead` gained `exception_count`, all additive so SQLite-backed events are unaffected. `exception_reason` is built from the latest matching `phase3_event_runs` row's `safeguard_reasons`/`error_message`, joined by `candidate_key`. `GET /api/bridge/events` and `.../dashboard-summary` accept a new `dashboard_status` query parameter (`published`/`hidden`/blank-for-both) for the owner's manual visibility filter.
- **Frontend:** a new "Visibility" filter (All processed events / Published only / Exceptions only) joins the existing filter bar on Dashboard and Events. A new `frontend/src/lib/hidden-events.ts` (same `useSyncExternalStore`/`localStorage` pattern as `appearance-settings.ts`) lets the owner hide any individual event from their own browser only — never sent to Supabase or the backend, and explained as such in the UI. An exception event is now clearly marked everywhere it appears: an "Exception" badge in the event list/register, a distinct red-orange globe pin color (vs. the normal amber), and a callout with the recorded reason on the event detail view. Dashboard's summary gained "Pipeline exceptions" and "Hidden by you" stats, both clickable like the existing "Unresolved locations" stat, with the hidden-by-you list also offering a per-row "Unhide".
- **A pre-existing gap was found and fixed along the way:** `--status-warning`, referenced by five existing CSS rules, was never actually defined in `:root`, so those rules silently fell back to unstyled. Defined it (matching the existing amber accent) since the new Exception badge/callout needed it to render correctly.
- **A copy-accuracy pass followed naturally from the behavior change:** several bridge-screen strings that said "approved"/"published" (`EventList`'s count and empty state, its and `EventTimeline`'s "Approve extracted events in Event Review" link, Events' panel title and page description, Dashboard's eyebrow) were updated to "processed" language, since they would otherwise mislead the owner about what's actually shown now that exceptions appear automatically. Both affected shared components are used only by the two bridge screens, confirmed by search, so nothing else was affected.
- **Tests:** 5 new/updated backend tests against the disposable PostgreSQL service (exception rows now returned with correct fields, `dashboard_status` filtering, `exception_count`, `rejected` still excluded) plus one existing SQLite dashboard-summary test updated for the additive field. Full backend suite: 291 passed. Frontend: 231 tests passed (new `hidden-events.test.ts`, plus updates across `event-list`, `event-timeline`, `event-globe`, `world-map`, `event-list-panel`, `dashboard-summary`, `dashboard-workspace`, `events-page`), clean lint, clean production build.
- **Live verification against the real local Supabase exceeded the design's own bar.** After rebuilding and restarting the backend/frontend Docker images, `GET /api/bridge/events` went from 5 rows (published only) to 10 (5 published + 5 hidden); the owner's real four-candidate Bulgaria drone article's `EXCEPTION` records all appeared, each with a real recorded reason (e.g. "Taxonomy response was not valid JSON."); a fifth, unrelated exception carried a detailed multi-part safeguard rejection reason (a Portugal/Gaza location mismatch), confirming `exception_reason` handles both a bare error message and a structured reasons list against real data. `dashboard-summary` correctly reported `exception_count: 5`. In the browser, `/events` showed all 10 rows with "EXCEPTION" badges on the right 5, and `/events?dashboard_status=published` correctly narrowed to 5 with "1 active" filter shown. The hide/unhide flow was not separately re-checked against live data beyond this, since it is a pure client-side feature already covered end-to-end by passing automated tests. No new write reached Supabase at any point; SQLite was not touched.

**Next action:** the owner decides whether to proceed with the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md) (the full cutover: editing, processing, and Dashboard authority moving to Supabase), which has already been updated to keep this same automatic-visibility rule rather than reverting to automatic exception-hiding.

**2026-08-11 update: the Supabase Read-Only Bridge is built, tested, and verified against real live data.** Following the [Supabase Read-Only Bridge Design](plans/2026-08-11-supabase-read-only-bridge-design.md) and its [implementation plan](plans/2026-08-11-supabase-read-only-bridge-implementation.md), Sources, Event Review, Events, and Dashboard now read the local Supabase database directly and read-only; SQLite is untouched (its archived rollback checksum was re-verified unchanged). This is a verification-first step, not the full cutover — Terra Sense's Overview, Event Taxonomy, and Actors screens still read SQLite, and no editing/approval/reprocessing authority moved to Supabase.

- **A real, undocumented discrepancy was found and corrected before any bridge code was written.** The live local Supabase database had every phase-prefixed table (and `app_settings`) already renamed to a `terra_space_` prefix (for example `phase1_sources` → `terra_space_phase1_sources`) on 2026-08-11, done directly against the database by the owner and Codex, because this Postgres instance is shared with unrelated datasets (`gdelt_doc_articles`, `NIRES_Pipeline`, `news_media_NDC`). This rename was never committed to git or recorded in Project Knowledge. Confirmed intentional by the owner, then reconciled: the three missing migrations were backfilled into `supabase/migrations/` from `supabase_migrations.schema_migrations`, and every stale bare-name reference in `supabase/tests/phase_prefixed_foundation.sql`, `supabase/tests/phase3_reference_data.sql`, and `supabase/seed/20260810_phase3_reference_data.sql` was corrected — including one legacy-source-table reference (`terra_space_location_gazetteer` → `terra_space_legacy_location_gazetteer`) that a first identifier-only pass missed. All four migrations now replay cleanly against a fresh database and reproduce the live 18-table schema exactly.
- **Backend:** a new, separate read-only query layer (`app/db/supabase_bridge.py`, `app/services/supabase_bridge.py`, `app/schemas/supabase_bridge.py`, `app/api/routes/supabase_bridge.py`) sits beside the untouched SQLite code, using plain parameterized SQL — no ORM, no `Base.metadata.create_all()`. Every connection runs inside a genuine PostgreSQL read-only transaction (`execution_options={"postgresql_readonly": True}`), verified by a test that a write attempt through it is rejected by PostgreSQL itself, not just by careful code. Nine new `GET /api/bridge/*` routes return `503` with a plain-language message when `TERRA_SUPABASE_URL` is unset, rather than silently falling back to SQLite. `EpistemicStatus` was widened from the old 4-value set (`confirmed|claim|rumor|denied`) to the approved 6-value set (`confirmed|reported|alleged|planned|denied|unknown`) in both backend and frontend, additively — SQLite events still only ever produce the original four — because real Phase 3 data already contains `"unknown"` and the bridge must show it honestly rather than crash or mislabel it.
- **A real driver bug surfaced immediately and is fixed centrally:** psycopg3 loads PostgreSQL `uuid` columns as `uuid.UUID` objects, not strings, which failed every bridge schema's `id: str` validation. Fixed once via a `TextLoader` registered on every connection the read-only engine hands out, rather than scattering `::text` casts through the SQL.
- **Frontend:** `bridge-api.ts` deliberately reuses the existing `EventRead`/`EventTypeRead`/`ActorRead`/`DashboardSummaryRead` TypeScript types, so Dashboard's globe, timeline, filter bar, and list panel needed no changes beyond swapping their data source — real proof that "the same read-only event response" claim in the design holds. Events and Dashboard lost their edit/delete/approve controls entirely. Sources and Event Review got new, honestly-scoped read-only views (`source-bridge-list.tsx`, `candidate-review-workspace.tsx`) instead of reusing the old SQLite-shaped components, since Phase 1/Phase 2 records don't share that shape. A shared `ReadOnlyBridgeNotice` banner appears on all four screens.
- **Tests:** 24 new backend tests (read-only enforcement, service queries, API routes) run against a disposable `postgres:17-alpine` service (`docker-compose.supabase-bridge-test.yml`) that a new `backend/tests/supabase_bridge_test_support.py` seeds by replaying three of the four checked-in migrations (the fourth renames pre-repository legacy tables a fresh database never had). Full backend suite: 282 passed. Frontend: 214 tests passed (5 test files rewritten for the new read-only pages/components), clean lint, clean production build.
- **Live verification against the real local Supabase exceeded the design's own bar.** Sources showed all 6 real `terra_space_phase1_sources` rows; Event Review showed all 4 real Phase 2 candidate reviews with correctly parsed main issues and candidates; Events and Dashboard showed all 5 real published Phase 3 events, including `"TEST EDIT — should survive rerun"` — the exact human-edited title from the n8n transition plan's idempotency test — proving the bridge surfaces human authority edits correctly, not just raw pipeline output. The archived SQLite rollback checksum (`baa5f4aa…`) is confirmed unchanged.
- **Known simplifications, recorded as non-goals rather than left silent:** Sources has no per-source detail sub-page in this bridge, so an event's source reference shows as plain text instead of a deep link (the existing `/documents/[documentId]` route is SQLite-shaped and untouched); the Events/Dashboard epistemic-status filter dropdown still offers only the original four values, matching the design's explicit deferral of filter-behavior changes; `/sense` Overview keeps reading SQLite pipeline counts.

**Next action:** the owner decides whether to proceed with the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md) (the full cutover: editing, processing, and Dashboard authority moving to Supabase), now that this bridge has proven the application and pipeline read the same live data.

**2026-08-10 update: plan 2 of 4 (n8n phase-prefixed table transition) is done — all six live tests pass against real data, and the plan is now `completed`.** Following the [n8n Phase-Prefixed Table Transition Implementation Plan](plans/2026-08-10-n8n-phase-table-transition.md), all three pipeline stages now write to the fresh Supabase schema from plan 1 instead of the legacy `terra_space_*` tables. Full JSON baselines for all four workflows were exported first (git-ignored; pointer at [plans/evidence/2026-08-10-n8n-transition/README.md](plans/evidence/2026-08-10-n8n-transition/README.md)).

- `Terra Space - Input News Manual` (9 → 11 nodes): `Save Manual News to Supabase` now writes `phase1_sources` instead of `terra_space_news_v2`; a new `Prepare Phase 1 Processing Run` → `Save Phase 1 Processing Run` pair appends a `phase1_processing_runs` row (model, prompt version, character count, raw cleaned text, a hand-rolled `submission_key` UUID — not `crypto.randomUUID()`, matching this project's established reason for avoiding it in n8n Code nodes) after every save. `Build Phase 1 Stage Result` now reads the saved row's `id` and still exposes it as `p1_uuid`, so nothing downstream needed to change.
- `Terra Space - Event Candidates` (21 nodes, unchanged count): `Get Phase 1 Article` now reads `phase1_sources` by `id`; latest/history persistence now targets `phase2_event_candidates`/`phase2_candidate_runs` keyed by `phase1_source_id` instead of `p1_news_uuid`. The internal JS payload field name `p1_news_uuid` was deliberately left alone everywhere it's just a variable, not a Supabase column — only the actual table/column mappings changed.
- `Terra Space - Event Records` (33 → 30 nodes): reads now go through `phase1_sources`, `phase2_event_candidates`, `phase3_event_types`, and `phase3_location_gazetteer`; run history is now append-only in `phase3_event_runs`. The six-node legacy latest-row create/update subgraph (`Prepare Latest Event Row` through `Create Latest Event Record`) is gone, replaced by two new nodes — `Prepare Authoritative Event Payload` (reads the persisted run's `outcome_payload`, maps factual/taxonomy/location data into the RPC's expected shape, and maps `DAY/MONTH/YEAR/UNKNOWN` date precision to the authoritative table's `exact/month/year/unknown`) and `Create Authoritative Phase 3 Event` (an HTTP Request node calling `phase3_create_pipeline_event` via Supabase's PostgREST RPC endpoint, authenticated through the existing Supabase credential rather than an inline key, per the plan's constraint). A repeated candidate key is handled entirely inside the SQL function — it returns the existing event id and writes nothing further, so no extra idempotency logic was needed on the n8n side.
  - **Real deviation from the written plan:** the plan assumed `Get Active Event Types -> phase3_event_types` alone would suffice, matching the legacy flat table's shape. It doesn't — `phase3_event_types` was deliberately normalized (per the [Event Taxonomy Tree and Management](decisions/Event-Taxonomy-Tree-and-Management.md) decision already shipped before this plan) into a flat type table plus a separate `phase3_taxonomy_nodes` tree. Added a new `Get Taxonomy Nodes` read and rewrote `Collect Active Event Types` to walk each active leaf up through its subcategory/category/domain parents, reproducing the exact `active_types` shape (`event_type_id`, `event_type_name`, `event_type_description`, `domain_name`, `category_name`, `subcategory_name`, `is_active`) the rest of the pipeline already expected — so `Build Taxonomy Request` and `Validate Taxonomy Result` needed no changes.
- `Terra Space - Full News Processing` (the master, 9 nodes): needed **no changes**, because every stage-result field name it reads (`stage`, `status`, `p1_uuid`, `candidate_count`, `final_count`, `exception_count`) was deliberately kept identical across the table migration.
- All four workflows re-validated at 0 errors/0 warnings after their respective changes and confirmed still inactive throughout.

**What is not done: live execution.** n8n only accepts an external (webhook/form/chat) trigger on an *active* workflow, and this plan's Global Constraints keep all four inactive throughout — confirmed directly by attempting a test trigger against the inactive Phase 1 form, which n8n refused with "Workflow must be active to trigger via this method." Every test the plan calls for (grounded article end-to-end, no-candidate article, blank/malformed input, a human-edited `phase3_events` row surviving a Phase 3 rerun unchanged) therefore needs the owner to run it from the n8n editor's own "Execute workflow" control, exactly as every prior live test in this project has been run; Claude can reconcile the results afterward through read-only Supabase queries. See the plan's "Owner handoff" section for the exact suggested sequence. The plan's status is `in-progress`, not `completed`, and its completion gate is explicitly marked not yet satisfied.

**The owner's first live test attempt (executions `1657`/`1659`/`1661`, all via the master) found a real defect, now fixed — pre-existing, not caused by this plan.** All three attempts failed identically at `Prepare Clean Text for Supabase` with "LM Studio returned an incomplete cleaned article." Reading the execution data back showed the model's response was actually complete (589 tokens, `finish_reason: "stop"`, ending naturally) — the rejection was a false positive. The test article's raw HTML contained two large Google ad `<iframe>` blocks (thousands of characters of tracking-URL query strings); `Remove Obvious Non-Article Text`'s deterministic cleanup strips markdown images/links and photo captions but never stripped raw `<iframe>`/`<script>` tags, so the "raw" length used for the completeness check (`max(500, 50% of raw length)`) stayed inflated by the ad markup, and a genuinely complete ~2,850-character cleaned article failed to clear that inflated bar. This node was untouched by the table-migration changes — the failure never reached `phase1_sources` at all. **Fixed:** `Remove Obvious Non-Article Text` now also strips `<script>...</script>` and `<iframe>...</iframe>` blocks before the length check ever sees the text. Verified by simulation against a reconstruction of the failing article (iframes confirmed stripped, preclean length dropped from inflated to realistic) and re-validated at 0 errors/0 warnings; **not yet re-confirmed with a real re-run**, which needs the owner.

**The owner's retry (execution `1663`/`1664`/`1665`/`1666`) confirmed the iframe fix and found two more defects, both in this plan's own new Phase 3 code — now fixed.** Phase 1 and Phase 2 both succeeded this time (2 grounded candidates found), confirming the iframe/script fix works. Phase 3 then failed:

1. **`Prepare Authoritative Event Payload` errored with "A 'json' property isn't an object."** Its `mode` is `runOnceForEachItem`, which requires the code to `return { json: {...} }` for a single item — every other per-item Code node already added by this plan's earlier work follows that shape, but this one mistakenly returned `[{ json: {...} }]` (array-wrapped, the shape used for the *other*, default Code-node mode). Fixed by removing the array wrapper.
2. **A more serious defect, found by reading the actual request LM Studio rejected:** `Classify Event Type` returned HTTP 400 on every candidate and every attempt — "request (13003 tokens) exceeds the available context size (8192 tokens)." The taxonomy request's "Active leaves" list held the same 12 leaves duplicated roughly a dozen times over. Root cause: `Get Taxonomy Nodes` was connected directly downstream of `Get Active Event Types`, and `Get Active Event Types` returns **12 separate items** (one per active type row) — in n8n, a node fed N items re-runs its own query N times, so `Get Taxonomy Nodes` (33 rows) executed 12 times, and `Collect Active Event Types`'s join then multiplied every leaf accordingly. Fixed by making `Get Active Event Types` and `Get Taxonomy Nodes` parallel branches off `Get Phase 1 Source` (each fed by exactly one item, so each runs exactly once) and adding a `Sync Taxonomy Sources` Merge node (`append` mode) between them and `Collect Active Event Types`, guaranteeing both sources are complete before the join runs. No prompt, model, or classification logic changed — only the data-fetching graph shape. `Terra Space - Event Records` is now 31 nodes, re-validated at 0 errors/0 warnings, still inactive.

Neither defect reached `phase3_events` (0 rows before the fix), and neither is present in the legacy pipeline this plan is migrating away from — both are new code introduced by this plan's own Task 4, caught by the owner's first real test rather than by static validation, which only checks structure/expressions and cannot see a runtime request-size or return-shape problem like these.

**The owner's next retry (master execution `1669`, 82.6s) succeeded completely — the first clean end-to-end run since the table migration.** One form submission of the same French Rafale/Latvia article ran Phase 1 (`p1_uuid 81322f2f-a959-438e-a77e-0ce5adc0f582`), Phase 2, and Phase 3 in sequence with no UUID ever shown to or typed by the user. Final message: "Saved article; found 3 candidate(s); created 3 final record(s) and 0 exception(s)." Every number reconciles against a direct, read-only database check:

- `phase1_sources`: 1 row, `completed`, cleaned text 2,890 characters; `phase1_processing_runs`: 1 `SUCCESS` row with a matching character count.
- `phase2_event_candidates`/`phase2_candidate_runs`: 1 latest row and 1 history row, both holding the same 3 candidates.
- `phase3_event_runs`: exactly 3 rows, all attempt 1, all `factual_status: SUCCESS`, `taxonomy_status: CLASSIFIED`, `safeguard_status: ACCEPT` — no retries needed, confirming both Phase 3 fixes hold under a real run.
- `phase3_events`: exactly 3 rows, all `origin: pipeline`, `pipeline_outcome: FINAL`, `dashboard_status: published`, each with a real (non-null) `event_type_id`, and `human_modified_at: null`.
- Grounding checked directly against the stored article, not just trusted: `raw_content_text` still contains the ad `<iframe>` blocks (8,822 characters, correctly untouched — only the *cleaned* copy is filtered), `cleaned_content_text` has zero `<iframe>` occurrences (2,890 characters), and all 3 candidate evidence quotes plus all 3 title evidence quotes are exact substrings of that cleaned text.

**Still outstanding from the plan's live-test checklist** (needs the owner, since re-running a workflow requires the n8n editor while all four stay inactive): rerunning Phase 3 for this same `p1_uuid` to confirm the repeated-candidate-key path stays idempotent (no duplicate `phase3_events` rows); simulating a human edit to one of these 3 events and confirming a Phase 3 rerun leaves it untouched; the deliberately eventless article; and the blank/malformed-input negative tests. The n8n transition plan stays `in-progress`, not `completed`, until those are done.

**Both the idempotency and human-edit-survival checks are now confirmed (execution `1673`).** With the owner's explicit yes, one `phase3_events` row was set to `title: "TEST EDIT — should survive rerun"`, `human_modified_at: 2026-08-10 15:01:47`, `human_modified_fields: ["title"]` via a plain SQL `UPDATE` (the Dashboard that would normally do this doesn't exist yet — that's plan 3). The owner then re-ran `Terra Space - Event Records` for the same `p1_uuid` from the n8n chat trigger. Afterward: `phase3_events` still held exactly 3 rows for that source (no duplicate created — idempotency holds), and the edited row's title/`human_modified_at`/`updated_at` were byte-for-byte unchanged, as were the other two rows' `updated_at` values, even though `phase3_event_runs` correctly grew by 3 fresh rows (run IDs 8-10) — proving the rerun reprocessed every candidate through the full pipeline but `phase3_create_pipeline_event` correctly wrote nothing further to the authoritative table for an existing `candidate_key`.

**The last two live tests both passed, closing out this plan.**

- **Eventless article** (master execution `1674`, 8.4s, a herb-storage how-to article): `status: COMPLETED_NO_CANDIDATE`, Phase 3 never invoked. Database reconciled at exactly 1/1/1/1/0/0 across `phase1_sources`/`phase1_processing_runs`/`phase2_event_candidates`/`phase2_candidate_runs`/`phase3_event_runs`/`phase3_events`.
- **Blank input** (executions `1681`/`1682`): both failed at `Normalize Phase 1 Input` in 32-33ms — "Phase 1 input is missing p1_published_date" (the check reports the first missing field, and `p1_raw_content_text` was blank in both attempts) — before the Supabase save node ever ran. Total `phase1_sources` row count matched exactly the count of intentional test articles.
- **Incidental finding, not a defect:** the master form was submitted twice near-simultaneously during this round (execution `1677`, canceled). The already-in-flight Phase 1 sub-call it had already started still completed as one clean, self-contained source+run pair, with correctly zero rows anywhere downstream of it — useful confirmation that a mid-flight cancellation does not leave partial or inconsistent state.

**The [n8n Phase-Prefixed Table Transition Implementation Plan](plans/2026-08-10-n8n-phase-table-transition.md) is now `status: completed`.** All six required live tests pass, all three real defects found along the way are fixed and documented, all four workflows remain inactive, and the [Roadmap](Roadmap.md) has been updated to mark this milestone done. Two Phase 2-specific edge cases (rerunning to confirm the latest-row *update* path specifically, and a dedicated `NO_MAIN_ISSUE` chat-trigger test) were deliberately deferred as non-blocking — see the plan's "Live execution evidence" section for the reasoning.

**Post-completion correction: the blank-input test's own setup accidentally corrupted a node, now fixed — no test evidence was affected.** While manually entering test values for the `Phase 1 Internal Input` node's schema panel, the owner's editor session ended up with each of the six field names replaced by the whole "fieldname: example value" instruction text (e.g. `p1_published_date: 2026-08-10` as a literal field name) and lost the `type: "string"` on every field. This was saved to the live workflow, not just a transient editor view — confirmed by reading the node back through the API — and would have broken the master's call into this node had it stayed. Checked the master's own execution history before fixing: no run happened between the corruption and the fix, so the recorded evidence for the blank-input test and all five other live tests is unaffected. Restored the six fields to `p1_published_date`, `p1_title`, `p1_raw_content_text`, `p1_source_domain`, `p1_source_url`, `p1_author` (all `type: "string"`), re-validated at 0 errors/0 warnings.

**Next action:** the owner decides whether to start plan 3, the [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md), which moves the FastAPI/Next.js application itself from SQLite to this same Supabase database and implements Dashboard authority.

**2026-08-10 update: plan 1 of 4 is done. The fresh phase-prefixed Supabase foundation exists, is verified, and is waiting on the owner's approval before the n8n transition starts.** The [Fresh Phase-Prefixed Supabase Foundation Plan](plans/2026-08-10-fresh-supabase-foundation.md) is complete; its execution notes record where the machine differed from the written plan. Nothing was deleted, emptied, renamed, or overwritten, and **all four n8n workflows are still inactive** — the whole n8n instance reports zero active workflows.

- **Rollback material first.** A dated SQLite copy sits at `data/database-backups/2026-08-10_130742/terra-space.db` (196,608 bytes, sha256 `baa5f4aa…`), and a full Supabase archive at `data/backups/supabase/20260810-130801/local-supabase.dump` (45.9 MB, sha256 `53ad2c6f…`), confirmed readable by `pg_restore --list` (959 entries). Both checksums were re-checked after all the database work and are unchanged. `data/backups/README.md` explains where backups live and how the Supabase one is made and verified; the dumps themselves are git-ignored.
- **One checked-in migration**, `supabase/migrations/202608100001_fresh_phase_prefixed_foundation.sql`, creates 18 tables — 3 Phase 1, 2 Phase 2, 12 Phase 3, and `app_settings` — with constraints, 27 indexes, a shared `updated_at` trigger, Row Level Security, and a plain-language description on every table plus 72 columns. It was applied once, whole, inside a single transaction, and is registered as `202608100001 fresh_phase_prefixed_foundation`.
- **`phase3_create_pipeline_event(jsonb)` is the only way the pipeline may create an authoritative event.** The rules now live in the database, not in workflow nodes: a missing candidate key or Phase 1 source is refused; `FINAL` becomes a `published` event and `EXCEPTION` a `hidden` one; the full candidate and event JSON are kept as-is; and a repeat call with the same candidate key returns the existing event and changes nothing at all. `human_modified_at` and `human_modified_fields` are never written by it.
- **Reference data only — no application records.** The twelve approved Event Types were copied keeping the identifiers they already had, the approved taxonomy was rebuilt as a 3 domain / 6 category / 12 subcategory / 12 leaf tree with fixed identifiers, and all **759,813** gazetteer rows were copied and split into explicit `country_iso3` / `admin1` / `city_regency` columns with zero rows skipped. Every Phase 1, Phase 2, and Phase 3 event and history table is empty, as the owner chose.
- **Verified.** `supabase/tests/phase_prefixed_foundation.sql` passes 7 checks inside a transaction that rolls itself back, including the two the architecture cares about most: a repeated candidate key produces exactly one event, and a rerun after a simulated owner edit leaves the owner's title, status, and authority metadata untouched. `supabase/tests/phase3_reference_data.sql` passes 5 more, including a row-by-row comparison of all 759,813 gazetteer rows against the original.
- **Security.** The browser-facing publishable key is refused on every new table (`HTTP 401 permission denied`) while the service role reads them normally and gets a clear rejection message from the authority function. Supabase advisor findings dropped from 107 to 69; all 38 that this migration caused are resolved, apart from 18 deliberate `rls_enabled_no_policy` notices, which is exactly the design the plan asked for. The 12 remaining errors are pre-existing legacy tables and were deliberately left alone.
- **Legacy data untouched.** `terra_space_news_v2` 10, `terra_space_event_candidates` 10, `terra_space_event_candidate_runs` 25, `terra_space_event_records` 15, `terra_space_event_record_runs` 123, `terra_space_event_types` 12, `terra_space_location_gazetteer` 759,813 — every count identical to before the work, and asserted by a test.

**Next action:** the owner reviews this summary and decides whether to start the [n8n transition plan](plans/2026-08-10-n8n-phase-table-transition.md). The remaining three plans have not been started. The final database cutover and any workflow activation still need the owner's separate, explicit approval.

**2026-08-10 update: fresh phase-prefixed local Supabase architecture and four-plan execution handoff approved; implementation is reserved for Claude.** The owner chose not to migrate existing SQLite application rows. Terra Space will start fresh in the current local Supabase deployment, while preserving SQLite as a dated read-only rollback archive. Tables will use literal `phase1_`, `phase2_`, and `phase3_` prefixes with plain-language PostgreSQL descriptions. `phase3_events` becomes the authoritative event table: `FINAL` records appear immediately in the Dashboard, `EXCEPTION` records remain hidden, and human edits/rejections/archives override later pipeline runs. Execution is decomposed into the [Supabase foundation](plans/2026-08-10-fresh-supabase-foundation.md), [n8n transition](plans/2026-08-10-n8n-phase-table-transition.md), [Terra Space transition](plans/2026-08-10-terra-space-supabase-transition.md), and [cutover verification](plans/2026-08-10-supabase-cutover-verification.md), each with a stop gate. No database, workflow, or application implementation has been changed for this direction.

**2026-08-09 update: the one-click full news pipeline is built across four n8n workflows, validates cleanly, and is waiting on live testing that needs the owner.** Following the [One-Click Full News Processing Implementation Plan](plans/2026-08-08-one-click-full-news-processing.md), each of the three existing stages now has an internal, callable entry point beside its original interactive one, and a new master workflow runs all three from a single form submission.

- `Terra Space - Input News Manual` (`gABPryH3jTe2Ktz5`), 6 → 9 nodes. New `Phase 1 Internal Input` (Execute Workflow Trigger, six declared article fields) and `Normalize Phase 1 Input`, which both the existing form and the internal trigger now flow through; it rejects a blank required field before any LM Studio call or Supabase insert. New `Build Phase 1 Stage Result` after the save node returns `{ stage, status, p1_uuid, p1_title, cleaned_character_count }`.
- `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`), 18 → 21 nodes. New `Phase 2 Internal Input` and `Normalize Phase 2 Input`; the chat trigger still reaches the pipeline through its existing parse node, now via the shared normalizer. New `Build Phase 2 Stage Result` sits after both the create and the update branch and reads `Prepare Event Candidate Result`, so both branches return the same shape. The detection and persistence order is untouched, so history is still written before the latest row changes.
- `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`), 30 → 33 nodes. New `Phase 3 Internal Input` and `Normalize Phase 3 Input`, fed by the chat trigger, the test webhook, and the internal trigger. New `Build Phase 3 Stage Result` on the completed output of `Persist Latest Records One at a Time` counts `FINAL` and `EXCEPTION` rows from this execution only. The guarded candidate pipeline, one-retry rule, and latest-row writer are unchanged.
- `Terra Space - Full News Processing` (`SwXzUU9aHg4NZ9Kx`) is new: one form at `terra-space-full-news-processing` with the same six fields, then three Execute Sub-workflow calls that each wait for completion, guarded by `Phase 1 Succeeded?` and `Candidates Found?`. No UUID is ever shown to or copied by the user.

All four workflows validate at 0 errors. Phase 3 carries one advisory warning where n8n suggests the aggregate node might belong on the loop output; the completed output is deliberate, because that node must summarise the whole execution. **All four workflows are inactive and none has been activated.**

**First end-to-end run: the handoff works, and it exposed one real bug that is now fixed.** The owner loaded `google/gemma-4-12b-qat` in LM Studio and ran the master form from the n8n editor (execution `1625`) on a BBC article about Ukrainian strikes on two Russian oil refineries. Phase 1 (`1626`, 20s) returned `SUCCESS` with UUID `b7c73695-0154-4b16-9dc2-ab917182be1d` and a 4,065-character cleaned article. Phase 2 (`1627`, 22s) returned `EVENT_CANDIDATES_FOUND` with `MAIN_ISSUE_FOUND` and 6 candidates. No UUID was copied by hand at any point — each stage received the previous stage's result exactly as designed.

Phase 3 (`1628`) then failed after 147 ms: `Get Latest Event Candidates` filtered on `$('Parse Phase 1 UUID').item.json.p1_uuid`, and that parse node only runs on the chat and webhook paths, so the reference was unresolvable on the internal path the master uses. Fixed by pointing it at `$('Normalize Phase 3 Input').item.json.p1_uuid`, which runs on all three entry paths, leaving the chat and webhook paths working unchanged. Phase 3 re-validates at 0 errors. Phase 2's other nodes were checked for the same pattern and are clean. Nothing was rolled back: the Phase 1 row and the Phase 2 run/latest rows for that UUID were written correctly and are still there, so Phase 3 can be retried on its own.

**The fix is confirmed, and Phase 3 testing then exposed two pre-existing defects that silently lose candidates.** Executions `1630` and `1631` ran Phase 3 alone through its chat trigger for the same UUID. Both completed, the article loaded, all 6 Phase 2 candidates expanded, and `Build Phase 3 Stage Result` did fire on the batch loop's completed output — so the plan's batch-loop contingency is not needed for the reason it anticipated. Neither defect below was introduced by this plan; both live inside the protected Phase 3 pipeline the plan says to leave unchanged, so both are **recorded and left unfixed pending a decision**.

- **Defect A — candidates vanish when the gazetteer has no matching row.** `Resolve Primary Location Locally` is a Supabase `getAll` node, so an item whose `lookup_key` matches nothing produces no output item and that candidate disappears completely: no record, no `EXCEPTION`, no run-history row. In execution `1631`, 8 items went in and 5 came out. Two candidates had `lookup_key: null` (no grounded ISO3 location) and one produced `UKR␟kharkiv region` where the gazetteer holds `UKR␟kharkiv`. This contradicts the North Star's requirement that AI and lookup failures stay visible, and the Automated Final Event Record Pipeline rule that failed records are retained as exceptions.
- **Defect B — the persistence loop is fed twice and loses a record.** `Retry Once?` sends non-retry items to `Persist Latest Records One at a Time` immediately while retried items arrive later, so the loop gets a fresh input twice and completes twice. In execution `1631`, 3 candidates reached `Save Event Record Run` but only 2 reached `Prepare Latest Event Row`, and the one lost was the run's only `FINAL` record (candidate `2865:2986`, run `90`). `terra_space_event_records` holds 2 `EXCEPTION` rows for this article and no `FINAL` row.
- **Consequence C.** Because the loop completes twice, `Build Phase 3 Stage Result` runs twice and the caller receives the last run, which saw only the retried batch (`processed_candidate_count: 2, final_count: 0, exception_count: 2`). Its logic is right for the items it receives; it under-reports because Defect B hands it a partial set. It is deliberately left as written rather than patched in a way that would mask the real fault.

**Both defects are now fixed, with the owner's explicit approval ("Fix both now"), under an amendment to the plan's Global Constraints.** No grounding rule, prompt, model setting, gazetteer entry, taxonomy rule, safeguard, or retry rule was touched — only the plumbing that lost records. Phase 3 is now 32 nodes and validates at 0 errors and 0 warnings.

- **Fix A — `Attach Local Coordinates`** now runs once for all items and rebuilds the full candidate list from `Prepare Local Location Lookup`, joining gazetteer hits by `lookup_key` through a Map instead of reading the Supabase output positionally. An absent or unmatched location now yields `coordinate_status` `NO_GROUNDED_LOCATION` or `UNRESOLVED` with null coordinates — the status values the pipeline already defined — instead of deleting the candidate.
- **Fix B — the batch loop is gone.** `Persist Latest Records One at a Time` existed only to force the existing-row lookup to return one row per candidate, which is the same drop-unmatched-items behaviour as Defect A. It was removed; `Retry Once?` (false) now flows straight through `Prepare Latest Event Row` → `Get Existing Latest Event Row` → `Determine Latest Record Persistence` → `Latest Record Exists?` → `Save`/`Create Latest Event Record`. `Determine Latest Record Persistence` now runs once for all items and joins existing rows back onto every candidate by `candidate_key`. Without a loop, the first-pass and retry-pass items persist independently and neither can displace the other.
- **Fix C — `Build Phase 3 Stage Result`** now aggregates across every run of `Prepare Latest Event Row` and deduplicates by `candidate_key`, so its final invocation sees the complete set. It still never re-queries the latest table.

**Defects A and B are confirmed fixed by execution `1635`.** `terra_space_event_records` now holds a row for **all 6** distinct `candidate_key` values for this article, against 2 before. The four candidates that used to be deleted at the gazetteer step are all present, all `FINAL` with `CLASSIFIED` taxonomy and `ACCEPT` safeguard, each carrying an honest `UNRESOLVED` location status. One knock-on issue was fixed along the way: because `Attach Local Coordinates` now rebuilds the candidate list, n8n can no longer trace items back through it, so `Build Taxonomy Request` was changed from `$('Collect Active Event Types').item` to `.first()` — equivalent, since that node always holds exactly one item.

**Consequence C needed a second, different fix.** The first attempt walked `$('Prepare Latest Event Row').all(0, runIndex)` over increasing run indexes, but that run-index argument is not honoured as assumed: every iteration returned the same final run, so deduplication collapsed the answer back to that run's 2 candidates while 6 had actually persisted. A Code node cannot read another node's earlier runs, and first-pass and retry-pass candidates are inherently persisted in different runs. Replaced with an explicit read-back: `Normalize Phase 3 Input` now also emits `run_started_at`, and a new Supabase node `Get This Run's Record Runs` reads `terra_space_event_record_runs` filtered by `p1_news_uuid` and `processed_at >= run_started_at`, returning exactly this execution's append-only rows. `Build Phase 3 Stage Result` aggregates that, keeping the highest `attempt_number` per `candidate_key`. This respects the plan's rule against summarising from the latest table. Phase 3 is now 33 nodes, 0 errors, 0 warnings, and is **not yet re-tested since this last change**.

**Phase 3 is now fully verified (execution `1637`).** Every number agrees across the stage result, the append-only history, and the latest table. The stage result reported `final_count: 4, exception_count: 2, processed_candidate_count: 6`. `terra_space_event_record_runs` gained 8 rows — all 6 candidates at attempt 1 plus attempt 2 for the two that failed — and `terra_space_event_records` holds exactly 6 rows, one per `candidate_key`: 4 `FINAL`/`ACCEPT`/1 attempt and 2 `EXCEPTION`/`REJECT`/2 attempts, all written by this execution. That confirms the three protected behaviours: a successful candidate reports `FINAL`, a rejected one retries exactly once and is then retained as `EXCEPTION`, and one exception does not stop the others from becoming final. Location handling is honest too — 2 rows `RESOLVED` against the gazetteer, 4 `UNRESOLVED`, none deleted.

**The one-click path now works end to end (master execution `1638`, 3m03s).** One form submission of an Independent live-blog article ran Phase 1 (`1639`), Phase 2 (`1640`), and Phase 3 (`1641`) in sequence, each waiting for the previous stage, with no UUID ever shown to or typed by the user. The master returned `status: COMPLETED`, `p1_uuid 3070cf55-8326-4e4c-99df-d6db00df9cf1`, Phase 1 `SUCCESS` (8,334 cleaned characters), Phase 2 `EVENT_CANDIDATES_FOUND` with 5 candidates, and Phase 3 `COMPLETED` with 4 final and 1 exception — message: "Saved article; found 5 candidate(s); created 4 final record(s) and 1 exception(s)."

Read-only database checks agree with every number: 1 `terra_space_news_v2` row (no duplicate), 1 Phase 2 history row, 1 Phase 2 latest row holding 5 candidates, 7 `terra_space_event_record_runs` rows, and 5 `terra_space_event_records` rows split 4 `FINAL` / 1 `EXCEPTION`. Grounding holds throughout — all 5 Phase 2 candidate quotes and all 8 Phase 3 source-actor quotes are exact substrings of `p1_clean_content_text`. The history also shows the retry rule working in both directions for the first time: attempt 1 gave 3 `FINAL` and 2 `EXCEPTION`, and of the two retries one was rescued to `FINAL` while the other stayed a retained `EXCEPTION`.

**2026-08-09: production-readiness verification is done — five of six checks passed, and the sixth found a real defect that is now fixed but not yet re-run.** All four workflows stayed inactive throughout; each check needed the owner to arm a trigger from the n8n editor, with payloads sent from the host so inputs were exact.

- **Empty article text — passed.** Master `1643` → Phase 1 `1644` failed in 154 ms at `Normalize Phase 1 Input` (`Phase 1 input is missing p1_raw_content_text.`). No LM Studio call, no Supabase insert, Phase 2 never invoked, all row counts unchanged. Worth knowing: this condition cannot be produced from the browser at all, because n8n's form validation trims whitespace and rejects even a single space — so the normalizer is defence-in-depth reachable only by a non-browser caller, which is exactly the master's internal trigger.
- **Malformed UUID — passed on both stages.** Phase 3 execution `1646` failed in 85 ms at `Parse Phase 1 UUID`; Phase 2 executions `1648`/`1649` failed in 41 ms and 24 ms at `Parse Phase 1 UUID from Message`. Neither reached its Supabase query. The chat and webhook paths trip `Parse Phase 1 UUID`, which runs first; `Normalize Phase 3 Input` is the equivalent guard on the internal path.
- **Manual recovery, webhook parity, and multi-candidate reconciliation — all passed in execution `1647`** (2m03s, Phase 3 test webhook, UUID `3070cf55-8326-4e4c-99df-d6db00df9cf1`). All 5 candidates reconciled against both tables with every latest row's `attempts_used` matching its highest attempt in history — no records dropped. Phase 3 run rows 7 → 14 (history appended), latest rows stayed 5 (updated in place), `terra_space_news_v2` stayed 8 (no duplicate source), Phase 2 history stayed 1. Stage result `4 final / 1 exception / 5 processed` — identical protected behaviour to the internal trigger. Phase 2 recovery via chat (`1650`) likewise kept both history rows and updated its single latest row in place.
- **No-candidate article — failed, then fixed.** Master `1651` → Phase 1 `1652` → Phase 2 `1653` on a deliberately eventless article about cooking rice (UUID `76d8e150-9a67-4303-badb-324d20ad48a9`). The data behaviour was entirely correct — Phase 1 and Phase 2 rows written, **0 Phase 3 rows, Phase 3 never invoked** — and the model correctly returned `NO_MAIN_ISSUE` in 1.1 s. But the master reported `status: 'FAILED'`, `failed_phase: 'PHASE_2'`. An article with no main issue never reaches candidate detection, so `event_detection_status` stays `NOT_RUN`, and `Build Phase 2 Stage Result` recognised only `EVENT_CANDIDATES_FOUND` and `NO_EVENT_CANDIDATE` — so `NOT_RUN` fell through to `FAILED`. The plan's own contract table had no representation for `NO_MAIN_ISSUE`, a legitimate Phase 2 outcome predating this plan, which contradicts the Global Constraint that a no-candidate result is a successful completion. Fixed with the owner's approval in `Build Phase 2 Stage Result` alone: `NO_MAIN_ISSUE` with `NOT_RUN` now maps to `NO_EVENT_CANDIDATE`, genuine failures still map to `FAILED`, and `main_issue_status` is still returned so callers can tell the two apart. No detection, grounding, or persistence logic changed. Phase 2 re-validates at 0 errors, 0 warnings. **This branch had never been exercised in any run, here or in earlier Phase 2 testing.**

- **No-candidate re-run after the fix — passed.** Master `1654` (11.0s) → Phase 1 `1655` → Phase 2 `1656` on the same eventless article (UUID `9e86df74-0420-445b-8e00-8ca60cbc4ded`) now returns `status: 'COMPLETED_NO_CANDIDATE'`, `failed_phase: null`, Phase 2 `NO_EVENT_CANDIDATE` with `main_issue_status: NO_MAIN_ISSUE` preserved, `phase_3: null`, and the message "Saved article; no grounded event candidate was found, so no event record was created. This is a normal, successful outcome." The database confirms 1 Phase 1 row, 1 Phase 2 history row, 1 Phase 2 latest row, and 0 rows in both Phase 3 tables.

**All six production-readiness checks now pass.** The plan's work is complete apart from activation.

**Next action:** decide whether to activate `Terra Space - Full News Processing`. It is the only open item, and it is the owner's call — nothing has been activated. Activating gives the master a permanent form URL instead of needing "Execute workflow" each time, and also makes the Phase 3 production webhook reachable (its test webhook path is already verified). Separately, none of this session's Project Knowledge updates are committed to git yet.

**Worth carrying forward, not blocking:** the pipeline has now been exercised on three articles. It handles them well, but three is not a reliability sample, and the local model's run-to-run variation is visible in the results — the same article produced different final/exception splits across repeat runs, and twice a fault was found only because a previously unexercised branch was finally run. Whether that variation matters is a separate question from this plan. Then re-run the master form end to end, and finish the remaining plan steps: the negative cases (empty raw text, no-candidate article, malformed UUID), the legacy webhook path, the master form's three terminal paths, and the manual-recovery check. Activation stays a separate decision after testing.

**2026-08-07 update: Phase 3 Event Records workflow is active and has passed its first end-to-end persistence test.** `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`) accepts a Phase 1 UUID through its chat trigger (with a test webhook used only for verification), reads the latest Phase 2 candidates, calls the configured local Gemma model for factual enrichment, taxonomy classification, and an independent article-only safeguard, then writes an append-only run row and updates the latest candidate-key record. Execution `1602` completed successfully for UUID `087cdc48-04f4-4fee-8ba9-4fee61174b65`: the latest record is `FINAL` with `CLASSIFIED` taxonomy and `ACCEPT` safeguard, while `terra_space_event_record_runs` retained the new run. The latest-record writer was corrected from an unsafe repeat-create to an update by `candidate_key`, so a second run does not fail on the unique key. n8n runtime validation reports 0 errors and 0 warnings. The data foundation remains: `terra_space_event_types`, `terra_space_event_records`, `terra_space_event_record_runs`, and `terra_space_location_gazetteer`; no Phase 1 or Phase 2 row was changed.

**2026-08-07 update: Phase 3 Event Records design is approved.** The owner approved a new n8n final-processing phase: `Terra Space - Event Records` will take the latest grounded Phase 2 candidates for one Phase 1 UUID, enrich each candidate, resolve grounded locations locally to coordinates, classify it against active taxonomy leaves, and use an independent local-LLM safeguard. Each candidate has one automatic full retry. Passing records become `FINAL`; two failed/rejected attempts become retained `EXCEPTION` records and stay out of final outputs. This supersedes universal human approval for qualified pipeline records and replaces the older four-classifier design for this n8n pipeline. See [Automated Final Event Record Pipeline](decisions/Automated-Final-Event-Record-Pipeline.md).

**2026-08-07 update: The Phase 2 Notion page is now a detailed operating reference.** It documents the Chat Trigger UUID input, all 18 workflow nodes, fixed Gemma configuration, source-quote grounding, the latest-plus-history table design, status meanings, test evidence, the routing fix, and remaining reliability cases. The workflow is now named `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`). n8n currently reports it as inactive with no published active version; this was observed during documentation only and no activation was performed. The history table currently records 19 runs across six source articles: 18 runs returned a main issue and event candidates, with 69 candidate records in total. See the [Notion Phase 2 operating reference](https://app.notion.com/p/3b471e82e5d48188bccec9ad8c558aac).

**2026-08-06 update: Phase 2 no longer uses a test-named result table.** The active workflow now reads and writes `public.terra_space_event_candidates`; it is the renamed continuation of `public.terra_space_event_candidates_test`, so all existing latest-result records were preserved. The related workflow nodes now use permanent names (`Prepare Event Candidate Result`, `Get Existing Event Candidate Result`, `Create Event Candidate Result`, and `Update Event Candidate Result`). `public.terra_space_event_candidate_runs` remains the append-only run history. The active workflow has 18 nodes and validates with 0 errors and 0 warnings.

**2026-08-06: Phase 2 main-issue and event-candidate workflow has completed four interactive chat runs for one article; broader reliability testing remains next.** The isolated latest-result table `public.terra_space_event_candidates` links to Phase 1 through `p1_news_uuid` without changing `terra_space_news_v2`; the append-only `public.terra_space_event_candidate_runs` table retains every run for comparison. The active 18-node n8n workflow `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`) starts with a Chat Trigger: paste one Phase 1 UUID as the message, then `Parse Phase 1 UUID from Message` validates and forwards it to the unchanged pipeline. `Create Run History` saves the result before the workflow updates the latest-result row. Runs `1`–`4` for UUID `087cdc48-04f4-4fee-8ba9-4fee61174b65` all returned `MAIN_ISSUE_FOUND`, `EVENT_CANDIDATES_FOUND`, four candidates, no errors, and 100% exact quote grounding (four candidate quotes plus the main-issue quote per run). The same four underlying events and classifications were found each time; only small label wording changes occurred. The latest-result row exactly matches history run `4`, confirming the latest-plus-history behavior works. This is a promising single-article repeatability result, not a reliability conclusion; next run varied articles, especially no-issue/no-event and background-heavy sources. See [Phase 2 Main-Issue and Event-Candidate Testing Design](plans/2026-08-06-phase-2-main-issue-event-candidate-testing-design.md) and [its implementation plan](plans/2026-08-06-phase-2-main-issue-event-candidate-testing-implementation.md).

**2026-08-06 update: The first run for a new UUID exposed a Create/Update routing bug, now fixed and published.** When the latest-result lookup found no row, the condition treated an empty value as “exists” and attempted an update with an undefined ID. The history insert completed first, so run `5` for UUID `4f3f8ed0-85fb-42b3-ad01-75af2917d7e7` was retained with four grounded candidates; only the latest-result row failed. The condition now uses “is not empty,” so the next run for that UUID will create the latest row, and later runs will update it. Workflow validation remains at 0 errors and 0 warnings.

**2026-08-06 update: The second article confirms the fix and adds another strong repeatability sample.** UUID `4f3f8ed0-85fb-42b3-ad01-75af2917d7e7` now has history runs `5`–`10`: every run returned `MAIN_ISSUE_FOUND`, `EVENT_CANDIDATES_FOUND`, four candidates, no stored model error, and exact grounding for the main issue plus all four candidates. The latest-result row was successfully created after the fix and exactly matches run `10`. All four events appeared in every run; only wording varied in two working titles (singular/plural “strike(s)” and “EU receives funds” versus “EU receipt”). This validates both history retention and latest-row creation/update across a second article, but still does not test no-main-issue or no-event outcomes.

**2026-08-06 update: A third article adds a stable three-run sample.** UUID `2851bb01-f5d5-49ed-9d47-18d76b9d11be` has history runs `11`–`13`; all returned `MAIN_ISSUE_FOUND`, `EVENT_CANDIDATES_FOUND`, three candidates, no error, and exact grounding for the main issue plus all nine candidate quotes. The same three events and classifications appeared in all runs: Netanyahu rejecting the Board of Peace proposal, envoys visiting Jerusalem, and Ghazi Hamad's interview. The main-issue label varied only slightly (“Gaza military presence” versus “Israeli military presence”). Its latest-result row exactly matches run `13`. The next valuable coverage test remains an article that should produce `NO_MAIN_ISSUE` or `NO_EVENT_CANDIDATE`.

**2026-08-01: n8n candidate canonical event detection prototype built, awaiting the owner's own
live chat test.** The owner shared a new conceptual framework ("potential canonical events" with
two top-level types, RELATIONAL_INTERACTION and ENTITY_CENTRED_CHANGE) and asked for a first-stage
detector built and tested in n8n, reusing the existing `Terra_Space_Event_detection` workflow
(n8n id `st4YuDeljYyIuIWU`) rather than changing the production backend yet. See
[n8n Candidate Canonical Event Detection Prototype](plans/2026-08-01-n8n-candidate-canonical-event-prototype.md)
for the full design (schema, four-branch architecture, decisions made during brainstorming).

- Built: a new n8n Data Table `candidate_canonical_events` (id `fRsfDUP1hgLvcIIu`, 12 columns), and
  the workflow now has 16 nodes — the original Chat Trigger plus two parallel model branches
  (`gemma-4-e4b`, `qwen3.5-9b`) each split into two parallel extraction techniques (Information
  Extractor, AI Agent + Structured Output Parser), merging into one Code node that computes
  evidence-quote character offsets deterministically (never asked of the LLM) before inserting one
  row per candidate into the Data Table.
- Verified: `n8n_validate_workflow` reports 0 errors, 0 warnings, all 20 connections and 12
  expressions valid.
- **The owner's own live test (execution `1358`, ran ~04:32-04:35) found a real bug, now fixed.**
  Pasting the earthquake worked example into n8n's chat tester ran for real (~3 minutes) but the
  whole workflow crashed: `qwen3.5-9b`'s Information Extractor branch returned output that didn't
  match the required JSON schema ("Model output doesn't fit required format"), and since none of
  the four extraction nodes had error handling configured, n8n's default behavior killed the
  entire execution on that one branch's failure — so even a successful `gemma` branch would never
  have reached the Data Table. This is the same qwen3.5-9b structured-output unreliability already
  documented for the production backend (see the
  [Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)),
  now reproduced independently in this new n8n prototype.
  **Fix applied (same session):** all four extraction nodes (both Information Extractor nodes,
  both AI Agent nodes) now have `onError: continueErrorOutput`, each wired to a small new "Failure
  Row" Code node that writes one labeled row (`classification: EXTRACTION_FAILED`, the actual error
  message in `summary`) into the same Data Table instead of aborting the run — so one branch
  failing is now visible data, not a silent full-workflow crash, matching this project's existing
  "blank/labeled over silent guess" principle. Workflow is now 20 nodes; re-validated with
  `n8n_validate_workflow`: 0 errors, 0 warnings, 28 valid connections.
- **The re-run (execution `1359`, real article about a Russian missile crash in Poland) succeeded
  end to end on all four branches** — 4, 4, 4, and 7 candidates respectively from the two
  Information Extractor branches and two AI Agent branches, all written to the Data Table. First
  clean comparable dataset from this prototype.
- **Owner then asked for per-branch duration and token counts.** Duration was added: a "Start
  Timer" node now stamps the run's start right after the Chat Trigger, and each branch's
  Prepare/Failure step computes `duration_ms` against it. Since Data Table columns are immutable
  after creation, this required a new table (`candidate_canonical_events`, id `GRq8A6HfwGyMTiqW`)
  with the original archived (`candidate_canonical_events_archived_2026-08-01`,
  id `fRsfDUP1hgLvcIIu`); the 19 rows from execution `1359` were copied forward into the new table.
  Token counts were investigated and **not implemented**: inspecting execution `1359`'s raw node
  data showed the `OpenAI Chat Model` sub-nodes record zero output items, so LM Studio's per-call
  token usage isn't reachable from a Code node with the current node architecture (Information
  Extractor / AI Agent consuming a Chat Model sub-node) — getting it would need replacing those
  with raw HTTP Request nodes, a real rearchitecture rather than a field add. Workflow re-validated
  clean at 21 nodes, 0 errors, 0 warnings, 29 valid connections.
- **Confirmed via a real test (execution `1361`): `duration_ms` works correctly** (gemma/IE ~38s,
  gemma/Agent ~54s, qwen/IE ~207s, qwen/Agent ~234s). That same run also surfaced a new, sharper
  reliability signal: qwen3.5-9b's Information Extractor branch returned schema-valid but
  **fabricated placeholder content** ("Example Interaction" / "Person A" / "Person B") instead of
  real extraction — a failure mode schema validation cannot catch, distinct from the earlier
  outright crash.
- **Owner then asked about total tokens, with an eye toward future paid-API cost estimation.**
  Real per-call token usage was investigated and confirmed unreachable with the current node
  architecture (Information Extractor / AI Agent consuming a Chat Model sub-node record zero
  output items for that sub-node) — getting real numbers needs an HTTP-Request-based rearchitecture
  of all four branches, deferred until a paid API is actually in use. Instead added three rough,
  character-count-based estimated token columns (ballpark only, not for real cost decisions) — see
  the plan doc for the exact formula.
- **This produced a third Data Table schema generation in one session**, since Data Table columns
  are immutable after creation. The owner confirmed they intentionally cleared the table's contents
  partway through this work (asked directly, not assumed), so no data was carried forward into this
  generation. Current live table: `candidate_canonical_events`, id `t0refxGmpVhvGllX`, empty.
  Workflow re-validated clean at 21 nodes, 0 errors, 0 warnings, 29 valid connections, 16
  expressions checked.
- **Owner then asked why so few candidates were being found, and supplied the real article text
  from both prior test runs.** A manual read found ~10-11 genuinely distinct events in that one
  article, most of the gap traced to two causes: real model non-determinism (already the theme of
  this prototype — e.g. gemma/AI-Agent went 4→2 candidates on the identical input between runs),
  plus a real, fixable prompt gap — three of the four branches consistently defaulted to only the
  article's main/lead story and skipped background/historical events mentioned in passing (only
  qwen's AI Agent branch reliably reached past the lead paragraph). Added two rules to the shared
  prompt: explicitly count background/historical mentions as their own candidates, and prefer
  splitting over merging when unsure. See the plan doc's "Prompt revision after low-recall
  diagnosis" section for the full before/after breakdown. Workflow re-validated clean at 21 nodes,
  0 errors, 0 warnings, 29 valid connections.
- **Re-test confirmed the prompt fix worked, with exact numbers.** gemma/Information Extractor went
  4→7 candidates and 0/4→3/4 background events; gemma/AI Agent went 2→9 candidates and 1/4→4/4
  background events, 100% quote-grounded; qwen/AI Agent reached 11 candidates, all 4 background
  events, but only 45% grounded (mostly from stripping markdown link syntax out of quotes, not
  fabrication); qwen/Information Extractor failed outright again — its third distinct failure mode
  in three runs (fabrication → placeholder garbage → schema failure), a consistent dead end
  independent of prompt wording. Given this, **gemma/AI Agent** was identified as the best-performing
  pipeline (full recall, best grounding, ~5x faster than qwen/AI Agent) — full detail and tables in
  the plan doc's evaluation section.
- **Owner then asked to lock the candidate schema.** A proposed split was presented — a "core"
  candidate schema (working_title, summary, classification, phenomenon, entities, evidence_quote,
  evidence_start, evidence_end, quote_grounded) versus "harness" fields specific to this A/B test
  (run_id, model_used, extraction_method, duration_ms, the three estimated-token fields) — but the
  owner has **not yet confirmed this split**, so no formal Decision document has been written for it
  yet. Revisit once confirmed.
- **Owner then asked to swap models: qwen replaced with `prism-ml/bonsai-27b`, and all prior test
  data wiped for a clean baseline.** Both qwen branches removed; two equivalent Bonsai-27b branches
  added (same credential, prompt, schema, structure). Old Data Table and its interim archive both
  deleted; a fresh empty table (`candidate_canonical_events`, id `nyzRGW4IjjddBbro`) is now live.
  Comparison is now **gemma-4-e4b vs bonsai-27b**, each split across Information Extractor and AI
  Agent (4 branches total, same as before). Workflow re-validated clean: 21 nodes, 0 errors, 0
  warnings, 29 valid connections.
- **Bonsai-27b tested against a second real article (Ukraine-Iran Caspian Sea strike, BBC) and came
  out worse than gemma-4-e4b on every axis** — 10-16x slower on both techniques, and its AI Agent
  branch found fewer real candidates (4) than gemma's (7) despite taking 6x longer. Its Information
  Extractor branch also fabricated content entirely unrelated to the article, the same failure
  pattern qwen's Information Extractor branch showed earlier with different filler text — a second,
  independent case of that same node type producing convincing-looking garbage with a given model,
  worth keeping in mind if more models get tested against it.
- **Owner then asked to isolate quantization as a variable**: bonsai-27b removed, replaced with a
  second gemma-4-e4b branch pair running the Q8_0 quantization (LM Studio id `google/gemma-4-e4b:2`,
  vs. the existing plain `google/gemma-4-e4b`) — same prompt/schema/credential, only the
  quantization differs between the two model branches now. Data Table reset to empty
  (`candidate_canonical_events`, current id `FBPcn6wCtARZYmdA`). Workflow re-validated clean: 21
  nodes, 0 errors, 0 warnings, 29 valid connections. **Not yet tested live.**
- **Plain gemma-4-e4b vs Q8_0 tested (execution `1365`, same Caspian Sea article) and scored.**
  gemma-4-e4b/Information Extractor won on aggregate: fastest by far (19.2s vs 50.2-157.5s for the
  other three branches) with 100% quote-grounding, though lower recall (~50%) than
  gemma-q8/Information Extractor (~71%, but 5.8x slower). Full scoring table in the plan doc.
- **Owner decided: use gemma-4-e4b + Information Extractor going forward, "for now."** Asked for a
  duplicated, simplified workflow carrying just that one path (not a snapshot of the full 4-branch
  rig). Built as a new, separate workflow: **`Terra_Space_Event_detection_v1`**
  (id `D70nY3cYojJhVtgp`) — single path, Chat Trigger → gemma-4-e4b → Information Extractor →
  evidence-offset computation → insert into a new dedicated table,
  `candidate_canonical_events_v1` (id `t8GGITb6YRIXw7MO`). Schema trimmed to 11 columns (dropped
  `model_used`/`extraction_method`/the three token-estimate fields, since those were
  comparison-only artifacts; kept `run_id` and `duration_ms` for ongoing monitoring). Validated
  clean: 8 nodes, 0 errors, 0 warnings, 8 valid connections. The original 4-branch
  `Terra_Space_Event_detection` testing rig is untouched and still available for future model
  comparisons.
- **This is provisional, not a locked decision** — the owner's own words were "for now." No formal
  architecture Decision document has been written, and v1 is not wired into the production
  backend's Signal Parser stage.
- **Document intake added to v1, replacing the manual chat-paste entry point.** The owner's real
  test documents are Obsidian Web Clipper `.md` exports (YAML frontmatter: title, source, author
  list, published, created, description, tags list, then the article body). Owner asked for a
  process that saves those fields plus a new `content_full_text` field, placed before `Start
  Timer`, using manual per-file selection (no folder-watching) and fully replacing the chat
  trigger. Built as three new nodes: a Form Trigger with a `.md` file-upload field (chosen over
  reading from disk since n8n runs in Docker — a form upload has no host-filesystem dependency), a
  Code node that parses the frontmatter/body with a small hand-written parser, and a Data Table
  insert into a new table, renamed at the owner's request to **"News Article Clipping"**
  (id `LO0ms6r66gSKtjXv`, 8 columns matching the request exactly). `Start Timer` was changed to pull fields explicitly from the parser node by name rather
  than assuming what the Data Table insert node passes through. Workflow re-validated clean: 10
  nodes, 0 errors, 0 warnings, 10 valid connections. **Not yet tested with a real upload.**
- **Owner then asked to re-evaluate the whole workflow so extraction only ever runs against
  unprocessed documents** — News Article Clipping rows without an existing successful (non-
  `EXTRACTION_FAILED`) result in `candidate_canonical_events_v1`, and made re-runnable on its own,
  independent of uploading. Went through Plan Mode for this (approved plan at
  `C:\Users\halma\.claude\plans\re-evaluate-the-whole-workflow-virtual-zebra.md`). Confirmed with
  the owner: failed-only documents get retried (not treated as permanently done), since local-model
  failures have proven to be noise, not stable signal, all session.
- **Split into two independent entry points in the same workflow.** Document Upload now stops at
  Save Document (no longer cascades into extraction). A new **Process Pending Documents** manual
  trigger reads all documents, reads all existing candidates, filters to unprocessed ones (Code
  node, set-difference by a new `document_id` link column), and loops through them one at a time
  (`Split In Batches`, size 1) through the same extraction sub-chain as before, now tagging every
  candidate row with which document produced it.
  `candidate_canonical_events_v1` recreated with the new `document_id` column (it was still empty,
  so this was a plain recreate — new id `mK4cwIZl1FowKunO`). Workflow re-validated clean under both
  `runtime` and `strict` profiles: 15 nodes (2 triggers), 0 errors. Full detail in the plan doc's
  "Process only unprocessed documents" section.
- **Owner changed their mind on intake: replaced file upload with a direct-entry Form.**
  `Document Upload`/`Parse Document` (file upload + frontmatter parser) were replaced with a single
  **Document Entry Form** whose 8 fields map 1:1 to `News Article Clipping`'s columns, filled in by
  hand rather than parsed from an uploaded `.md`. `author`/`tags` now store as plain comma-separated
  text instead of JSON arrays.
- **Owner then asked for a cleanup step before saving**, sharing a real messy example (markdown
  images, inline links, escaped brackets, ad/newsletter boilerplate). Added a **Clean Article Text**
  node between the form and Save Document that strips markdown image/link syntax, un-escapes
  brackets, drops known boilerplate lines, strips wiki-link brackets from author names, normalizes
  comma-separated lists, and (owner confirmed) strips tracking query params from the source URL.
  This should also reduce a real failure mode seen in earlier evaluations: `quote_grounded: false`
  results caused by models quoting clean prose that didn't match markdown-cluttered stored text.
  Workflow re-validated clean: 15 nodes, 2 triggers, 0 errors, 0 warnings, 14 connections. Full
  detail in the plan doc's "Intake switched to a direct-entry Form; cleanup step added" section.
- **Owner confirmed the cleanup worked** (real test row's stored text was clean, tracking params
  gone from the source URL) and then asked for a stable `document_uuid` so documents can be traced
  from other future workflows, not just this one — replacing the fragile auto-increment `id` that
  had been used as the candidate-to-document link (a plain sequential number that resets every time
  a table is recreated, which has already happened repeatedly this session). Both tables recreated
  again with `document_uuid` (string) replacing `document_id` (number) everywhere; this time the
  owner's one real test row was preserved and back-filled with a generated UUID rather than lost.
  New table ids: `News Article Clipping` → `i8L6e1fDfGXx4Z4t`, `candidate_canonical_events_v1` →
  `SROocbrHK5rnImYd`. UUID is generated once in `Clean Article Text` using a hand-written generator
  (not `crypto.randomUUID()`, whose availability depends on n8n's exact Node.js runtime — not worth
  assuming for a plain trace ID). Workflow re-validated clean: 15 nodes, 2 triggers, 0 errors, 0
  warnings. Full detail in the plan doc's "Stable document_uuid" section.
- **Next action:** the owner should run **Process Pending Documents** and confirm the one real
  document gets processed and its candidates are tagged with the correct `document_uuid`, then run
  it again with nothing new entered to confirm zero new rows land (the core correctness check from
  the earlier dedup change) — full verification steps in the plan doc. The candidate-schema lock
  question (proposed core-vs-harness field split) is still open and unconfirmed. This plan's
  remaining tasks (9-10) stay open, and a decision on whether/how this replaces the backend's Signal
  Parser stage still needs more confidence before it can be made.

**2026-07-21: route backgrounds re-polished and an Appearance setting added (Deferred UI Polish
Plan, Scope 1) — shipped, pushed to `main`, but explicitly NOT approved as final by the owner.**
After closing out Task 8, the owner picked up the
[Deferred UI Polish Plan](plans/2026-07-17-ui-polish-deferred.md). Shown a before/after review
artifact of all six route backgrounds, they chose a full re-polish. All six were regenerated from
one shared procedurally-drawn HUD/orrery vocabulary (a throwaway local canvas generator served over
`127.0.0.1` and extracted to WebP — no external image requests), fixing the two inconsistencies the
review surfaced (Sense's off-family nebula; Settings being the busiest asset), giving each route a
distinct purpose-fit motif, keeping the centre clear, and shrinking the set 308 KB → ~205 KB. The
owner then requested two tweaks, tuned live with them via an interactive preview artifact: (1) the
Dashboard's round/spiral corner clusters were removed for angular HUD framing; (2) two
non-destructive layers were added — a CSS background blur and a reduced-motion-aware "animus"-style
ambient canvas (`frontend/src/components/workspace-ambiance.tsx`: drifting amber motes + a slow
reconstruction scan). The owner then asked whether blur/motion could be a Settings feature, so a new
per-device (localStorage, not the backend database) **Appearance panel** was added to Settings
exposing all four tuning axes with the owner's values as defaults
(`frontend/src/lib/appearance-settings.ts`, `frontend/src/app/settings/appearance-settings.tsx`).
Verified throughout: 217 frontend tests (11 new; test-writing itself caught two real bugs — a reset
function that wrote defaults back into storage instead of clearing it, and a floating-point display
glitch — both fixed), clean lint, clean production build, and live browser verification (all routes,
150% zoom, and a confirmed pixel-level check that the motion toggle actually freezes/resumes the
canvas animation). Committed as two commits (`8ede3a7`, `4849653`) and pushed to `main` on GitHub at
the owner's request.

**However: do not treat the background or the animus motion as finished.** Immediately after seeing
the pushed result, the owner said explicitly: "Intinya jangan menganggap ini selesai dlu. saya akan
revisit lagi setelah credit reset" (don't consider this done; will revisit after their Claude credit
resets). They like the Appearance-setting addition, but flagged the background as still too
busy/distracting and the animus motion as "not the right kind of motion" and "distracting rather
than ambient" — plus unspecified "something else" for both, deferred until they can describe it in
detail. See the
[Feedback Backlog entry](Feedback-Backlog.md#route-backgrounds-and-ambient-animus-motion-are-not-approved-yet-despite-shipping-2026-07-21)
for the full detail and the resume instruction: ask the owner for concrete specifics first, don't
re-guess a new direction. The plan file stays `status: in-progress`, not `completed`.

**Next action:** none pending right now — the owner chose to park this and revisit after their
credit resets. When resumed, start by asking what specifically is still wrong with the background
and the motion, rather than proposing another direction unprompted.

**2026-07-20 (later same day): executing the Staged Event Detection Pipeline implementation
plan, Task 1 of 8 complete.** The owner asked to redesign event detection, sharing their own
staged "SMC" (Signal, Mechanism, Context) framework as inspiration. The approved
[Staged Event Detection Pipeline](decisions/Staged-Event-Detection-Pipeline.md) decision replaces
the single LM Studio extraction call with a Signal Parser plus four narrow per-candidate
classifiers, keeps the existing deterministic resolution stage, and adds ISO alpha-3 country codes,
owner-managed actor aliases (with a first actor-management workspace), a per-stage extraction log,
and per-attribute failure tolerance. Mechanism/Context classification is explicitly deferred. The
[implementation plan](plans/2026-07-20-staged-event-detection-pipeline.md) is 8 checkpointed,
test-first tasks; a fresh session began executing it task-by-task per the owner's instruction, only
against isolated test databases (no live database or container touched — that is reserved for
Task 8, gated on the owner's approval).

**Task 1 (ISO alpha-3 country codes) is done and committed**, test-first:
- Added a checked-in `backend/app/data/iso3166_alpha2_to_alpha3.py` table (246 codes, covering
  every country/admin1/city prefix actually present in the gazetteer, including three codes with
  no entry in the old `countries` dict — `BQ`, `PW`, `TK` — found only by scanning admin1/city key
  prefixes, not the countries list alone).
- Regenerated `backend/app/data/location-gazetteer.json` in place with alpha-3 keys via a new
  one-off script, `backend/scripts/convert_gazetteer_to_alpha3.py` (no gazetteer generator exists
  in this repo to rerun from source GeoNames files, confirmed by search before writing the plan).
- `_country_key` in `locations.py` now requires exactly 3 alpha characters (was 2); `Location.country`
  is now `String(3)` (was `String(2)`); the extraction schema's field description and the
  system prompt's worked example were updated to alpha-3 (the prompt itself is fully rewritten in
  Task 3, so this was a minimal find-and-replace only, confirmed no test depends on the prompt's
  literal text).
- New migration `0010_iso_alpha3_country_codes` converts stored `Location.country` alpha-2 values
  to alpha-3 (case/whitespace-insensitive match against the table; unmapped values pass through
  unchanged), alters the column length inside the same SQLite batch-rebuild, and — after the
  format change — re-runs the existing idempotent `backfill_missing_coordinates` so rows that were
  previously unresolved only because their code was still alpha-2 get backfilled in the same
  migration; downgrade reverses the country-code mapping and column length but intentionally does
  not touch coordinates (mirrors 0004's own precedent: coordinates are deterministically
  re-derivable, not worth reversing). Snapshots and restores `event_locations` around the batch
  rebuild, reusing the exact SQLite cascade-on-drop workaround pattern already established in
  `0008_single_source_event_date`.
- Fixed a real regression the full migration chain exposed: `test_migration_0004.py`'s backfill
  test upgrades a fresh database from empty straight through to `head`, and 0004's backfill step
  calls the live (already-patched) `apply_coordinates`, so an alpha-2 row seeded before 0004 no
  longer resolved once `_country_key` started rejecting 2-character codes — this is exactly what
  the new post-conversion backfill inside 0010 now fixes, rather than leaving 0004's own test
  broken.
- Added the required amendment note to
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md).
- Verified: 191 backend tests (187 baseline + 4 new: `_country_key` alpha-3/alpha-2 behavior, an
  alpha-2-no-longer-resolves regression test, and two new migration tests covering upgrade and
  downgrade including a linked `event_locations` row and `PRAGMA foreign_key_check`), 187 frontend
  tests (unchanged — Task 1 is backend-only), clean frontend lint, a successful production build,
  and Project Knowledge validation (0 errors, 0 warnings). Committed as a single `feat:` commit,
  isolated test databases only — the owner's live database and containers were not touched.

**Task 2 (extraction log storage and read API) is also done and committed**, test-first:
- New `ExtractionLogEntry` model/table (`id`, `document_id` FK cascade-delete, `candidate_index`
  nullable, `stage`, `outcome`, `detail`, `created_at`) via migration
  `0011_extraction_log_entries`; no batch-rebuild risk since this only creates a new table rather
  than altering one that already has dependents.
- Service helper `log_extraction(db, ...)` (adds, does not commit — caller controls the
  transaction, matching the existing `persist_extraction` pattern) and `list_extraction_log`
  (newest-first, `created_at` then `id` as a tiebreaker) in `backend/app/services/extraction_log.py`.
- `GET /api/documents/{id}/extraction-log` added to the existing documents router (`404` for a
  missing document, `200` with an empty list before any entries exist).
- Verified: 201 backend tests (201 = 191 + 10 new: 4 service-level, 3 API-level, 3 migration-level,
  including a cascade-delete-on-document-removal check with `PRAGMA foreign_key_check`), 187
  frontend tests (unchanged — Task 2 is backend-only), clean lint, a successful production build,
  and Project Knowledge validation. Isolated test databases only.

**Task 3 (Signal Parser stage) is also done and committed**, test-first:
- New `SignalCandidate`/`SignalParseResult` schemas in
  `backend/app/schemas/staged_extraction.py` (reuses the existing `EpistemicStatus` type rather
  than duplicating it).
- New `LmStudioClient.parse_signals(...)` with its own single-task system prompt ("split this
  document into distinct signal candidates"), reusing the existing labelled title/Publication
  Date/content user-message format. While adding this, refactored the client's shared
  HTTP-call/error-handling block (previously duplicated inline in `extract_events`) into one
  `_call_structured` helper, since Task 4 is about to add four more near-identical calls; the
  existing `extract_events` tests pass unchanged, confirming this was a pure refactor.
- New `parse_and_validate_signals(db, document, lm_studio_client)` orchestrator in
  `backend/app/services/signal_parser.py`: calls `parse_signals`, then drops any candidate whose
  `evidence_quote` is not verbatim in the document (reusing the existing `quote_found` grounding
  helper) and logs each drop (`stage=signal_parser`, `outcome=dropped`); a transport or
  schema-validation failure still raises out of `parse_signals` unchanged (document fails and
  stays retryable, matching today's behavior) rather than being caught here. Nothing calls this
  orchestrator from the real processing pipeline yet — that wiring is Task 5.
- Verified: 209 backend tests (201 + 8 new: 5 client-level covering a clean parse, the sent
  prompt/schema, a schema-mismatch failure, a timeout, and malformed JSON; 3 orchestrator-level
  covering all-grounded-kept, one-ungrounded-dropped-and-logged, and all-ungrounded), 187 frontend
  tests (unchanged — Task 3 is backend-only), clean lint, a successful production build, and
  Project Knowledge validation. Isolated test databases only.

**Task 4 (four per-candidate classifiers) is also done and committed**, test-first:
- Four new schemas in `staged_extraction.py`: `ClassifiedEventType`, `ClassifiedDate` (reuses
  the existing `validate_event_date` validator), `ClassifiedLocations` (alpha-3, same grounding
  language as the old single-call prompt), and `ClassifiedActors` (`source_actors`/
  `recipient_actors`).
- Four new narrow `LmStudioClient` methods (`classify_event_type`, `classify_date`,
  `classify_locations`, `classify_actors`), each its own single-task system prompt and its own
  structured-output schema; each receives the full document context plus the candidate's
  working title/summary/evidence quote, and the event-type/actors classifiers additionally
  receive known active types/known actor names, matching the decision's contract. Added a
  `_parse_structured_content` helper so all six call methods (the two from Tasks 3 and the
  pre-existing single-call path, plus these four) share one schema-parsing error path instead of
  repeating it.
- New `backend/app/services/classifiers.py` with one orchestrating wrapper per classifier
  (`run_event_type_classifier`, etc.): on success, logs `outcome=ok` with a short summary and
  returns the value; on any `ExtractionError`, logs `outcome=failed` with the error detail and
  returns `None` instead of raising — so a caller (Task 5) can save the event with just that one
  attribute blank rather than losing the whole candidate. A shared `_run_classifier` helper
  keeps the four wrappers to a few lines each.
- Verified: 229 backend tests (209 + 20 new: 12 client-level — success-with-context-and-schema
  check, transport-failure, and schema-garbage per classifier — and 8 orchestrator-level —
  success-logs-ok and failure-logs-and-returns-None per classifier), 187 frontend tests
  (unchanged — Task 4 is backend-only), clean lint, a successful production build, and Project
  Knowledge validation. Isolated test databases only.

**Task 5 (orchestration and persistence rewrite) is also done and committed** — the largest task
in the plan, since it retires the old single-call path entirely rather than adding the new one
alongside it:
- New `Event.extraction_incomplete` boolean (migration `0012_event_extraction_incomplete`, set
  when any of the four classifiers failed for that candidate), exposed read-only on `EventRead`.
  The migration snapshots/restores `event_actors`, `event_sources`, `event_locations`, and
  `duplicate_flags` around the `events` table rebuild, reusing the same SQLite
  cascade-on-drop workaround as `0008`/`0010`.
- Rewrote `app/services/extraction.py`: `persist_extraction(db, document, ExtractionResult)` is
  replaced by `run_staged_pipeline(db, document, lm_studio_client, known_types, known_actors)`,
  which calls `parse_and_validate_signals` (Task 3) then, per surviving candidate, all four
  classifiers (Task 4), assembles one draft `Event`, and reuses the existing grounding logic
  unchanged (`_location_grounded`, coordinate resolution, actor lookup/creation, duplicate
  detection) — plus one addition carried over from the old `_validate_event`: a candidate with a
  blank title or summary is dropped and logged (`stage=signal_parser`) rather than becoming a
  blank draft, since nothing else in the new pipeline still checked that. Every dropped location
  now writes a real extraction-log entry instead of the old silent `dropped_locations` list.
  `processing.py`'s `_process_document` now calls this one function instead of
  `extract_events`+`persist_extraction`; a Signal Parser failure still raises and fails the
  document exactly like before, while classifier failures degrade to an incomplete event and
  never fail the batch.
- Removed the retired single-call path entirely rather than leaving it as dead code:
  `LmStudioClient.extract_events`/`_build_request`/`EXTRACTION_SYSTEM_PROMPT`, and
  `ExtractedEventType`/`ExtractedLocation`/`ExtractedActor`/`ExtractedEvent`/`ExtractionResult`
  from `app/schemas/extraction.py` (trimmed to just the two still-shared type aliases,
  `EpistemicStatus`/`DatePrecision`).
- This rewrite's biggest ripple was test fixtures: six existing test files
  (`test_processing.py`, `test_events_api.py`, `test_event_edit_approve_reject.py`,
  `test_event_types_actors_api.py`, `test_duplicate_resolution.py`, `test_date_validation.py`)
  used a hand-rolled `FakeLmStudioClient` stubbing `extract_events` purely as a fixture mechanism
  to get specific events into the database for testing unrelated features (approval, duplicate
  resolution, event-type management). Built one shared, reusable double,
  `tests/staged_lm_studio_fake.py` (not itself a test module), that implements the full staged
  call surface (`parse_signals` plus all four classifiers) from a simple flat `FakeEventSpec` list
  per document — including a `fail_stages` option so a test can force one specific classifier to
  fail for a candidate — and updated all six files to use it, translating each fixture 1:1.
  Deleted `test_lm_studio_extraction.py` and `test_extraction_validation.py` outright (their
  target no longer exists) and replaced their coverage with `tests/test_staged_pipeline_persistence.py`
  (13 tests directly against `run_staged_pipeline`, translating every case: dropped ungrounded
  candidates, blank title/summary, multi-candidate documents, one-classifier-failure producing an
  incomplete-but-otherwise-complete event, all-classifiers-failing still saving a titled/quoted
  draft, location grounding in all its variants, actor reuse/creation, and taxonomy-leaf linking).
- Verified: 222 backend tests total (net change from 229: +2 migration, +13 new persistence
  tests, −8 deleted `extract_events` tests, −15 deleted old `persist_extraction` tests, plus the
  six rewired files unchanged in count), 187 frontend tests (unaffected — no frontend file
  changed; the new `extraction_incomplete` field is additive and ignored by existing TS fetch
  typing), clean lint, a successful production build, and Project Knowledge validation. Isolated
  test databases only throughout.

**Task 6 (per-call timeout semantics) is also done and committed** — smaller than expected,
since it turned out already half-done as a side effect of Task 3/4's design: every staged call
(`parse_signals` and all four classifiers) already independently resolves the stored timeout
through `LmStudioClient._call_structured` and opens its own `httpx2.Client` with it, so the
stored setting was already applying per call rather than being a single budget shared across a
whole document's `1 + 4×candidates` calls. Added a regression test
(`test_extraction_timeout_is_resolved_fresh_for_every_staged_pipeline_call`) proving this by
changing what the config provider returns between five consecutive calls and asserting each one
picked up its own current value (`[120, 300, 600, 120, 300]`), then updated the Settings UI copy
that was still describing the old per-document semantics: the label changed from "Processing
timeout" to "Timeout per AI call", and the hint now explains that processing a document makes
several calls (splitting into signals, then classifying each one) so the limit applies to each
call rather than the whole document. No backend behavior changed, only its test coverage and the
frontend label/hint. Verified: 223 backend tests (+1), 187 frontend tests (label/hint assertions
updated in `lm-studio-settings.test.tsx`), clean lint, a successful production build, and Project
Knowledge validation. Isolated test databases only.

**Task 7 (actor aliases and actor management) is also done and committed** — the last task before
stopping for the owner's approval on Task 8's live rollout:
- New `actor_aliases` table (migration `0013_actor_aliases`, cascade-delete with its actor; no
  batch-rebuild risk since it's a new table). Uniqueness (an alias can't equal another actor's
  canonical name or another existing alias, case-insensitively) is enforced in the service layer,
  matching how Event Type name conflicts are already checked — not a DB-level constraint.
- Lookup change: `find_actor_by_name_or_alias` (new, in `matching.py`) checks canonical names
  across all actors first, then aliases across all actors; `run_staged_pipeline`'s actor
  resolution now calls this instead of the old exact-canonical-name-only `find_by_exact_name`
  (kept for Event Type matching, which stays exact-name-only by design). The AI still only ever
  receives canonical actor names — aliases are the owner's own data, never AI-managed.
- New `app/services/actors.py` (rename/activate/deactivate, delete-only-when-unreferenced, mirrors
  Event Type's rules exactly; add/remove alias) and a new dedicated `app/api/routes/actors.py`
  router (`GET/PATCH/DELETE /api/actor-management/{id}`, `POST/DELETE .../aliases[/{id}]`) — kept
  fully separate from the pre-existing simple `GET /api/actors` picker endpoint used across
  Dashboard/Event Review/Events, which still returns the same compact shape unchanged.
- New Terra Sense "Actors" workspace (`/sense/actors`, nav entry added after "Event Taxonomy"): a
  flat searchable list plus an inspector panel, deliberately reusing the Event Taxonomy
  workspace's existing tree/inspector CSS classes and interaction conventions (edit fields hidden
  until Edit, confirmation required before deactivate/delete/remove-alias, Delete hidden while
  in-use) rather than inventing a second visual language.
- Verified: 251 backend tests (+24: matching-precedence, service CRUD/conflict/cascade, API,
  migration, and one staged-pipeline test proving an alias resolves to the existing actor instead
  of creating a duplicate), 198 frontend tests (+17, including an updated 8-item navigation
  count), clean lint, a successful production build, and Project Knowledge validation. Also
  confirmed live in a fully isolated Docker Compose stack (`-p actorsqa`, scratch volume, port
  3011, built then torn down and its images removed afterward) seeded with two actors through the
  real manual-event API: alias add, activation, and selecting between actors all rendered and
  behaved correctly in a real browser. The owner's live database/containers were never touched.

**All 7 tasks of the Staged Event Detection Pipeline implementation plan were complete and
committed**, and this session then stopped deliberately before Task 8 (review surfacing, full
verification, and live rollout) to wait for the owner's explicit go-ahead, since it is the first
task in the plan allowed to touch the live database and containers.

**2026-07-21: live migration discovered to have already happened outside the planned Task 8
process; verified intact and backed up.** Between that stopping point and the owner's next
message, two things happened outside this session's knowledge:

1. A separate Claude Code session (same owner account) continued the plan and completed Task 8
   items 1–2 (review surfacing and verification) as commit `d6baece feat: surface
   extraction-incomplete events and add an extraction log view` — adding `Event.candidate_index`
   (migration `0014_event_candidate_index`) so an incomplete event can be traced to exactly which
   classifier stage(s) failed, an "extraction incomplete" note in Event Review, and a per-document
   "Extraction log" view in Documents. That session also extended the e2e LM Studio stub to the
   staged pipeline's five call types and updated its location fixtures to alpha-3. Like every task
   before it, that session verified its UI pieces in its own separate, disposable, isolated Docker
   Compose stack (project `task8qa`) and explicitly did **not** touch the owner's live database or
   containers — live E2E execution through a real browser was deliberately deferred, since the
   existing e2e runner resets Docker volumes under the *default* compose project name, which
   collides with the owner's real database volume.
2. The owner's normal containers (`terra_space-backend-1`, `terra_space-frontend-1`, default
   Compose project `terra_space`) were restarted normally (most likely via
   `Start-TerraSpace.ps1`, though not yet confirmed by the owner) after `main` had all of the
   above on it. Since the backend image's entrypoint always runs `alembic upgrade head` before
   starting the server, that ordinary restart silently applied every pending migration from Tasks
   1–7 plus Task 8's `0014` (revision `0009` → `0014`) to the **live** database — without the
   deliberate backup-first, rehearse-on-a-copy sequence the plan's own Task 8 instructions and
   this plan's Executor notes required. Neither Claude Code session did this directly; it was an
   inherent side effect of migrations sitting on `main` while the owner's own normal app startup
   still runs them automatically, same as every previous phase's migrations always have.

The owner (halmarpolanunu) noticed the live Actors page showing real data (a screenshot of
`/sense/actors` listing real extracted actors — "Iran", "President Trump", "U.S. Central
Command", "U.S. military" — sourced from their existing "US military reimposes naval blockade on
Iranian ports..." document) and flagged it as unexpected. This session then verified, read-only,
directly against the live database inside the running `terra_space-backend-1` container:

- `alembic_version` = `0014_event_candidate_index` (current head).
- `PRAGMA foreign_key_check` = empty (no violations).
- Row counts intact: 1 document (`ba410407-...`, `processing_status=completed`), 16 events (all
  `review_status=rejected` except this document's own history, 0 approved), 12 event types, 5
  actors, 33 taxonomy nodes, 16 locations, 0 rows in the new `actor_aliases` and
  `extraction_log_entries` tables (expected — no alias has been added yet and no document has
  been processed through the new staged pipeline yet, since LM Studio calls only happen during
  real processing).
- The alpha-3 country migration (Task 1) correctly converted this document's real Iran/Kuwait/
  Bahrain location rows to `IRN`/`KWT`/`BHR` with their coordinates preserved (e.g. Tehran
  `35.69439, 51.42151`); two long-pre-existing rows storing the literal text `"Indonesia"` instead
  of a code (never resolvable, from well before this session, unrelated to this migration) were
  correctly left untouched rather than corrupted, since `_country_key` only remaps recognized
  2-letter codes.
- Live actor data matches the owner's screenshot exactly: "U.S. military", "U.S. Central Command",
  "Iran" (inactive), "President Trump" (active), "U.S." (inactive).

No sign of data loss or corruption. With the owner's agreement, took a **fresh backup of this
now-migrated state** via `Backup-TerraSpaceDatabase.ps1`:
`data/database-backups/2026-07-21_125512/terra-space.db` — independently verified (revision
`0014_event_candidate_index`, empty `PRAGMA foreign_key_check`, 16 events, 5 actors). This is now
the closest available backup; there is no pre-migration backup of the owner's real database from
before this restart, since the migration happened before either Claude Code session or the owner
asked for one.

**Task 8, and the whole Staged Event Detection Pipeline plan, is now complete** (plan status
updated to `completed`). The plan's original item 3 (rehearse then deliberately apply the live
migration) was moot — the migration already happened and had been verified intact via a different
path than planned (an ordinary container restart). The remaining items were closed out
2026-07-21:

- **Live browser check, done.** Asked the owner what restarted their containers; they didn't
  recall. Docker Desktop was not running in this session's environment, so it was started, then the
  owner's normal containers were brought up with a plain `docker compose up -d` (no rebuild, no
  data touched) at the owner's explicit choice to have this session check read-only rather than
  check themselves. Confirmed live and intact: `alembic_version` `0014_event_candidate_index`,
  empty `PRAGMA foreign_key_check`, 20 events (up from 16 at the last check — someone reprocessed
  the owner's one document since then; no session recorded doing so, flagged to the owner rather
  than assumed), 1 document, 17 extraction log entries (up from 0), 0 actor aliases. In the real
  browser, read-only: Event Review's second draft event of that document correctly showed
  "Extraction incomplete — local AI could not classify actors, event date, locations. Review
  carefully before approving," with `Not stated` locations/actors and blank event date, matching
  its logged classifier failures; the Documents "Extraction log" view rendered real per-stage,
  per-candidate entries (`ok`/`failed`/`dropped` with reasons) for all 4 candidates; the Actors
  workspace showed the same 5 actors as the owner's earlier screenshot with a working
  edit/alias/deactivate panel.
- **New lead surfaced by that same extraction log**, recorded in the
  [Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16):
  the pattern this time was not uniform "zero locations" — one candidate succeeded at every stage,
  one partially succeeded, and two failed **every** classifier stage with "LM Studio returned HTTP
  400," a distinct signature from the schema-mismatch/empty-response failures seen 2026-07-20. An
  HTTP 400 on every stage for a specific candidate suggests a request-construction problem tied to
  that candidate's content, not only generic model non-determinism — a more specific next step than
  before, not yet investigated (would need the backend's own logs around those calls, or a direct
  reproduction against LM Studio).
- **Documentation closeout, done:** plan file marked `completed`, this section updated, an entry
  added to [Project Knowledge Log](Project-Knowledge-Log.md), and the Feedback Backlog entry above
  updated with the new data point and an added resume-checklist item.
- **Container restart cause: still unconfirmed.** The owner did not recall what restarted their
  containers on/before 2026-07-21. Worth remembering for any future session: any `main` merge with
  pending migrations will auto-apply the next time the owner's normal containers start, restart, or
  rebuild — not only during a deliberate rollout step — so a live-data surprise like this one can
  recur.

**Next action:** none pending from this plan. When asked whether to continue into the
[location-reliability investigation](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
right after this closeout, the owner said "later" — deliberately deferred, not declined. Resume
only when the owner brings it back; it needs their direct involvement either way (LM Studio's own
settings, or deciding whether to spend a session on the new HTTP 400 request-level debugging lead).

---

The owner checked the two globe fixes below live on 2026-07-20 and reported two things, both
addressed (code changed, not yet committed):

1. **"Halo ring masih ada. Hapus saja."** This took three rounds to fully resolve, because there
   turned out to be three unrelated decorative elements around the globe, not one:
   1. `.command-deck-globe::after` — the CSS ring from
      [Globe Halo Zoom Behavior](plans/2026-07-17-globe-halo-zoom-behavior.md), whose zoom-fade
      tuning was not enough; removed entirely (also the `--globe-ring-opacity` variable and the
      `updateGlobeRingOpacity` zoom listener). Fixed a pre-existing frontend test-isolation bug this
      exposed along the way (a leaked `map.setProjection` throwing mock from an unrelated earlier
      test in `frontend/tests/world-map.test.tsx`).
   2. `map.setSky(...)` — MapLibre's native globe atmosphere glow. A real, separate feature, and one
      explicitly named in the locked [Visual Design Direction](decisions/Visual-Design-Direction.md).
      Removed at the owner's explicit repeated instruction rather than left in place; that decision
      document is amended accordingly.
   3. **The actual remaining cause**, found after confirming via live JS inspection that `getSky()`
      was already `undefined` (so candidate 2 wasn't it): `.layered-command-deck::before` in
      `globals.css` — a third, previously unnoticed decorative amber ellipse, part of the Dashboard's
      3D depth-plane background styling, sitting directly over the globe. Removed.
   All three verified together: full 187-test frontend suite, clean lint, a production build, a
   rebuilt/restarted Docker frontend container each round, and a live browser check confirming the
   globe now renders with no ring or halo of any kind. See that plan's own "Superseded" note for full
   detail.
2. **"Data yang sudah saya proses, tapi tidak ada nodes yang keluar."** Checked the live database
   directly rather than assuming a rendering bug: the 3 events the owner approved from today's
   reprocess of their one existing document (`ba410407-...`, "US military reimposes naval blockade on
   Iranian ports, launches new strikes") have **zero location rows at all** — not an unresolved
   coordinate, no location data was persisted whatsoever — despite each event's own evidence quote
   plainly naming "Iranian ports," "Iranian coastal infrastructure," etc. This is not a globe
   rendering defect: the Dashboard's own "Unresolved locations" stat correctly read `3` and `Mapped
   locations` correctly read `0`, live-confirmed in the browser. The extraction pipeline code itself
   (prompt, JSON schema, and the grounding check in `persist_extraction`) was re-read and still looks
   correct; `_location_grounded` still treats country-only locations as trusted. The most likely
   explanation is the local model's own run-to-run reliability at extracting locations — the same
   document was reprocessed 3 times across earlier sessions (2026-07-18 twice) and did produce
   IR/KW/BH locations then, but this newest run produced none across 3 (differently consolidated)
   events. This is the same open reliability question already recorded in the
   [Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16),
   now with a second, concrete data point showing a run that produced zero locations rather than
   "seems good for now." Not yet decided: whether to add extraction-result observability (the
   `PersistResult.dropped_locations` list already exists in code but is never logged, persisted, or
   surfaced — so there is currently no way to tell "the model said nothing" from "the model said
   something ungrounded that got silently dropped"), reprocess again to see if it is a one-off, or
   treat this as a hard limit of the current local model (`qwen/qwen3.5-9b`) worth raising with the
   owner directly. Neither globe fix's original visual-confirmation blocker is resolved by this: the
   3 approved events still have no coordinates to plot, so the backside-node-visibility fix
   ([Globe Backside Node Visibility](plans/2026-07-17-globe-backside-node-visibility.md)) still has
   nothing real to check against.

**Follow-up, same day:** at the owner's choice ("coba proses ulang dulu"), reprocessed the same
document again to test whether the empty-locations result was a one-off. It was not — the second
reprocess also produced zero locations across its 4 new draft events. A third, read-only diagnostic
call (built from the real production request/schema, sent directly to LM Studio, nothing persisted)
produced a *third* distinct outcome: a schema-validation failure (`event_date` present without the
required `event_date_precision`), which would fail the whole document in the real pipeline. Three
calls, same document, same `temperature: 0` prompt, three different failure/success shapes — read as
local-model non-determinism rather than a code defect (prompt/schema/validation code re-verified
correct each time). See
[Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
for full detail, including an unconfirmed hypothesis that the system prompt's growth to ~4925
characters (all 12 active Event Types' descriptions and taxonomy paths, added 2026-07-19) may be
crowding out the model's attention on location/date-precision instructions.

**Second follow-up, same day — the prompt-length hypothesis was tested and disproven.** Ran a
controlled A/B comparison directly against LM Studio (read-only, nothing persisted): the real
4925-character production prompt versus a 3632-character variant with the taxonomy-path text removed
entirely, 3 trials attempted per side. Both sides produced **zero locations in every trial that
completed** (one trial returned an empty response body outright; one `NO-PATH` trial did not finish
before a 10-minute command timeout). A shorter prompt did not help at all, so prompt length is not the
cause. Roughly 8 calls total today (2 production reprocesses, 6 diagnostic calls) all failed to
extract any location or failed schema validation outright — a sharp contrast with the two clean
successes on 2026-07-18. The leading remaining explanation is something changed on the **LM
Studio/model side itself** between those two dates (different model or quantization now loaded under
the same `qwen/qwen3.5-9b` name, a context-length limit silently truncating the request, or a changed
server-side sampling setting) — none of which is visible or checkable from the application side.

**Owner's decision:** pause here rather than keep troubleshooting LM Studio settings live; resume in a
dedicated future session. See the
[Feedback Backlog entry](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
for the full trial-by-trial log and a "Where to resume this investigation" checklist (starts with
checking LM Studio's loaded model/context-length/sampling settings directly, which requires the owner
since it's not visible to a coding agent).

**Everything below in this section is done, committed, merged to `main`, pushed to GitHub, and
(where it touches the running app) deployed to the owner's live containers.** Git housekeeping: all
of this session's work landed as two commits on the `terra-insight-sense` branch, that branch was
fast-forward merged into `main` (no conflicts — `main` was a strict ancestor), `main` was pushed to
GitHub, and `terra-insight-sense` was deleted both on GitHub and locally at the owner's explicit
request ("saya ingin rapi"). The repository now has only `main` and the pre-existing
`Terra-Space-V1-backup` branch. Nothing about this housekeeping changed application code or data.

Two small UI-polish items are done and deployed:

- [Globe Halo Zoom Behavior](plans/2026-07-17-globe-halo-zoom-behavior.md): originally made the
  decorative globe ring fade out symmetrically on zoom; per the owner's 2026-07-20 live check (see
  above), the ring is now removed entirely rather than tuned further — that plan's own status is
  `superseded`.
- [Globe Backside Node Visibility](plans/2026-07-17-globe-backside-node-visibility.md): event pins
  and clusters on the far side of the globe are now hidden, using a self-built spherical-geometry
  check (`isBehindGlobe` in `frontend/src/components/world-map.tsx`) after discovering MapLibre's
  own `isLocationOccluded` occlusion API does not work in this app's setup.

Both verified with the full 190-test frontend suite, clean lint, and a successful production build.
A live-browser pixel check for the backside-visibility fix was attempted in an isolated container
but blocked by unrelated environment friction (the test map's tiles never finished loading); see the
plan's own Resolution note for detail. **Owner follow-up still open:** neither fix has been visually
confirmed by the owner in their real browser yet — recommend checking once approved events with
resolved locations exist again (see Next actions).

**One backlog item is explicitly deferred at the owner's request, not abandoned:** the
[Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md) —
merged from two separate plans at the owner's request ("merge point 4 & 5, since its the same") — a
route-backgrounds scope and a Settings-layout scope. A concrete side-by-side review artifact was
prepared and shown to the owner (all six current route backgrounds together, plus a
current-vs-proposed Settings mockup separating everyday controls — connection status, model choice
— from an "Advanced connection settings" disclosure holding the base URL, test-connection button,
and processing timeout). The owner looked at it and said "background nanti saja" then "nanti saja
juga" for Settings — **the merged plan remains `status: planned`, no code changed for either scope,
and no owner decision was recorded on the actual direction.** When picked back up, start by asking
the owner for their reaction to that same review artifact (or a fresh one) rather than assuming a
direction — neither scope's own required "show the owner concrete options" step has been completed
yet, only attempted.

**Also fixed this session:** two roadmap/plan documents were stale relative to the actual shipped
code — [Terra Insight and Terra Sense Organization](plans/2026-07-18-terra-insight-terra-sense-organization.md)
was still marked `planned` despite being fully implemented (grouped navigation, `/sense` overview,
Event Types moved into Terra Sense, all confirmed present in the running code and git history), and
`Roadmap.md`'s "Deferred Beyond MVP" list still named hierarchical taxonomy as deferred despite the
Event Taxonomy Tree now being in the MVP. Both are corrected in `Roadmap.md` and the plan's own
frontmatter.

---

The owner-approved [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md)
is now **fully implemented, verified, applied to the owner's live database, and committed** (see the
git housekeeping note above — this landed in the first of two commits, `feat: deliver Event Taxonomy
tree and prior uncommitted feature work`).

Backend (Tasks 1–3), all verified with the full 187-test isolated backend suite:

- `0009_event_taxonomy_tree` and `TaxonomyNode` introduce the approved
  `Domain → Category → Subcategory → Event Type` tree. The migration validates all prerequisites
  before any write, seeds/links the twelve approved leaves, safely no-ops when legacy `Airstrike`
  is absent, clears draft-only Airstrike references before removal when present, rejects non-draft
  Airstrike references, and retains Event Types/events on downgrade.
- Taxonomy API endpoints and legacy Event Type guards are implemented. Direct legacy creation is
  blocked (`POST /api/event-types` now returns `410`), linked leaf renames synchronize the tree,
  linked leaf deletion must go through the tree, and legacy unlinked records remain manageable
  without becoming active taxonomy choices.
- The local-AI pipeline now supplies only active leaves with a complete four-level path and persists
  malformed/unlinked outputs as untyped drafts.
- Manual Event APIs reject `suggested`, unknown, inactive, unlinked, and incomplete-path types; an
  explicitly null Event Type clears the type. The approval guard (`approve_event`, mirrored in
  `_resolve_event_type`) raises `EventTypeSelectionError` when an event's type is set and is either
  inactive or not a full active taxonomy leaf; `approve_all_for_document` skips the same case. This
  guard was the one open item flagged at the start of this session (a prior reviewer had found an
  approval bypass) — reviewed and confirmed correct, with dedicated regression tests already covering
  both failure shapes.
- Fixed 6 stale-fixture regressions surfaced only by a full-suite run (not the focused files run
  earlier), unrelated to the guard itself: `test_event_edit_approve_reject.py`, `test_events_api.py`,
  and `test_duplicate_resolution.py` each had a `_client()` fixture creating plain unlinked
  `EventType` rows, which no longer resolve under Task 3's full-path AI matching;
  `test_events_api.py`'s legacy-route test needed the new `KnownEventType.path` field; `test_database.py`
  / `test_migration_0002.py` asserted the old `0008` head revision.

Frontend (Task 4), all verified with the full 187-test frontend suite, clean lint, and a successful
production build (including a clean TypeScript pass):

- Added `frontend/src/app/sense/taxonomy-tree.tsx` (search filters and expands matching ancestors,
  default-expands domains) and `frontend/src/app/sense/taxonomy-inspector.tsx` (per-node
  details/actions only, edit fields hidden until Edit, confirmation required for delete and
  deactivate, only the next valid child level offered, add-child blocked on an `event_type` leaf).
- `event-type-settings.tsx` was rewritten from the old flat list into the composed tree+inspector
  container (`nodes: TaxonomyNodeRead[]`); `event-types-workspace.tsx` fetches `listEventTaxonomy()`
  and the page heading is now "Event Taxonomy"; the Terra Sense nav label was renamed to match.
- `events-api.ts` and `settings-api.ts` gained the taxonomy types/CRUD (`listEventTaxonomy`,
  `createTaxonomyNode`, `updateTaxonomyNode`, `deleteTaxonomyNode`, `isFullTaxonomyLeaf`,
  `formatTaxonomyPath`); the old `createEventType`/`updateEventType`/`deleteEventType` frontend calls
  were removed as dead code.
- `EventTypeDescription` now also shows the selected leaf's path. Event Review's and Events' three
  type pickers (`event-card.tsx`, `add-event-form.tsx`, `event-editor.tsx`) now filter to only full,
  active taxonomy leaves via `isFullTaxonomyLeaf` and display the path; implementing this surfaced
  and fixed a real pre-existing bug in `event-editor.tsx` (the approved-event editor was sending the
  selected type's **id** as `existing`, which can never match a type name — it silently created
  garbage `suggested` types before Task 3's stricter guard, and would have hard-failed every type
  change after it).
- Visually confirmed twice in a real browser: once against an isolated scratch database (tree
  renders, category click selects+expands, inspector shows only valid actions, search filters and
  expands ancestors), and once read-only against the owner's own migrated live database (see below).

**Interruption note:** mid-session the owner's laptop crashed under process load (their normal
`docker compose` containers plus this session's first, heavier isolated QA stack running at once).
Recovered by tearing down the extra QA container/process and, per the owner's choice, restarting
only their normal containers (no rebuild) before pausing Task 5 for their go-ahead.

Task 5 (verify, back up, and safely migrate the live database) is **complete**:

- Full isolated verification: 187/187 backend tests, 187/187 frontend tests, clean lint, successful
  production build (all done before touching live data).
- **Important safety finding, not caused by this session's work:** the live database's
  `db-data` volume already contained a stray, empty `taxonomy_nodes` table with `alembic_version`
  still at `0008` — the leftover of an earlier, unrecorded `alembic upgrade head` attempt against the
  live database by some prior session (Current-Status had no record of this ever happening; it must
  have failed silently on a machine where nobody checked the exit code). Discovered when the first
  backup taken this session (`data/database-backups/2026-07-19_135200/`, since removed from active
  use — kept on disk since deleting inside `data/` is blocked by this environment's safety
  classifier, but it reflects that broken pre-existing state, not this session's migration, so **do
  not restore from it**) turned out to already contain the stray table. Fixed by dropping the empty,
  unreferenced table from the live database (verified empty first; no event, event type, or document
  row was touched), confirmed a clean `PRAGMA foreign_key_check` and revision `0008` afterward, then
  took a fresh, genuinely clean backup.
- **Valid backup:** `data/database-backups/2026-07-19_140115/terra-space.db` — taken immediately
  before the migration, confirmed by direct schema inspection to have no `taxonomy_nodes` table.
- Before migrating: confirmed by direct query that the live database has no `Airstrike` Event Type at
  all (so the migration's Airstrike-removal path is a safe no-op), 12 event types (all active,
  described, exactly the approved set), 12 events, 1 document, revision `0008`.
- The migration itself was proven correct first, in isolation, against a copy of the clean backup
  (completed cleanly: revision became `0009_event_taxonomy_tree`, exactly 33 taxonomy nodes — 3
  domains, 6 categories, 12 subcategories, 12 event-type leaves — empty `PRAGMA foreign_key_check`,
  event/event-type/document counts unchanged) before being applied to the real live database with
  `docker compose up -d --build`.
- **Live database migration applied and verified**: revision `0009_event_taxonomy_tree`, 33 taxonomy
  nodes in the exact expected shape, empty `PRAGMA foreign_key_check`, event types/events/documents
  counts unchanged (12/12/1) from before migration. Both containers healthy.
  All 12 of the owner's existing events were already `rejected` before this migration (unrelated,
  pre-existing state) — 0 approved events and an empty Event Review queue are expected and were
  confirmed read-only in the owner's real browser, alongside the new Event Taxonomy page rendering
  correctly with live data.

This work is now committed, merged to `main`, and pushed (see the git housekeeping note at the top
of this section). The plan file's own status is `completed`, and both its Task 4 and Task 5 commit
checkboxes are checked, each noting they landed in the single combined commit with other pending
work rather than their own commit.

The owner-approved [Single Source Date and Event Date Implementation Plan](plans/2026-07-18-single-source-date-event-date.md)
is implemented, verified, and applied safely to the owner's live database. Documents now use one required, non-blank `Publication Date` (defined
as the date the source document was made), while events use one optional `Event Date` plus a
matching precision. Local AI receives only the source title, Publication Date, and content; it may
set Event Date only when content and evidence quote support it. The schema migration safely maps
legacy source/start dates and removes old range fields. Because SQLite rebuilds parent tables for
this change, the migration now snapshots and restores source links, attachments, event evidence,
actors, locations, and duplicate flags, then checks foreign-key integrity in an isolated regression
test. A consistent SQLite backup was created before deployment, then the live database was migrated
to revision `0008_single_source_event_date`. Read-only post-migration checks confirmed the expected
data counts and an empty `PRAGMA foreign_key_check`. Verification: 162 isolated backend tests, 182
frontend tests, frontend lint, production build, E2E fixture static checks, and Project Knowledge
validation passed. No owner document, event, attachment, or setting was deleted.

The approved [Document Metadata Extraction Context Plan](plans/2026-07-18-document-metadata-extraction-context.md)
is implemented. Every LM Studio extraction now receives the source title, document date, optional
publication date, and content in clearly labelled context. Source dates remain source context only:
the prompt requires event dates to be supported by the source content and each event's evidence
quote. A missing publication date is sent as `Not provided`. Verified with 141 backend tests,
frontend lint, a production build, and isolated test data only; no owner document or event data was
changed.

The approved [Closed Event Type Taxonomy Implementation Plan](plans/2026-07-18-closed-event-type-taxonomy.md)
is implemented through backend and frontend automated verification, with one safe-browser-verification
step still pending. LM Studio's extraction contract now accepts only an exact active Event Type name
or `null`; unknown, inactive, or absent names persist as untyped draft events and never create an
Event Type. Event Review shows an untyped event as `Not stated`, guides the reviewer to choose an
active type where appropriate, and limits its manual pickers to active owner-managed types. The
full backend suite (139 tests), full frontend suite (177 tests), frontend lint, and production build
pass. A focused Playwright scenario exists and is syntax-checked, but has not run because the
existing end-to-end runner resets Docker data; it must be isolated before execution so it cannot
touch owner data.

The owner-approved [Initial Global IR Event Types Configuration Plan](plans/2026-07-18-initial-global-ir-event-types.md)
is complete. Terra Sense now contains twelve active, described Event Types across Security &
Conflict, Diplomacy, and Economy & Energy. The existing suggested `Airstrike` type remains because
it is used by a draft event; it was not altered or deleted. The local API confirmed 13 total types
and 12 active approved taxonomy types. No application code, database schema, or LM Studio setting
changed.

The MVP remains implemented and verified. Six owner-requested follow-up initiatives are now
documented but **not implemented**: a locally hosted Supabase migration, a full reconsideration
of event detection, a re-polish of route-specific UI backgrounds, corrected halo behavior while
globe zoom changes, hiding nodes on the globe's far side, and a simplified Settings user
experience. See the linked plans in the
[Project Knowledge Index](Project-knowledge-Index.md). The Supabase direction preserves the North
Star's local-first boundary; detailed deployment, migration, and rollback choices remain planned
work.

The owner has also approved a new product organization direction, documented in
[Terra Insight and Terra Sense Product Organization](decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md).
The detailed [Terra Insight and Terra Sense Organization Implementation Plan](plans/2026-07-18-terra-insight-terra-sense-organization.md)
is ready for owner approval. It preserves existing routes and local data, groups approved analysis
under Terra Insight and document preparation under Terra Sense, adds a first read-only visual
monitor, and places Event Type management in Terra Sense. No application code, UI, route,
database, or automatic ingestion has changed; wait for the owner's approval before implementation.

Implemented and verified the
[Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md). Event
types now carry normalized descriptions through the database and API; new active types and
inactive-to-active transitions require a description, while legacy active blank types remain usable
until deactivated. Local extraction receives active type names and descriptions in deterministic
order, preserves draft descriptions only for newly suggested inactive types, and never overwrites
an existing human definition. Settings manages each name and description together and explains
blocked activation; Event Review add/edit and Events edit show the selected definition while compact
filters and summaries remain name-only.

Fresh verification passed: 143 backend tests; 161 frontend tests across 29 files; clean frontend
lint; and a successful production build. A separate 10-test evidence run named the prompt,
active-only, legacy migration, activation, AI draft, non-overwrite, single-approval, and approve-all
guarantees. The normal containers were rebuilt and checked read-only against the owner's database.
All write-path browser checks used an isolated Compose project and database: creation and returned
definition, legacy deactivation, blank-type blocking, editable inactive AI draft, and definition
hints in Settings, Event Review, and Events all passed. The temporary
`Verification — event type description` type reported `in_use: false`, was deleted with HTTP 204,
and the isolated volume was removed. The normal containers are healthy again; the owner database
contains no type with that verification name. Project Knowledge validation passed with zero errors
and zero warnings. No North Star or Roadmap milestone changed.

## Previous focus

Implemented the
[Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md): a
play/pause button and a speed/direction mini controller for the Dashboard globe's ambient
rotation, requested directly by the owner as a small cinematic touch. Live testing surfaced that
the *pre-existing* ambient rotation (shipped before this session) was not actually working in the
owner's real browser at all — root-caused by grabbing the live MapLibre instance directly out of
the running page (via React fiber internals) and confirming camera animations were getting
permanently stuck. The cause: the pin-halo pulse animation keeps a MapLibre style transition
perpetually in progress (a 1400ms transition retriggered every 1400ms, back to back, forever), and
rotation was gated on MapLibre's `"idle"` event, which only fires when *no* transition is in
progress — so once the halo pulse started, rotation was permanently starved. Fixed by replacing
`"idle"`/`"move"`-based gating with a simple interaction-cooldown timestamp keyed only to direct
user input (`mousedown`/`touchstart`/`dragstart`/`zoomstart`/`keydown` — deliberately not
`"move"`/`"movestart"`, since rotation's own camera movement fires those too, a second related
self-blocking bug). Also switched the rotation mechanism from bearing (`rotateTo`, an in-place
compass spin) to panning the camera's center longitude (revealing new geography, "like the real
Earth" per the owner's own clarification of what "rotation axis" should mean), and — after the
owner reported the now-working rotation looked "patah-patah" (choppy) — replaced the once-a-second
`easeTo` step with a `requestAnimationFrame` loop calling `jumpTo` every frame with a tiny
proportional increment, removing the accelerate/decelerate/stop pattern at each 1-second boundary.
Verified with 152 frontend tests (11 new/updated; the rotation tests rely on Vitest's built-in fake
`requestAnimationFrame` via `vi.advanceTimersByTime`, after an earlier attempt at a custom
`requestAnimationFrame` stub turned out to silently conflict with `vi.useFakeTimers()`'s own rAF
fake), clean lint, and a successful production build after every stage; rebuilt and restarted the
real frontend container after each stage. The automated browser tool used for live diagnosis in
this session reports its tab as `document.visibilityState: "hidden"`, which fully suspends
`requestAnimationFrame` — so the final smoothing stage could be verified via the test suite and
direct state inspection (grabbing the live map instance and confirming `jumpTo` calls/arguments)
but not by watching the tool's own browser pane; final visual confirmation is the owner's own
"great to see the result!!" after checking their real browser. No Roadmap milestone changed; this
was a direct owner feature request, not a Feedback Backlog item.

## Earlier focus

Implemented and deployed a fix for the second still-open root cause behind
"[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)": AI extraction
was not consistently producing `country`/`admin1`/`city_regency` text at all, confirmed live when
the owner's own real document ("US military reimposes naval blockade on Iranian ports...") produced
5-8 draft events with zero locations across two separate manual test runs, despite the source text
plainly describing Iranian ports, Kuwait, Bahrain, and the Strait of Hormuz. Root-caused by reading
the exact request sent to LM Studio: `EXTRACTION_SYSTEM_PROMPT`
(`backend/app/services/lm_studio.py`) never mentioned locations at all, and none of
`ExtractedLocation`'s fields (`backend/app/schemas/extraction.py`) had a `Field(description=...)`,
so the JSON schema sent to the model via structured output (`response_format: json_schema`) was
bare for `locations` — plus a second, independent bug: nothing told the model `country` must be an
ISO 3166-1 alpha-2 code, so even a model that *did* try (writing "Iran" instead of "IR") would
silently fail the gazetteer's exact-match resolver. Fixed in three parts: (1) added an explicit
location-extraction paragraph plus a concrete worked example to `EXTRACTION_SYSTEM_PROMPT`, since a
first pass with only abstract instructions plus schema descriptions still produced zero locations
against the owner's real local model (`qwen/qwen3.5-9b`) — confirmed via `docker exec` that both the
system prompt and the JSON schema (with descriptions) really were reaching the model correctly, so
the abstract instruction alone just wasn't enough for this model and a one-shot example was added as
the next escalation; (2) added `Field(description=...)` to `ExtractedLocation`'s three fields and
`ExtractedEvent.locations`, since structured-output schemas carry this text straight to the model;
(3) added a location-level "never invent" grounding check in `persist_extraction`
(`backend/app/services/extraction.py`) — reusing the existing `quote_found` helper, a location is
now dropped unless at least one of its non-null `admin1`/`city_regency` values is actually present
in that event's own `evidence_quote` (country-only locations are trusted, since an ISO code never
appears literally in prose) — scoped only to AI extraction, not manual add/edit, since raising how
aggressively the model is asked to extract locations also raises the stakes of it inventing a place
name. No change to the locked
[Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md) decision
(still exact-gazetteer-match only). Verified with 127 backend tests (2 fixed pre-existing fixtures
that had ungrounded locations predating the new check, 3 new grounding tests), rebuilt and restarted
the real backend container twice (once per prompt iteration), and had the owner reprocess their real
document between each iteration ("seems good for now" after the second iteration with the worked
example added) — a precise before/after location count was not captured in this session, so full
confirmation is still the owner's to make as they continue reviewing. No Roadmap milestone changed.

## Recent progress

- Implemented and verified the first half of the owner-reported
  "[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)" gap, per the
  [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md):
  pins that share an identical gazetteer coordinate (same city/province/country) now group into one
  numbered cluster marker instead of stacking invisibly, and events whose location never resolved
  to any coordinate are now surfaced as a clickable "Unresolved locations" stat on the Dashboard
  that opens a list of the affected events. Both are frontend-only; the locked
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision is unchanged (no fuzzy matching, no manual coordinate override, no invented precision).
  Clustering is done in application code rather than MapLibre's built-in distance-based clustering,
  since co-located pins share the *exact* same coordinate (zooming can never separate them); cluster
  markers render as DOM elements via `maplibregl.Marker` rather than a GeoJSON `symbol` layer, since
  the map style has no configured glyph source and GeoJSON array/object feature properties are
  silently stringified with no decode-side parse. Both the cluster-contents list and the
  unresolved-locations list reuse one new generic `"list"` drawer panel added to
  `LayeredCommandDeck`. `markerCount` ("Markers · N", "Mapped locations") was switched from
  counting GeoJSON features to `countResolvedEventLocations`, so it keeps reflecting the true
  resolved-location count regardless of clustering. Verified with 148 frontend tests across 29
  files, clean lint, and a successful production build. Since the owner's live database had 0
  approved events at the time, full visual confirmation used a separate, fully isolated Docker
  Compose stack (own project name, ports, and scratch database; the real containers and database
  were never touched) seeded with three test events via the API (two sharing one Jakarta
  coordinate, one with an unresolvable location) — this confirmed the cluster marker ("2 events at
  Jakarta, Jakarta, ID"), cluster-click → list → detail flow, the "Unresolved locations · 1" stat
  and its list, and correct "Markers"/"Mapped locations" counts, all end to end in a real browser.
  The isolated stack, its images, and its volume were fully torn down afterward. The owner then
  manually tested the real Dashboard and Event Review themselves, which surfaced the extraction
  root cause fixed in the Previous focus above.
- Implemented and verified the owner-approved
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md)
  direction through the complete
  [implementation plan](plans/2026-07-16-amber-glass-background-browser-zoom.md). Terra Space now
  uses five original, route-specific local amber-on-black WebP backgrounds; the shared status bar
  and sidebar use restrained dark glass; Dashboard HUD surfaces use slightly stronger glass; and
  workflow reading/editing surfaces remain nearly opaque. The old blue-gray Dashboard atmosphere
  was removed. The five `1920 x 1080` assets total `306572` bytes (each below `650 KiB`) and
  require no external runtime request. The Dashboard now renders inside one `1664 x 872`
  `CommandDeckViewport` and applies one bounded scale to the complete composition as effective
  browser zoom increases; Documents, Event Review, Events, and Settings continue to reflow
  normally. Verified with 137 frontend tests across 27 test files, lint, a successful production
  build, and the full isolated end-to-end runner (10 Playwright tests plus database verification
  scripts) after repairing its stale pre-required-field selectors and obsolete bind-mounted
  database reset. Browser QA covered 90%, 100%, 110%, 125%, and 150% effective zoom: the 150%
  viewport reported scale `0.8718`, zero horizontal overflow, static background artwork, and a
  `0.00001s` reduced-motion transition. Read-only QA used an isolated copy of the owner's current
  database (1 document, 4 draft events, 0 approved events) and copied attachment, so the owner's
  live database was not changed. No Roadmap milestone changed.
- Fixed the Event Review "Edit" button discoverability gap from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report ("i want to be able to edit each draft
  intelligence's fields in this menu"). That entry recorded two possible interpretations — a
  discoverability problem versus a request for always-editable inline fields — and needed the
  owner's choice before any code changed; the owner confirmed it was the discoverability problem.
  In `frontend/src/app/event-review/event-card.tsx`, the button is now labeled "Edit fields"
  instead of the bare "Edit", moved to the first position in the action row (ahead of
  Reject/Approve, so the "modify" action reads before the two terminal decisions), and given the
  same amber `btn-primary` accent already used for the equivalent Edit action on the Events detail
  view, instead of blending in with Reject's plain neutral style — the underlying edit form itself
  was already complete and unchanged. No new button color or design-token was introduced. Verified
  with 127 frontend tests, lint, a production build, and a live check against a rebuilt Docker
  frontend image (the running container was a prior build with no source volume mount, so the
  change was invisible until rebuilt) using the owner's real draft events (4 existing drafts):
  confirmed the relabeled, repositioned, accented button reads clearly and still opens the
  existing full-field edit form — read-only, no data changed. The Feedback Backlog entry is marked
  resolved. No Roadmap phase or milestone changed.
- Reduced the Dashboard's pointer-parallax intensity per the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report that the Situation Summary, Recent Signals, and
  Event Register panels moved too much with the mouse pointer. Asked the owner to confirm scope
  first since the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) decision
  explicitly calls for "small pointer parallax" as part of the Dashboard motion signature; the
  owner chose to keep parallax but make it subtler rather than remove it, so no decision update
  was needed. In `frontend/src/app/dashboard/layered-command-deck.tsx`, the pointer-move handler
  now scales travel to a max of 3px horizontal / 2px vertical (previously 8px / 5px) through the
  same shared `--deck-parallax-x`/`--deck-parallax-y` CSS variables every affected panel already
  reads, so all three panels calmed down from one change. Verified with 127 frontend tests (1
  existing test updated to the new bounded values), lint, a production build, and a live check:
  rebuilt the frontend Docker image (the running container was a prior build with no source
  volume mount, so the change was invisible until rebuilt), then drove the real Dashboard at
  `1920 × 1080` with Playwright to confirm the on-page CSS variables now read the smaller bounds
  and that the globe, panels, and dock still render correctly — read-only navigation only, no data
  changed. The Feedback Backlog entry is marked resolved. No Roadmap phase or milestone changed.

- Fixed two items from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md): the Documents page's disproportionate top/bottom layout,
  and the Dashboard globe's atmosphere ring staying static and covering the globe when zoomed in.
  On Documents, the "New Document" form panel was hard-capped to a `52rem` width inside a page that
  can be up to `86rem` wide, leaving a large empty area to its right while the Document Queue panel
  below it correctly stretched full width; removed the cap so both panels match, and moved the
  Source URL field into the same row as Document date/Publication date (using an auto-fit grid) so
  the reclaimed width is used instead of sitting empty inside the form. On the Dashboard, the amber
  ring drawn by `.command-deck-globe::after` is a fixed-size decorative overlay sized for the
  resting globe view (zoom `2.2`); it does not track the MapLibre globe's own zoom, so zooming in
  made the enlarged globe surface grow past it and appear covered by a static ring. `WorldMap` now
  tracks the map's zoom level and sets a `--globe-ring-opacity` CSS variable on the ring's container,
  fading the ring out over about two zoom levels past resting so it only shows at the intended
  full-globe view. Verified with 127 frontend tests (2 new/updated, covering the ring's zoom-fade
  behavior and the added `zoom` listener cleanup), lint, a production build, and a live desktop
  browser check at `1920 × 1080` (Documents before/after, Dashboard at rest and after a simulated
  wheel-zoom) against the owner's real local database — read-only navigation only, no data changed.
  Both closed items are marked resolved in the Feedback Backlog; the remaining Dashboard panel
  parallax issue in that same entry is still open, since removing parallax conflicts with the locked
  Visual Design Direction decision and needs owner approval first. No Roadmap phase or milestone
  changed.
- Fixed slow local startup: `Start-TerraSpace.ps1` was taking about 70 seconds because the SQLite
  database lived on the Windows-mounted `data` folder, where Docker Desktop's bind-mount I/O is
  slow for SQLite's frequent small writes. Per the
  [Database Storage Moved to a Docker-Managed Volume](decisions/Database-Storage-Location.md)
  decision, only the database now lives in a Docker-managed volume; `data/maps`,
  `data/attachments`, and `data/logs` are unchanged and still visible in Windows Explorer. Startup
  is now about 8.5 seconds. Added `Backup-TerraSpaceDatabase.ps1` and
  `Restore-TerraSpaceDatabase.ps1` (both verified working) since the database can no longer be
  backed up by just copying the `data` folder, and updated the README's "Backup and restore"
  section accordingly. While verifying, also fixed an unrelated pre-existing bug found along the
  way: the backend health check's hardcoded 2-second internal timeout was too tight for this
  machine's ~2-second normal loopback latency, causing the health check to fail most of the time
  regardless of the database change (confirmed by reproducing the same failure on the unmodified
  prior configuration); both the Dockerfile's `HEALTHCHECK` and `docker-compose.yml`'s override
  were widened. No Roadmap phase or milestone changed.
- Protected event deletion is implemented and verified per the
  [Event Deletion Design](plans/2026-07-15-event-deletion-design.md). Owners can permanently
  delete `draft` and `approved` events either directly from an Events list row or from the Events
  detail view, after an explicit confirmation naming the event; `rejected` and `merged` events
  remain immutable audit history with no Delete control and a `409` from the API. Deletion never
  touches the source document, attachments, actors, locations, event types, or shared source
  records. The target remains the owner's `1920 × 1080` display at `100%` Windows scale, with
  phone/mobile explicitly unsupported. No Roadmap phase or milestone changed.

- Moved Delete from a detail-only control to an inline action in every Events list row (plus
  keeping it in the detail view), after the owner's live testing showed the detail-only placement
  read as "no delete option" from the list. Added an `Actions` column to `EventList` and widened
  its grid (including both responsive breakpoints) to fit a `Delete` button per deletable row;
  `EventsWorkspace` now has one shared `removeEvent(event)` handler used by both the list row and
  the detail panel, so either entry point confirms, calls the same `DELETE` endpoint, updates
  local state, and closes the detail panel only if the deleted event was the one open. Verified
  with a new list-row test plus the full 126-test frontend suite, lint, and a production build; no
  backend change was needed. Visually confirmed in a real browser against mocked event data
  (Delete button per row, correct confirmation copy, row removal, and count update on success).
- Executed the
  [Event Deletion Implementation Plan](plans/2026-07-15-event-deletion-implementation.md)
  test-first: added `DELETE /api/events/{event_id}` (`204` on success, `404` if missing, `409` for
  `rejected`/`merged`) and a `Delete` control on the Events detail view that confirms via a dialog
  naming the event and stating the source document remains, then closes the detail panel and
  refreshes the Events list on success or shows the existing error banner on failure. Fixed a real
  ORM gap found while implementing: `Event.event_sources` and `Event.duplicate_flags` needed
  `cascade="all, delete-orphan"` (matching the existing `Event.event_actors` pattern) for
  `db.delete(event)` to work at all — no migration was needed, since the database's own
  `ON DELETE CASCADE` constraints already matched. Verified with 124 backend tests (13 new), 125
  frontend tests (4 new), clean lint, a production build, Project Knowledge validation, and a clean
  `git diff --check`.

- Added a configurable per-document LM Studio processing timeout after the owner's live testing
  exposed the previous fixed two-minute limit. The Settings screen now offers 2, 5 (default and
  recommended), or 10 minutes; the chosen value is saved locally in `app_settings` and used by
  the very next extraction without a restart. The backend still fails only the affected document
  and preserves the existing Retry flow if LM Studio does not respond. Migration
  `0006_lm_studio_timeout` supplies the five-minute default for existing local databases.
  Verified with 119 backend tests, 121 frontend tests, frontend lint, and a production build.

- Completed all five checkpoints in the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md).
  The final isolated workbench contained 9 documents, 6 approved events, 2 drafts, 1 rejected
  event, 8 mapped locations, 1 pending duplicate, and 2 attachments. Real-browser checks covered
  all five populated screens, Dashboard at `1920 × 930` and `1920 × 900`, normal and reduced-motion
  behavior, and the full interaction set. Final verification passed: 120 frontend tests in 25
  files, lint, production build, `git diff --check`, and Project Knowledge validation. The
  isolated Docker volume, stub, frontend process, QA browsers, and temporary artifacts were removed.

- Wrote and self-reviewed the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md)
  as five locally committed checkpoints. It uses focused tests and one commit per checkpoint to
  keep progress observable and credit use controlled. An isolated nine-document workbench is
  populated through the real LM Studio extraction flow before Dashboard layout work begins, then
  remains available for visual judgment through the final `1920 × 930`/`1920 × 900` browser pass;
  the owner's normal database is never mounted or changed.

- Completed the motion-design session and high-fidelity comparison. The owner initially chose the
  Orbital HUD, found its rendered cockpit-like density excessive, and approved the calmer Layered
  Command Deck: a viewport-height Dashboard with a 65–70% globe; a three-metric Situation Summary
  at the far left; three-row Recent Signals at the far right; one slim Event Register/Filters dock;
  three subtle CSS 3D depth planes with only 3–5° tilt; limited parallax and connector emphasis;
  lighter motion on Documents, Event Review, Events, and Settings; reduced-motion behavior; and
  browser QA at `1920 × 930` plus `1920 × 900`. The refinement stays within the pure-black/amber
  mission-brief language and adds no phone/mobile target.

- Completed the implementation half of the deferred aesthetic pass across Dashboard, Documents,
  Event Review, Events, and Settings. Added one shared page-header pattern and permanent status
  bar; compressed the shared Dashboard/Events filter into search plus expandable advanced
  controls; brightened muted text; tightened hierarchy, spacing, and action grouping; and polished
  populated tables, facts, attachments, duplicate review, and real globe pins without introducing
  a second styling system. Created an isolated realistic sample database with nine documents and
  mixed event types, epistemic/review states, dates, locations, duplicate states, and attachments,
  then inspected every changed screen in a real desktop browser. Verified 100 frontend tests
  across 22 files, clean lint, and a successful production build.

- Fixed the four prioritized usability defects from the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): replaced the internal "Phase 2" /
  "Phase 3" roadmap labels on Documents and Event Review with real eyebrow text ("Source intake",
  "Extraction queue"); gave Event Review's dead-end empty state a framed orientation message and a
  button to Documents; taught the shared `EventList`/`EventTimeline` components to distinguish "no
  approved events exist yet" (with a link to Event Review) from "filters excluded everything"
  (kept message plus a Clear filters action) on Dashboard and Events; and titled the Documents
  queue panel with its own empty state, plus fixed disabled primary buttons fading to
  near-invisible by switching `.btn:disabled` from the unused `--text-dim` token to the already-used
  `--text-muted` token (removing `--text-dim` as dead CSS). Verified with 88 frontend tests (6 new),
  lint, a production build, and a live browser check of all four affected screens in both the
  "no data" and "filters active" empty-state branches.

- Ran the audit half of the deferred design pass as a read-only review (no code changed): the
  app was started from the `design-pass` worktree, all five screens were captured as full-page
  and viewport screenshots, and each was evaluated against the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) and the Tailwind Plus category
  map in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md). Findings are recorded in
  the [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): four usability defects
  (visible "PHASE 2"/"PHASE 3" roadmap labels on Documents and Event Review, a dead-end Event
  Review empty state, a misleading "No events match these filters" message shown on an empty
  database, and an unlabeled Documents queue panel with near-invisible disabled buttons), plus
  prioritized polish items led by compressing the shared Dashboard/Events filter block so the
  globe is visible without scrolling. Caveat recorded in the audit: all screenshots were of an
  empty database, so the populated views (review card, events table, facts grid, globe pins,
  attachment thumbnails) still need a follow-up capture with sample data before or during the
  implementation half.
- Executed the
  [Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md),
  closing the only Roadmap item left open across the whole MVP. The `Attachment` table and
  `data/attachments/` directory already existed from Phase 1, but no attachment route, service, or
  UI existed anywhere in the codebase — confirmed by a repo-wide search before writing the plan.
  Added a storage service that accepts only common image media types (`image/jpeg`, `image/png`,
  `image/gif`, `image/webp`) up to a 10 MB cap, writes files under a server-generated path (never
  the client's filename, avoiding path traversal), and computes a SHA-256 checksum at upload time.
  Added nested `/api/documents/{id}/attachments` routes (upload, file-serving, delete), gated behind
  the same draft/failed edit-lock already used for editing a document's own fields. Fixed a real gap
  found while building this: deleting a document only removed `attachments` rows via the foreign
  key's `ON DELETE CASCADE`, never their files on disk — the SQLAlchemy relationship now cascades
  too, so `delete_document` cleans up every attachment file it owns. Built a thumbnail
  grid/upload/delete UI on the Documents page. Verified with 117 backend tests, 82 frontend tests,
  frontend lint (one pre-existing-pattern `next/image` performance warning, not an error, left as-is
  since these are small dynamic thumbnails from a same-origin backend proxy), a production build,
  and the full e2e suite — which now uploads an attachment, deletes it, uploads a second one, and
  confirms after processing completes that the surviving file's bytes on disk still match its
  stored checksum. Also discovered, while trying to follow this plan's own verification commands,
  that `docker compose run --rm backend/frontend ...` (written into the Phase 4 and Phase 5 plans
  and copied into this one) can never work: both Dockerfiles are multi-stage builds whose final
  image strips out `uv`/dev dependencies (backend) or `node_modules`/test tooling (frontend) —
  verification in every phase, including this one, actually used `docker run` against the `uv` base
  image (backend) and `npm run test/lint/build` directly (frontend) instead.

- Executed the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md)
  task by task. Added a persisted single-row `app_settings` table (migration
  `0005_phase5_app_settings`) and made `LmStudioClient` resolve its base URL and preferred model
  from that row on every call, so saving new settings takes effect for the next processing run and
  the health check without restarting containers; the selected model is now honored by extraction
  instead of always using the first discovered model. Added `GET/PATCH /api/settings` (offline-safe
  read, URL validation, model can be cleared to auto-detect) and an
  `POST /api/settings/lm-studio/test` connection test that lists a candidate or saved URL's models
  without mutating stored settings. Added create/rename/activate-deactivate/delete-when-unreferenced
  event-type management (`POST/PATCH/DELETE /api/event-types`, with an `in_use` flag on the list so
  the UI only offers delete for unused types). Built the Settings screen (LM Studio connection panel
  with a live connection test, and an event-type panel), replacing the placeholder, with the
  Tailwind Plus categories from Design Pass Sequencing in mind. Verified with 106 backend tests, 79
  frontend tests, frontend lint, a frontend production build, and the browser e2e suite — which now
  includes a Phase 5 settings scenario that configures LM Studio and manages event types through the
  UI, then drives a two-document batch where one document fails and is recovered by retry (the stub
  fails that document once, then succeeds), with `app_settings`, event-type state, and document
  recovery all confirmed by inspecting SQLite. Partial-batch failure, retry, reprocessing
  confirmation, and already-queued conflicts are also covered directly by backend tests.

- Wrote the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md) from a
  direct inspection of the current codebase. The grounding surfaced the key architectural fact that
  shapes the phase: the LM Studio base URL is baked in once at startup (`create_app` builds a single
  `LmStudioClient(settings.lm_studio_url)` from the `TERRA_LM_STUDIO_URL` env var and hands it to the
  processing background tasks and health check), and `_discover_model` always picks `models[0]`, so a
  user's model choice has nowhere to live and is never honored. The plan adds a persisted single-row
  `app_settings` table and makes the client resolve base URL and model from it on every call, so saved
  settings take effect immediately without a restart. It also adds create/rename/activate-deactivate/
  delete-if-unreferenced event-type management (the read-only `GET /api/event-types` already exists and
  types are already `is_active` data), builds the still-placeholder Settings screen with the Tailwind
  Plus categories named in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md), and closes
  with the final MVP end-to-end and failure-case verification pass (explicitly auditing partial-batch
  failure and retry as the one failure case not clearly covered by existing e2e specs). It fixes
  "required extraction settings" to mean base URL + selected model, with no new generation knobs.

- Did a high-level unused-files scan of the whole project and acted on every finding: added
  migration `0004_coordinate_backfill` after finding the Phase 4 migration never actually called
  the already-written, already-tested `backfill_missing_coordinates()` (confirmed live — 3 of 4
  location rows for one place had `NULL` coordinates; the Dashboard's "Incomplete location"
  metric read `1` and now reads `0`); removed leftover `create-next-app` scaffolding
  (`favicon.ico` still being served over the real logo, five unused starter SVGs); and cleaned up
  repo cruft — an empty stray `backend;D/` folder, the two completed git worktrees
  (`phase-1-foundation`, `phase-4-events-dashboard`), and 5 branches already merged into `main`
  (deleted locally and, for the 2 that were still pushed, on GitHub too). All committed and
  pushed to `main`; 81 backend tests and 66 frontend tests passing.
- Recorded the [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md) decision: defer any
  further aesthetic design pass until after Phase 5, while mapping which Tailwind Plus
  Application UI categories should inform Phase 5's Settings screen and the eventual pass.
- Revised the Events page and Dashboard's embedded event list from the owner's manual testing
  feedback: grouped the filter bar into four labeled clusters, moved Sort order into a toolbar
  above the list with an approved-event count and column headers, clarified the Search field's
  scope, and made the source document link visibly clickable. Also fixed a layout overflow the
  new header exposed in the Dashboard's narrower panel.
- Replaced the placeholder hand-drawn logo with the owner-supplied `terraspace-brand-kit-v3`,
  recolored to the existing amber so it matches the rest of the interface, and fixed a broken
  "A" glyph in the kit's own wordmark by rendering the wordmark as live text instead.
- Executed the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md):
  approved events can now be searched, filtered, sorted, opened, edited, and traced back to their
  read-only source documents. Dashboard summary, globe map, timeline, and event list use the same
  filter URL, so they always describe the same approved-event result. Locations use only the
  checked-in local gazetteer and show their country/admin1/city precision; unmatched locations
  stay blank instead of being guessed. The globe stays local and shows a clear flat-map fallback
  if globe mode is unavailable.
- Verified Phase 4 with 80 backend tests, 64 frontend tests, frontend lint, a Docker production
  build, and all four browser scenarios. The final browser scenario creates approved, rejected,
  date-unknown, and unmatched-location events, checks the shared Dashboard/Events filter, edits
  an approved event, reads its source, and inspects SQLite/API state for coordinates, precision,
  approval time, and approved-only visibility.
- Wrote the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md) from a
  direct inspection of the current codebase. It covers the approved Events list (search, shared
  filters, sorting, detail, source links, and approved-event editing), Dashboard summary, map,
  timeline, and one URL-backed filter contract shared by all four Dashboard views and Events.
  It also records the exact meanings of "new", incomplete date, incomplete location, partial
  date-range matching, and map fallback so implementation has no hidden product choices.
- Resolved Phase 3's deferred coordinate question in the
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision: a generated, checked-in GeoNames-based gazetteer performs exact local
  city/admin1/country lookups, saves coordinate precision, never calls a geocoding service at
  runtime, never uses AI-generated coordinates, and leaves ambiguous/unmatched locations blank.
  The plan adds a migration and idempotent backfill for already-saved locations.
- Reconciled a Phase 3 implementation constraint with the Roadmap: approved events are currently
  immutable, but Phase 4 requires approved-event edit support. The plan permits direct approved
  edits while rejected/merged records remain immutable audit history; sources/evidence stay
  read-only and editing does not re-run duplicate detection.

- Executed the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
  task by task: an events read/write API (list, detail, edit, approve, reject, manual add,
  approve-all); a duplicate-detection heuristic (same event type, dates within 3 days, and a
  shared actor or location) that runs automatically after both AI extraction and manual add,
  comparing only against already-`approved` events; a duplicate-flag resolution endpoint
  supporting keep-separate and link/merge (the merged event's evidence-bearing source moves onto
  the matched approved event, and the merged event's own status becomes `merged`, never
  deleted); read-only `/api/event-types` and `/api/actors` lookups exposing AI-suggested
  (`is_active = false`) rows for the review screen's pickers; two new shared design components
  (`FramedPanel`, `StatusChip`, the latter absorbing `ProcessingStatusBadge`); and the full Event
  Review screen (review bar, source panel with case/whitespace-insensitive evidence-quote
  highlighting, an editable event card with an explicit "Date unknown"/"Not stated" for missing
  facts, a four-segment epistemic-status control, a manual add-event form, and a duplicate
  compare panel offering Keep Separate / Link to This Event). Approval is blocked while an event
  has an unresolved duplicate flag — a rule introduced in the Phase 3 plan, not one of the
  pre-existing decisions, since no earlier document had fixed it.
- Verified end-to-end: 71 backend tests, 38 frontend tests, frontend lint and production build,
  and a new Playwright scenario that creates four documents against a content-routed LM Studio
  stub and drives the full review flow through the browser — approving one event (confirming its
  suggested type and actor flip to `is_active = true`), rejecting another, resolving one
  duplicate flag as "keep separate" then approving that event too, and resolving a second
  duplicate flag as "link" — with the final state (`approved`/`rejected`/`merged` statuses, both
  resolution kinds, and the merged event's evidence quote landing on the approved target)
  confirmed by inspecting the SQLite database directly, since the Events list page is still
  Phase 4. Project Knowledge validation passed with 0 errors and 0 warnings.
- Found and fixed one real regression while verifying: the new Event Review page had no
  `<h1>Event Review</h1>` heading in any of its loading/empty/main states, breaking the Phase 1
  foundation test that expects every nav route to expose a heading matching its label — fixed by
  giving the page a single persistent header above its conditional content, matching the pattern
  already used on the Documents page.
- Extended the e2e LM Studio HTTP stub to route by a substring match against the incoming
  request body (which contains the document's own text) rather than always returning one fixed
  canned response, so a single test run can exercise multiple documents that each need a
  different structured extraction result.
- Wrote the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md),
  grounded in a direct inspection of the current codebase rather than assumptions: confirmed
  `DuplicateFlag` and its migration already exist from Phase 2 (no new migration needed), no
  events API or shared design-system components exist yet, and both `event-review/page.tsx` and
  `events/page.tsx` are still placeholders. The plan covers the events read/write API, a
  duplicate-detection heuristic and its resolution (keep separate / link-merge) endpoint,
  event-type/actor lookups, and the Event Review screen per the locked Visual Design Direction.
  It introduces one new rule beyond existing decisions: approval is blocked while an event has a
  pending duplicate flag, to enforce "no silent merges" at the one point it would otherwise be
  bypassable.
- Executed the [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
  task by task: the Document & Event Data Model migration; document draft CRUD; the Documents
  page styled per the Visual Design Direction (design tokens promoted into shared CSS); LM
  Studio structured extraction with model auto-discovery; evidence-quote validation enforcing
  "never invent"; batch processing orchestration with per-document failure isolation and a
  forward-looking reprocessing-approval warning; and the frontend batch-processing UX (polling,
  retry, reprocess-confirmation dialog).
- Verified end-to-end: 48 backend tests, 18 frontend tests, frontend lint and production build,
  and two Playwright scenarios — LM Studio genuinely offline (Documents CRUD still works) and a
  document processed against a local LM Studio stub (confirmed a `draft` event with the correct
  `evidence_quote` by inspecting the SQLite database directly, since no Events API exists yet).
  Project Knowledge validation passed with 0 errors and 0 warnings.
- Fixed two environment issues found during this verification, both real defects rather than
  Phase 2 logic bugs: `backend/docker-entrypoint.sh` had CRLF line endings (breaking container
  startup on a Windows checkout) with no `.gitattributes` to prevent it — added
  `.gitattributes` forcing LF for `*.sh` and fixed the file; and the e2e LM Studio stub server
  had to run as its own OS process rather than in the same Node process that calls
  `spawnSync` for Docker/PowerShell, since `spawnSync` blocks that whole process's event loop
  for the child's lifetime and would otherwise freeze the stub mid-request.
- Optional image attachment upload was intentionally not built in Phase 2: it depends on
  Phase 1's still-planned local attachment storage, which does not exist yet.
- Wrote the Phase 2 (Documents and Batch Processing) implementation plan, scoped to Roadmap
  Phase 2 only, in `project-knowledge/plans/`.
- Designed the Phase 2/3 data model extension and recorded it as the Document & Event Data
  Model decision: document dates, evidence-on-source-link, a persistent duplicate-flags
  table, actor source/target roles, AI-suggestion tracking via `is_active`, and numeric
  latitude/longitude for the map.
- Held the dedicated visual-design session and locked the visual direction: a calm "mission
  brief" tactical look on pure black, with a 3D globe, amber accent, serif source documents,
  and one-thing-at-a-time dense screens. Recorded as the Visual Design Direction decision.
- Validated two screens (Dashboard and Event Review) as concept mockups during the session.
- Created the isolated `phase-1-foundation` branch and worktree for implementation.
- Built the Next.js frontend and FastAPI backend skeleton with locked dependencies and automated tests.
- Implemented safe local data-directory initialization and a health endpoint that reports offline LM Studio without blocking application startup.
- Added the SQLite schema and reversible Alembic migration for documents, attachments, events, event types, actors, locations, sources, and their event relationships.
- Verified the current backend suite with 14 passing tests.
- Added the neutral English navigation shell for Dashboard, Documents, Event Review, Events, and Settings.
- Added a local-only LM Studio availability check and clear offline status messages.
- Built and verified a 4.7 MB low-detail world PMTiles package from Natural Earth data; it remains outside Git in the local `data/maps/` folder.
- Added a two-service Docker Compose runtime: the frontend is available only at `http://localhost:3000`, while the backend remains on the private Docker network.
- Added beginner-friendly PowerShell start and stop helpers, along with clear instructions for the first map build, local LM Studio, backup, and restore.
- Verified that the SQLite database retains a sentinel record after containers are stopped and started again.
- Added a browser end-to-end test that confirms all five English routes, local map rendering, LM Studio offline usability, and no external browser network requests.
- Merged and pushed the completed Phase 1 foundation to `main` (`7fe43a7`).
- Approved the Phase 1 foundation design.
- Prepared a task-by-task implementation plan covering Docker, storage, SQLite, navigation, service health, the offline world map, and verification.
- Inspected the repository and confirmed it currently contains Project Knowledge and setup files, but no application implementation.
- Agreed on a local browser application started with Docker Compose.
- Selected Next.js and TypeScript for the frontend, FastAPI and Python for the backend, and SQLite for local structured data.
- Selected MapLibre and a replaceable low-detail world PMTiles package for fully offline maps.
- Confirmed that the user interface will be in English.
- Reserved a separate design session for detailed visual direction before final interface implementation.
- Lean Project Knowledge setup installed at the `terra_space` project root.
- MVP brief ingested into North Star and Roadmap.
- Terra Space direction is now local-first, single-user, LM Studio based, and focused on document-to-event intelligence workflow.
- MVP scope is limited to Documents, batch processing, Event Review, deduplication recommendation, Events, Dashboard, and Settings.

## Blockers

- The normal end-to-end pipeline has been intentionally reset. Rebuilding the four deleted
  workflows and the 31 deleted tables requires a new owner-approved design; the old pipeline
  documents are historical only.

## Previous next action

- Write the Roadmap Phase 4 (Events and Dashboard) implementation plan: the approved Events
  list with filters/search/sorting, the Dashboard summary, the map view, the timeline view, and
  synchronized filters across all four. The Phase 4 plan must decide how map-view coordinates get
  populated — Phase 3 intentionally left `locations.latitude`/`longitude` unpopulated, since no
  geocoding mechanism has been chosen yet.

## Next actions

- **Immediate next action:** agree on the new pipeline's purpose, stages, data model, and outputs
  before recreating any workflow or database table. The remaining bullets below describe the
  pre-reset system and are not an active implementation queue.

- **Top priority for the next session:** resume the local-model location-extraction reliability
  investigation. Paused at the owner's request on 2026-07-20 after a controlled A/B test disproved
  the leading code-side hypothesis (prompt length) — see the "Second follow-up" note above and the
  [Feedback Backlog entry](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)'s
  "Where to resume this investigation" checklist. Start by asking the owner to check LM Studio's
  loaded model/quantization, context-length limit, and sampling settings directly (not visible to a
  coding agent) before writing any more code.
- The globe halo/ring and atmosphere-glow removal ([Globe Halo Zoom Behavior
  Plan](plans/2026-07-17-globe-halo-zoom-behavior.md)) is now fully resolved and owner-confirmed live
  ("Oke saya sudah lihat, sip") — no further action needed there.
- When the owner is ready to resume the UI-polish backlog: for the
  [Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md),
  start by asking what specifically they want different (or showing a review artifact again) — both
  scopes were only shown once, not yet discussed in any detail, and the owner deferred both without
  giving a direction. Do not guess a direction and start generating assets or changing the Settings
  layout.
- One larger, not-yet-started owner-requested initiative remains further out:
  [Local Supabase Migration](plans/2026-07-17-local-supabase-migration.md).
  The [Event Detection Reconsideration Plan](plans/2026-07-17-event-detection-reconsideration.md)
  was scrapped at the owner's request on 2026-07-19 (`status: superseded`): its own questions were
  effectively already answered by other, already-completed work (extraction prompt/grounding fixes,
  event type descriptions and classification rules, the Event Taxonomy Tree). See the plan's own
  "Superseded" note for the specific items that covered it.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
- [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
- [North Star](North-Star.md)
- [Roadmap](Roadmap.md)
- [Document & Event Data Model](decisions/Document-Event-Data-Model.md)
- [Local-First MVP Decision](decisions/MVP-Local-First-Architecture.md)
- [Visual Design Direction](decisions/Visual-Design-Direction.md)
- [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md)
- [Layered Command Deck and Motion Design](plans/2026-07-15-layered-command-deck-motion-design.md)
- [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md)
- [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md)
- [Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md)
- [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
