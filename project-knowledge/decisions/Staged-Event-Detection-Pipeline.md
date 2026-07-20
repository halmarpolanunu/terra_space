---
type: Decision
title: "Staged Event Detection Pipeline"
description: "Replaces the single LM Studio extraction call with a staged pipeline: one Signal Parser call, then four narrow per-candidate classifier calls, then the existing deterministic resolution — plus ISO alpha-3 country codes, actor alias management, and a per-stage extraction log."
tags: [project-knowledge, decision, event-detection, extraction, lm-studio]
status: active
---

# Context

Terra Sense currently turns a document into draft events with **one** LM Studio call that must
produce everything at once: every event's title, summary, event type, date, epistemic status,
locations, and actors, in one structured JSON response. Live experience shows this is fragile with
the local model (`qwen/qwen3.5-9b`):

- On 2026-07-20, roughly 8 calls against the same real document produced zero locations in every
  completed trial, or failed schema validation outright — while the same document had produced
  usable locations on 2026-07-18. A controlled A/B test disproved prompt length as the cause. See
  the [Feedback Backlog](../Feedback-Backlog.md) entry "Event locations do not reliably reach the
  Dashboard globe".
- When an attribute silently comes back empty or gets dropped by a grounding check, nothing records
  why. `PersistResult.dropped_locations` exists in code but is never logged or surfaced, so "the
  model said nothing" and "the model said something ungrounded that was silently discarded" are
  indistinguishable.
- One bad field (for example an `event_date` without its required precision) fails schema validation
  for the whole document, losing every other correctly extracted fact.

The owner shared a staged "SMC" (Signal, Mechanism, Context) detection framework of their own
design — a Signal Parser that first splits one full text into signal candidates, then classifiers
that each resolve one narrow aspect per candidate — and asked for a redesign of event detection in
this direction. The owner explicitly chose **not** to build Mechanism and Context classification
now.

# Decision

Replace the single extraction call with a three-stage pipeline. All AI calls remain local LM Studio
calls; all North Star rules (human review, closed taxonomy, never invent facts, blank over guess)
are unchanged.

## Stage 1 — Signal Parser (one LM Studio call per document)

Input: document title, Publication Date, and full content (as today). Its only task: split the text
into **signal candidates** — distinct observable occurrences — each with a working title, summary,
epistemic status, and a **verbatim evidence quote**. Deterministic code immediately validates each
quote against the document (existing `quote_found` helper); candidates that fail are dropped **and
recorded in the extraction log**. If this call fails, the document fails and stays retryable,
exactly like today's failure handling.

## Stage 2 — four narrow classifier calls per candidate

Each classifier is its own small LM Studio call, receives the full document text plus that
candidate's evidence quote and summary (preserving the "contextual consistency" link in the owner's
framework), and does exactly one job:

1. **Event Type** — pick one active Event Taxonomy leaf by exact name, or null. The closed-taxonomy
   rules from [Closed Event Type Taxonomy](Closed-Event-Type-Taxonomy.md) and
   [Event Taxonomy Tree and Management](Event-Taxonomy-Tree-and-Management.md) are unchanged.
2. **Event Date** — the event date plus precision, or null. Publication Date stays context only.
3. **Locations** — a list of `{country, admin1, city_regency}`, or empty. Country now uses
   **ISO 3166-1 alpha-3** codes (for example `IRN`, `IDN`, `USA`), replacing alpha-2.
4. **Actors** — one call returning two separate lists: `source_actors` (who initiated or executed
   the signal) and `recipient_actors` (who it was directed at or who was affected), matching the
   owner's Source/Recipient Actor definitions.

A failed attribute call does **not** fail the document: the draft event is still saved with that
attribute blank plus a visible "extraction incomplete" flag for review. Blank over guess.

Mechanism and Context classification are **not built**; the pipeline is shaped so either can later
be added as an additional Stage 2 classifier without restructuring.

## Stage 3 — deterministic resolution and persistence (existing code, reused)

- **Tiered gazetteer resolution** (existing behavior, kept): try city, then admin1, then country
  centroid; store the precision that matched. The gazetteer asset and its lookup keys are
  regenerated for alpha-3 codes; the tiering rules of
  [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md) stay as they are,
  with that decision amended for the alpha-3 key format at implementation time.
- **Actor lookup with aliases (new):** each extracted name is matched case-insensitively against
  existing actors' canonical names **and their owner-managed aliases**. A match links the event to
  the existing actor; no match creates an inactive suggested actor awaiting the owner, as today.
  Aliases are owner-managed data (for example "US" and "United States" as aliases of one actor);
  the AI receives only canonical names and never manages aliases itself. This requires a first
  actor-management surface in Terra Sense (list actors, edit aliases, activate/deactivate).
- **Grounding checks, duplicate detection, draft review flow:** unchanged.

## Cross-cutting changes

- **Per-stage extraction log (new):** every call records what was asked, what came back, and what
  was dropped with its reason, per document and per candidate, surfaced in Terra Sense. This closes
  the observability gap that made the location failures undiagnosable.
- **ISO alpha-3 migration:** extraction schema, prompts, gazetteer keys, country validation, and a
  data migration converting stored alpha-2 `Location.country` values to alpha-3.
- **Timeout semantics:** the configurable processing timeout applies **per call** instead of per
  document, since one document is now `1 + 4 × candidates` calls (about 17 calls for a 4-candidate
  document).

# Alternatives considered

- **Keep one call, strengthen the prompt further.** Rejected: two days of live trials showed the
  single overloaded call failing in three different ways on the same document, and the prompt-length
  A/B test proved shortening does not help.
- **Five classifiers (separate Source Actor and Recipient Actor calls).** Considered and offered;
  the owner chose merging both actor lists into one call (~20% fewer calls, still a narrow task).
- **Adopt the full SMC framework now, including Mechanism and Context codebooks.** Deferred by the
  owner; the design keeps a slot so either can be added as one more classifier later.
- **Keep ISO alpha-2 country codes.** The owner explicitly chose alpha-3.
- **Keep exact-name-only actor matching.** The owner chose alias management now, accepting the
  larger implementation scope.

# Reasons

- Small local models are markedly more reliable when each call has one narrow task; the current
  design makes location extraction compete with six other jobs in a single output, and location is
  the attribute with repeated, documented total failures.
- Per-attribute isolation makes failures small and diagnosable: one bad date no longer destroys a
  whole document's extraction, and the per-stage log finally shows where a fact was lost.
- The staged shape matches the owner's own SMC analytical framework while deferring the parts the
  owner does not want yet, and it leaves clean extension points.
- Everything stays local-first and human-approved, per the [North Star](../North-Star.md).

# Consequences

- **Positive:** higher per-attribute reliability odds; partial results instead of all-or-nothing
  failures; a real diagnostic trail; actor identities consolidate under aliases instead of
  accumulating near-duplicates; groundwork for future Mechanism/Context classification.
- **Costs:** processing a document becomes many LM Studio calls (slower batches, acceptable since
  batches already run in the background); the gazetteer must be regenerated and existing location
  rows migrated to alpha-3; new storage for aliases and extraction logs; a new actor-management UI;
  substantial changes to `lm_studio.py`, `extraction.py`, and their tests.
- **Open risk, unchanged by this decision:** the paused LM-Studio-side investigation (possible
  model/config drift between 2026-07-18 and 2026-07-20) remains open; the extraction log will make
  that investigation easier but does not replace it.
- **Follow-up work:** an implementation plan in `project-knowledge/plans/` before any code; an
  amendment note in [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md)
  when alpha-3 lands; resolution of the related Feedback Backlog entry when verified live.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
