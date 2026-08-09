---
type: Implementation Plan
title: "n8n Candidate Canonical Event Detection — Prototype"
description: "Testing-phase n8n workflow that detects provisional 'candidate canonical events' from pasted document text, comparing two LM Studio models and two extraction techniques in parallel, storing results in an n8n Data Table for comparison."
tags: [event-detection, n8n, prototype, lm-studio]
status: in-progress
okf_version: "0.1"
---

# n8n Candidate Canonical Event Detection — Prototype

## Context

The owner shared a new conceptual framework ("Terra Space Conceptual Handoff") for detecting
**potential canonical events** — source-grounded event candidates that may later be validated,
normalized, deduplicated, and merged into a canonical event. The owner explicitly asked for this
first stage to be built and tested as an **n8n workflow**, reusing the existing skeleton workflow
`Terra_Space_Event_detection` (n8n id `st4YuDeljYyIuIWU`), rather than changing the production
Python/SQLite backend yet.

This is **still a testing phase**, per the owner's own words. It does not touch the live
`terra-space.db`, the backend's existing extraction code, or any locked project decision. The
owner's stated longer-term intent is for this approach to eventually replace the backend's
existing Signal Parser stage (see
[Staged Event Detection Pipeline](../decisions/Staged-Event-Detection-Pipeline.md)), but that
integration is a separate future decision to make only after this prototype has been tested
against real documents.

## Core event definition (owner's framing)

A **potential canonical event** is a source-grounded event candidate detected within a document
that may later be validated, normalized, deduplicated, and merged into a canonical event.

Two top-level types:

- **RELATIONAL_INTERACTION** — an event defined by an action or interaction involving two or more
  participants.
- **ENTITY_CENTRED_CHANGE** — an event defined by an occurrence or state transition affecting an
  entity, system, population, asset, or location, without requiring a source-target relationship.

Worked example the owner gave:

> Sentence: "Terjadi gempa bumi di Kabupaten X."
> Classification: `ENTITY_CENTRED_CHANGE`
> Phenomenon: earthquake
> Affected location: Kabupaten X

## Purpose of this stage (owner's five points)

1. Detect potential canonical events from a source document.
2. Preserve the exact evidence span.
3. Separate multiple event candidates in one document.
4. Assign only provisional classifications.
5. Normalization and deduplication happen later — explicitly **not** part of this stage.

## Design decisions made during brainstorming

- **Storage:** n8n's built-in Data Table feature (`nodes-base.dataTable`) — no separate database
  server, fully visual/editable inside n8n, zero risk to the live app's data.
- **Evidence span:** both the verbatim quote **and** numeric start/end character offsets.
  Offsets are computed **deterministically in a Code node** by searching for the model's quote
  inside the original source text — never asked of the LLM, since small local models are
  unreliable at counting characters. This mirrors the backend's existing `quote_found` grounding
  check (see the Staged Event Detection Pipeline decision) and the North Star rule that AI must
  not invent facts.
- **Models tested in parallel:** `google/gemma-4-e4b` (already wired into the skeleton workflow,
  credential "LM Studio Rumah") and `qwen/qwen3.5-9b` (the model the production backend currently
  uses, so results are directly comparable to known backend reliability issues — see the
  [Feedback Backlog](../Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
  entry on location-extraction reliability). Both models are served locally by LM Studio's
  OpenAI-compatible API, so the same `OpenAI Chat Model` node type is used for both — only the
  `model` field differs between the two node instances, same credential. **Caveat:** if LM Studio
  keeps only one model loaded in memory at a time on the owner's machine, the two branches may end
  up serializing at the LM Studio server level even though n8n dispatches them in parallel; this is
  worth observing empirically rather than assuming either way.
- **Extraction technique tested in parallel:** `Information Extractor` (a LangChain node built
  specifically for structured JSON extraction against a schema) versus `AI Agent` +
  `Structured Output Parser` (heavier, tool-capable, more moving parts). Both are tested side by
  side rather than picking one up front.
- **Test input:** pasted directly into n8n's chat tester via the existing Chat Trigger node — no
  wiring to the live Documents database in this stage.
- **Candidate schema stays flat and type-agnostic on purpose:** a single `entities` list covers
  both event types (one entry for a simple `ENTITY_CENTRED_CHANGE`, two or more for a
  `RELATIONAL_INTERACTION`) rather than separate source/target-actor fields — that relational
  structure is exactly the normalization work the owner's handoff explicitly defers.

## Workflow design

```
Chat Trigger ("When chat message received")
  → OpenAI Chat Model (gemma-4-e4b)  → Information Extractor (gemma)
                                      → AI Agent (gemma) + Structured Output Parser
  → OpenAI Chat Model (qwen3.5-9b)   → Information Extractor (qwen)
                                      → AI Agent (qwen) + Structured Output Parser
  → Merge (all four branches)
  → Code node: for each candidate, search evidence_quote in the source text to compute
    evidence_start / evidence_end; set quote_grounded = false if the quote is not found verbatim
  → Data Table (insert one row per candidate)
```

Each model's Chat Model node output fans out to both its Information Extractor and its AI Agent —
only two Chat Model node instances are needed (one per model), not four.

### Per-candidate JSON schema (used by both extraction techniques)

```json
{
  "candidates": [
    {
      "working_title": "short label for this candidate event",
      "summary": "one-sentence plain description",
      "classification": "RELATIONAL_INTERACTION | ENTITY_CENTRED_CHANGE",
      "phenomenon": "what occurred / what kind of action (e.g. 'earthquake', 'military strike', 'diplomatic meeting')",
      "entities": ["entity or location names involved"],
      "evidence_quote": "verbatim sentence/phrase copied exactly from the source text"
    }
  ]
}
```

### Data Table schema

| column | type | notes |
|---|---|---|
| run_id | string | groups candidates from the same paste/test run |
| model_used | string | `gemma-4-e4b` or `qwen3.5-9b` |
| extraction_method | string | `information_extractor` or `ai_agent` |
| classification | string | `RELATIONAL_INTERACTION` or `ENTITY_CENTRED_CHANGE` |
| working_title | string | |
| summary | string | |
| phenomenon | string | |
| entities | string | JSON-encoded array — Data Table columns are flat, no native array type |
| evidence_quote | string | verbatim |
| evidence_start | number | computed deterministically, not by the model |
| evidence_end | number | computed deterministically, not by the model |
| quote_grounded | boolean | false if the quote was not found verbatim in the source text |
| duration_ms | number | wall-clock time from the shared trigger timestamp to this branch's completion (added after the first live test; includes any LM Studio model-swap delay between branches, which is itself useful comparison data) |
| created_at | date | |

Data Table columns are immutable after creation via n8n's API, so this field required creating a
new table (`candidate_canonical_events`, current id `GRq8A6HfwGyMTiqW`) and archiving the original
one (renamed `candidate_canonical_events_archived_2026-08-01`, id `fRsfDUP1hgLvcIIu`) rather than
altering it in place. The 19 rows from the first successful live run were copied forward.

Real per-call token counts were considered and rejected for this stage: a completed execution's
raw node data showed the `OpenAI Chat Model` sub-nodes (wired in via the `ai_languageModel`
connection type) recording zero output items, meaning LM Studio's token usage — even if returned —
is not exposed anywhere a downstream Code node can read it with the current node architecture
(Information Extractor / AI Agent consuming a Chat Model sub-node). Getting real token counts would
require replacing those nodes with raw HTTP Request calls to LM Studio's API and parsing the
response `usage` field by hand — a genuine rearchitecture that only pays off once a paid API is
actually in use, so it is deferred until then.

Instead, added three **rough, character-count-based estimated token columns**
(`estimated_prompt_tokens`, `estimated_completion_tokens`, `estimated_total_tokens`) using the
common ~4-characters-per-token approximation: prompt estimate = (shared system prompt length +
source document length) / 4; completion estimate = length of the raw model output JSON / 4.
Failure rows only get a prompt estimate (a call was still made) with completion left `null` (no
valid output text exists to estimate from). These are explicitly ballpark figures for a sense of
scale, not accurate enough for real cost decisions — real usage requires the HTTP rearchitecture
above, to be done once a paid API is actually wired in.

This was the third schema/table generation in one session (12 columns → +duration_ms → +3 token
estimate columns = 16 columns), each requiring a new Data Table since columns are immutable after
creation. The owner intentionally cleared the live table's contents partway through (confirmed
directly, not assumed) rather than carrying rows forward each time, so the current live table
(`candidate_canonical_events`, id `t0refxGmpVhvGllX`) starts empty. Two prior generations remain as
read-only archives if ever needed: `candidate_canonical_events_archived_2026-08-01`
(id `fRsfDUP1hgLvcIIu`, deleted by the owner) and `candidate_canonical_events_archived_2026-08-01_v2`
(id `GRq8A6HfwGyMTiqW`, still present but empty — owner cleared its rows before this rename).

## Prompt revision after low-recall diagnosis (2026-08-01)

The owner supplied the real article text used in the two live test runs above (an Al Jazeera piece
on a Russian missile crash in Poland) and asked why so few candidates were detected. A careful
manual read found roughly 10-11 genuinely distinct candidate events in that single article: the
core incident cluster (missile crash, NATO scramble, Russia's broader Ukraine barrage, statements
from Rutte/Tusk/Sybiha) plus four clearly separate historical/background events mentioned only in
passing (Romania's Monday drone incursion, Estonia/Latvia's May incursions and the resulting
government collapse, Poland's 2025 air-defense buildup, and the EU's "drone wall" discussion).

Comparing the two branches' actual output against this inventory showed two distinct causes, not
one:

- **Genuine model non-determinism**, already the theme of this whole prototype: gemma's AI Agent
  branch went from 4 candidates to 2 between the two runs on the identical input; qwen's
  Information Extractor branch went from 4 (one fabricated) to 1 (pure placeholder garbage) between
  runs.
- **A real, fixable prompt gap**: three of the four branches consistently defaulted to only the
  article's main/lead story and skipped every background/historical event, across both runs. Only
  qwen's AI Agent branch reliably reached past the lead paragraph, and even it missed the EU
  drone-wall mention in its first run. The shared system prompt said to identify "every distinct
  potential canonical event" but never told the model that background/historical mentions count,
  or what to do when unsure whether two occurrences are the same event.

Added two rules to the shared system prompt (used identically by all four branches, and by the
token-estimate length constants):

1. "Do not limit yourself to the article's main or lead event. Documents often mention other
   distinct events in passing for background or comparison, such as earlier incidents, other
   locations, past policy decisions, or reactions from other actors. Each of these is its own
   candidate if the text describes a specific occurrence, even briefly or in a single sentence."
2. "When unsure whether two mentioned occurrences are the same event or two different ones, prefer
   treating them as separate candidates rather than merging them."

Not yet verified live — the owner should re-run the same article (or a new one) and check whether
the three previously-sparse branches now catch more of the background events, versus whether the
gap was mostly non-determinism all along. Either result is informative: if recall improves broadly,
the prompt gap was real; if it stays inconsistent, that further isolates non-determinism as the
dominant factor, independent of prompt wording.

## Model swap: qwen replaced with Bonsai-27b (2026-08-01)

After three runs, qwen3.5-9b's Information Extractor branch never once produced a usable result
(fabricated content, then placeholder garbage, then an outright schema failure) — a consistent dead
end independent of prompt wording. Per the owner's request, both qwen branches (Information
Extractor and AI Agent) were removed entirely and replaced with an equivalent pair for
`prism-ml/bonsai-27b` (same "LM Studio Rumah" credential, same prompt, same schema, same node
structure), so the comparison is now **gemma-4-e4b vs bonsai-27b**, each still split across
Information Extractor and AI Agent. All previous test data and the interim archive tables were
deleted at the owner's request for a clean baseline; the live table (`candidate_canonical_events`,
current id `nyzRGW4IjjddBbro`) starts empty. Workflow re-validated clean at 21 nodes, 0 errors, 0
warnings, 29 valid connections.

## Evaluation of the pre-swap comparison (gemma vs qwen), for the record

Exact results across all three qwen-era runs against the same real article (Al Jazeera, Poland
missile incident, ~10-11 genuinely distinct events by manual read):

| Branch | `1359` | `1361` | `1363` (after prompt fix) |
|---|---|---|---|
| gemma / Information Extractor | 4 candidates | 7 | 7, 6/7 grounded (86%) |
| gemma / AI Agent | 4 | 2 | 9, 9/9 grounded (100%), all 4 background events |
| qwen / Information Extractor | 4 (1 fabricated) | 1 (placeholder garbage) | 0 — failed |
| qwen / AI Agent | 7 | 9 | 11, 5/11 grounded (45%), all 4 background events |

Recommendation given at the time: **gemma / AI Agent** was the best-performing pipeline of the
four — full background-event recall matching qwen/AI Agent, 100% quote-grounding (vs. qwen/AI
Agent's 45%, mostly from stripping markdown link syntax out of quotes rather than fabricating
content), and roughly 5x faster (66s vs. qwen/AI Agent's 326s). qwen/Information Extractor was
eliminated outright — 0% success across 3 independent runs. This recommendation was based on a
single clean run under the revised prompt and had not yet been confirmed for run-to-run stability
before the model swap superseded it.

## Second evaluation: gemma-4-e4b vs bonsai-27b (2026-08-01)

Tested against a second real article (BBC, Ukraine-Iran Caspian Sea strike — denser than the Poland
article, ~13-16 distinct real occurrences by manual read: the strike itself, five separate named
officials each making distinct statements, plus several background/historical items).

| Branch | Candidates | Grounded | Duration |
|---|---|---|---|
| gemma / Information Extractor | 4 | 4/4 (100%) | 19.7s |
| gemma / AI Agent | 7 | 7/7 (100%) | 49.7s |
| bonsai / Information Extractor | 2 | **0/2 (0%)** | 205.8s |
| bonsai / AI Agent | 4 | 4/4 (100%) | 307.5s |

**Notable finding:** bonsai's Information Extractor branch fabricated content entirely unrelated to
the article ("Study of Remote Collaboration," "Policy Impact Analysis") — schema-valid but
completely off-topic, the same failure category qwen's Information Extractor branch showed earlier
(different filler text, identical pattern: two unrelated models both producing ungrounded generic
content specifically on this node type). This is now a repeated signal that the Information
Extractor node itself may not pair reliably with every model, independent of which model.

**Bonsai-27b was worse than gemma-4-e4b on every measured axis on this document** — 10-16x slower
on both techniques, and its AI Agent branch found fewer real candidates (4 vs. gemma's 7) despite
taking 6x longer. Being a larger model did not translate into a better result here. This is a
single test, not proof, but a strongly negative first impression for bonsai-27b overall.

## Third comparison: gemma-4-e4b vs gemma-4-e4b Q8_0 (2026-08-01)

Bonsai-27b branches removed per the owner's request after the above result. Replaced with a second
gemma-4-e4b branch pair running the Q8_0 quantization (LM Studio model id `google/gemma-4-e4b:2`,
tagged `gemma-4-e4b-q8_0` in the harness fields) — same credential, prompt, and schema as the
existing plain `google/gemma-4-e4b` branch pair. This isolates quantization as the only variable
between the two model branches, a cleaner comparison than swapping to an entirely different model
family. Data Table reset to empty (`candidate_canonical_events`, current id `FBPcn6wCtARZYmdA`).
Workflow re-validated clean: 21 nodes, 0 errors, 0 warnings, 29 valid connections. Not yet tested
live.

## First production-candidate workflow: v1 (2026-08-01)

Fourth comparison (gemma-4-e4b plain vs Q8_0, same Caspian Sea article) gave gemma-4-e4b /
Information Extractor the best aggregate score of the four branches this run: fastest by a wide
margin (19.2s vs 50.2s-157.5s for the others) with 100% quote-grounding, at a real recall cost
(~50%, vs. gemma-q8/Information Extractor's ~71%). Full scores and reasoning recorded in that
session's evaluation.

The owner chose **gemma-4-e4b + Information Extractor** as the pipeline to use going forward "for
now", and asked for a duplicated, simplified workflow to carry that decision — not a full snapshot
of the 4-branch testing rig. Built as a new, separate n8n workflow:

**`Terra_Space_Event_detection_v1`** (id `D70nY3cYojJhVtgp`) — single path only: Chat Trigger →
Start Timer → `google/gemma-4-e4b` → Information Extractor (same prompt/schema as the winning
branch) → Prepare Candidates / Failure Row → Compute Evidence Offsets → insert into a new dedicated
table, `candidate_canonical_events_v1` (id `t8GGITb6YRIXw7MO`).

Schema simplified from the 16-column comparison table down to 11 columns: dropped `model_used` and
`extraction_method` (meaningless with a single path) and the three `estimated_*_tokens` columns
(those were explicitly rough A/B-comparison artifacts). Kept `run_id` and `duration_ms` since
they're still useful for monitoring one committed pipeline over time — everything else matches the
core candidate schema proposed earlier in this doc (still not formally confirmed as a locked
Decision). Validated clean: 8 nodes, 0 errors, 0 warnings, 8 valid connections.

The original 4-branch `Terra_Space_Event_detection` testing rig is untouched and still available
for future comparisons (more models, more quantizations) without disturbing this decided v1 path.
This is explicitly a **provisional** choice ("for now," the owner's words) — not yet promoted to a
formal architecture Decision, and still not wired into the production backend's Signal Parser
stage.

## Document intake added to v1: markdown upload with frontmatter (2026-08-01)

The owner's real test documents are Obsidian Web Clipper `.md` exports with YAML frontmatter
(`title`, `source`, `author` as a list, `published`, `created`, `description`, `tags` as a list)
followed by the article body. The owner asked for a process that saves those fields (plus a new
`content_full_text` field for the body) and sits **before** the `Start Timer` node in
`Terra_Space_Event_detection_v1` — replacing the manual chat-paste entry point entirely (owner's
explicit choice: "Replace it — remove the chat trigger"), with **manual per-file selection** rather
than automatic folder-watching (owner's explicit choice, no watch folder configured).

Built as three new nodes at the front of the workflow:

1. **Document Upload** (`n8n Form Trigger`) — a simple web form with one required file-upload
   field restricted to `.md`. Chosen over reading files directly from disk because n8n runs inside
   Docker; a form upload sends the file's bytes over HTTP regardless of where n8n's container
   lives, avoiding any host-filesystem/volume-mount dependency that a "Read File from Disk" node
   would need. No folder-watching, so the workflow does **not** need to be Active — the owner opens
   the workflow in n8n and clicks **Test Workflow** to get the upload form each time.
2. **Parse Document** (Code node) — reads the uploaded file's binary content as UTF-8 text, splits
   the `---`-delimited YAML frontmatter from the body, and parses the seven known frontmatter
   fields with a small hand-written parser (not a general YAML library — the frontmatter shape is
   fixed and simple, so a targeted regex-based parser is the more transparent, dependency-free
   choice). Strips Obsidian `[[wiki-link]]` brackets from author names. Outputs `title`, `source`,
   `author` (JSON-encoded array), `published`, `created`, `description`, `tags` (JSON-encoded
   array), `content_full_text` (the body), and `chatInput` (= `content_full_text`, kept only so the
   unchanged downstream Information Extractor node — which reads `$json.chatInput` — needs no
   modification).
3. **Save Document** (Data Table insert) — writes the parsed fields into a new table,
   `documents_v1` (id `LO0ms6r66gSKtjXv`), 8 columns matching the request exactly (no extra
   bookkeeping fields beyond what was asked; Data Tables already auto-add `id`/`createdAt`/`updatedAt`
   per row).

`Start Timer`'s code was changed to pull the document fields explicitly from `$('Parse Document')`
rather than blindly spreading whatever the immediately-preceding node outputs — this avoids any
fragile assumption about exactly what the Data Table insert node passes through on its own output.
`Prepare Candidates` and `Failure Row` were updated to reference `$('Start Timer')` instead of the
now-removed chat trigger node. Workflow re-validated clean: 10 nodes, 0 errors, 0 warnings, 10 valid
connections. Not yet tested live with a real upload.

## Process only unprocessed documents: intake/processing split (2026-08-03)

The v1 workflow previously did everything in one push: an upload immediately cascaded into
extraction. The owner asked to re-evaluate the whole workflow so that extraction only ever runs
against **News Article Clipping** rows that don't already have a successful result in
**candidate_canonical_events_v1** — and to make the processing step re-runnable on its own,
independent of uploading.

**Retry semantics (owner's explicit choice):** a document counts as "processed" only if it has at
least one candidate row whose `classification` is **not** `EXTRACTION_FAILED`. A document whose
only attempt(s) failed stays eligible and is retried on the next processing run — this matches
everything observed all session about local-model non-determinism (the same document has flipped
between success and failure across identical re-runs repeatedly, so a failure is noise, not a real
result).

**Redesign, same workflow, two independent entry points:**

- **Document Upload → Parse Document → Save Document** — unchanged, but now stops at Save Document.
  Uploading no longer cascades into extraction.
- **Process Pending Documents** (new Manual Trigger) → **Get All Documents** (News Article
  Clipping, get all rows) → **Get Existing Candidates** (candidate_canonical_events_v1, get all
  rows) → **Filter Unprocessed Documents** (Code node: builds the set of document IDs with at least
  one non-`EXTRACTION_FAILED` row, filters News Article Clipping rows not in that set) →
  **Loop Over Items** (`Split In Batches`, size 1 — the standard n8n pattern for running a
  sub-chain once per item without depending on `pairedItem` correlation through nodes like
  Information Extractor that don't reliably preserve it) → the existing extraction sub-chain
  (Start Timer → OpenAI Chat Model → Information Extractor → Prepare Candidates/Failure Row →
  Compute Evidence Offsets → Insert Candidate Row) → loops back into Loop Over Items to advance to
  the next unprocessed document.

**Schema change:** `candidate_canonical_events_v1` recreated (it was still empty, so this was a
plain recreate, not a migration) with a new `document_id` (number) column — the source News Article
Clipping row's own `id`, the link between a candidate and the document it came from. New table id
`mK4cwIZl1FowKunO` (old id `t8GGITb6YRIXw7MO` deleted).

**Node changes to support looping per-document rather than a single fixed document:**
`Start Timer` now reads from its own immediate input (`$input.first().json`, i.e. whatever the Loop
node hands it) instead of `$('Parse Document')`, since Parse Document is only in the intake path
now, not upstream of the processing path. `Prepare Candidates` and `Failure Row` now also read and
emit `document_id` from `$('Start Timer')`, same established cross-reference pattern used for
`source_text`/`duration_ms`. `Insert Candidate Row` maps the new `document_id` column and points at
the recreated table.

Workflow re-validated clean under both `runtime` and `strict` profiles: 15 nodes (2 trigger nodes),
0 errors; strict mode's 7 warnings are generic style advisories (code nodes can theoretically
throw; one empty unused `options` object), not functional issues.

**Not yet tested live.** Verification plan: upload one document, run Process Pending Documents,
confirm it's processed and tagged with the right `document_id`; run Process Pending Documents again
with nothing new uploaded and confirm **zero** new candidate rows are inserted (the core
correctness check); upload a second document and confirm only the new one gets processed on the
next run.

## Intake switched to a direct-entry Form; cleanup step added (2026-08-04)

The owner changed their mind on the intake method: instead of uploading a pre-formatted `.md` file
to be auto-parsed, `Document Upload` and `Parse Document` were replaced with a single
**Document Entry Form** (Form Trigger) whose 8 fields map 1:1 to `News Article Clipping`'s columns
(Title, Source URL, Author(s), Published date, Created/clipped date, Description, Tags, Full
article text) — text/date/textarea fields, filled in by hand. `author`/`tags` are now stored as
plain comma-separated text rather than JSON-encoded arrays, since a human typing into a form
doesn't naturally produce JSON syntax. Field names match the table's columns exactly, so
`Save Document`'s existing column mapping needed no changes.

The owner then asked (with a real messy example — full Al Jazeera markdown clip, images, inline
markdown links, escaped brackets, ad/newsletter boilerplate lines) whether the pasted text could be
tidied before saving. Added a **Clean Article Text** Code node between the form and Save Document:

- Strips markdown image syntax (an exclamation mark, bracketed alt text, then a parenthesized URL)
  entirely.
- Converts markdown links (bracketed text followed directly by a parenthesized URL) to plain text,
  dropping the URL.
- Un-escapes backslash-escaped brackets (`\[AFP\]` → `[AFP]`).
- Drops known boilerplate lines (a standalone `Advertisement` line, and the recurring "Get instant
  alerts and updates based on your interests..." newsletter prompt) — targeted at the exact
  patterns observed in the owner's real clippings, not a general-purpose ad-stripper.
- Collapses 3+ consecutive blank lines to one.
- Strips wiki-link brackets (`[[Author Name]]`) from `author`, in case it's pasted straight from
  frontmatter out of habit.
- Normalizes `author`/`tags` comma-separated lists (trims each entry, drops empties).
- Strips query-string tracking params (`?utm_source=...&_bhlid=...`) from `source` (owner
  confirmed: yes, strip them).

Applied to `description` and `content_full_text`. This isn't just cosmetic: several
`quote_grounded: false` results in earlier evaluations were caused by models naturally quoting
clean prose that didn't exact-match the markdown-cluttered stored text (dropped a markdown link's
bracketed text down to plain text, or omitted embedded URLs) — cleaning the stored text at intake should reduce that
specific failure mode for future extraction runs, not just make the table more readable.

Workflow re-validated clean: 15 nodes, 2 triggers, 0 errors, 0 warnings, 14 connections. Not yet
tested live with the new form + cleanup step.

## Stable document_uuid replaces the auto-increment id as the tracking key (2026-08-04)

The owner asked for `News Article Clipping` to carry a UUID so documents can be traced from
**other** future workflows, not just this one. This also fixes a latent fragility: `document_id`
(added earlier this session to link candidate rows back to their source document) stored the Data
Table's own auto-increment `id` — a plain sequential number that **resets every time a table is
recreated**, which has already happened repeatedly this session for schema changes. A UUID
generated once at intake and stored as real row data survives any future table rebuild; an
auto-increment id does not.

Both tables were recreated (again) with the new column, this time carrying real data forward: the
owner's one successful test row (NATO/Poland article, previously `id: 1`) was preserved and
back-filled with a freshly generated UUID rather than lost. `candidate_canonical_events_v1` was
still empty, so no data to preserve there. New table ids: `News Article Clipping` →
`i8L6e1fDfGXx4Z4t` (was `LO0ms6r66gSKtjXv`), `candidate_canonical_events_v1` → `SROocbrHK5rnImYd`
(was `mK4cwIZl1FowKunO`). The `document_id` (number) column is gone; replaced everywhere by
`document_uuid` (string) for consistent naming — `News Article Clipping` now has 9 columns,
`candidate_canonical_events_v1` still has 12 (renamed, not added).

**UUID generation:** added directly in `Clean Article Text` (one new field on its existing output,
no new node) using a hand-written RFC4122-v4-shaped generator based on `Math.random()`, deliberately
avoiding `crypto.randomUUID()` — that WHATWG global's availability depends on the exact Node.js
version n8n's Docker image runs, which isn't something to assume. Since this is only a trace ID
(not a security token), cryptographic randomness isn't needed, so the portable, dependency-free
approach was preferred over an uncertain runtime API.

**Every node that referenced the old numeric key now uses `document_uuid` instead:**
`Filter Unprocessed Documents` (set-difference key), `Prepare Candidates`/`Failure Row` (read from
`$('Start Timer')`, same established pattern), `Insert Candidate Row` (column mapping). Workflow
re-validated clean: 15 nodes, 2 triggers, 0 errors, 0 warnings, 15 valid connections.

## Out of scope for this stage

- Normalization, deduplication, or merging into a canonical event.
- Any change to the production `terra-space.db` schema or the Python backend.
- Pulling real documents automatically from Terra Space's own database (test input is pasted
  manually for now).
- A decision on whether/how this replaces the backend's Signal Parser stage — revisit only after
  the prototype has been run against real documents and the owner has reviewed the results.

## Build tasks

1. Extend the existing `Terra_Space_Event_detection` n8n workflow (id `st4YuDeljYyIuIWU`) with the
   four-branch structure above, reusing its existing Chat Trigger and gemma Chat Model node.
2. Create the Data Table with the schema above.
3. Add the second `OpenAI Chat Model` node for `qwen/qwen3.5-9b` (same credential).
4. Add both `Information Extractor` nodes (schema from above, `fromJson`/manual schema mode).
5. Add both `AI Agent` + `Structured Output Parser` node pairs (same schema).
6. Add the Merge node(s) to combine all four branches into one stream.
7. Add the Code node that computes `evidence_start`/`evidence_end`/`quote_grounded` deterministically.
8. Wire the Data Table insert node.
9. Test end to end by pasting a real document's text (e.g. the earthquake example, and one of the
   owner's real Terra Space documents) into the chat tester; confirm four tagged rows per candidate
   appear in the Data Table with sensible values.
10. Record the outcome in [Current Status](../Current-Status.md).

## Navigation

- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
- [Feedback Backlog](../Feedback-Backlog.md)
- [Staged Event Detection Pipeline](../decisions/Staged-Event-Detection-Pipeline.md)
- [Project Knowledge](../Project-knowledge-Index.md)
