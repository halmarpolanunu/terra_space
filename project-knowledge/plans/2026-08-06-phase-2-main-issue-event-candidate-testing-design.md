---
type: Design Specification
title: "Phase 2 Main-Issue and Event-Candidate Testing Design"
description: "Approved Phase 2 design for a two-stage n8n workflow that stores grounded main issues and provisional event candidates in a separate Supabase table."
tags: [project-knowledge, phase-2, n8n, supabase, event-detection, testing]
status: planned
okf_version: "0.1"
---

# Phase 2 Main-Issue and Event-Candidate Testing Design

## Purpose

Test the reliability of a local n8n workflow that reads a Phase 1 cleaned news article, identifies
its main issue first, then detects provisional event candidates related to that verified issue.
This is a testing workflow. It does not modify the Phase 1 news record and does not yet change the
production Terra Space backend.

## Scope and fixed choices

- Use one local model only: `google/gemma-4-12b-qat`.
- Process the whole `p1_clean_content_text` for the first reliability tests. Text chunking is
  deferred unless tests show a concrete need, such as timeouts, incomplete output, or missed
  events near the end of long articles.
- Start each run manually from an n8n test form by pasting one `p1_uuid`.
- Re-running the same article replaces its previous test result. No test-run history is kept.
- Detect and ground one main issue before attempting event-candidate detection.
- Treat candidate detection, normalization, duplicate matching, merging, review, and approval as
  separate later concerns. This stage produces source-grounded provisional candidates only.

## Data storage

Create a separate Supabase table named `public.terra_space_event_candidates`.
It connects to Phase 1 through `p1_news_uuid`, which matches `terra_space_news_v2.p1_uuid`.
The Phase 1 table remains unchanged while this candidate structure is being tested.

The candidate-result table should include:

| Field | Purpose |
|---|---|
| `id` | Internal row identifier. |
| `p1_news_uuid` | The Phase 1 article being tested; unique so a re-run replaces its row. |
| `main_issue_status` | `MAIN_ISSUE_FOUND`, `NO_MAIN_ISSUE`, or `FAILED`. |
| `main_issue` | JSONB object with the grounded main issue. |
| `event_detection_status` | `EVENT_CANDIDATES_FOUND`, `NO_EVENT_CANDIDATE`, `NOT_RUN`, or `FAILED`. |
| `event_candidates` | JSONB array of grounded provisional candidates. |
| `model_name` | Records `google/gemma-4-12b-qat`. |
| `prompt_version` | Identifies the prompt used for a reliability result. |
| `main_issue_raw_output` | Raw text returned by the first model call. |
| `event_detection_raw_output` | Raw text returned by the second model call. |
| `error_message` | Plain-language failure detail when a stage fails. |
| `processed_at` | Time processing finished. |
| `created_at` and `updated_at` | Audit timestamps. |

### Main-issue JSONB structure

```json
{
  "label": "Earthquake in Kabupaten X",
  "summary": "An earthquake affected Kabupaten X and prompted an emergency response.",
  "evidence_quote": "Terjadi gempa bumi di Kabupaten X...",
  "evidence_start": 0,
  "evidence_end": 45,
  "quote_grounded": true
}
```

### Event-candidates JSONB structure

```json
[
  {
    "working_title": "Earthquake in Kabupaten X",
    "classification": "ENTITY_CENTRED_CHANGE",
    "phenomenon": "earthquake",
    "entities": ["Kabupaten X"],
    "evidence_quote": "Terjadi gempa bumi di Kabupaten X.",
    "evidence_start": 0,
    "evidence_end": 36,
    "quote_grounded": true
  }
]
```

## Workflow

```text
n8n test form: paste p1_uuid
        -> Fetch the article's p1_clean_content_text from Supabase
        -> Gemma call 1: detect the main issue
        -> Deterministically validate the issue quote and calculate offsets
        -> Gemma call 2: detect candidate events using the verified main issue
        -> Deterministically validate candidate quotes and calculate offsets
        -> Upsert the one matching test-table row by p1_news_uuid
```

The first model call must produce a source-grounded main issue. The second call receives the
verified issue and the original cleaned article. Exact character positions are calculated by n8n,
not supplied by the model.

## Status rules

- A grounded main issue and one or more grounded candidates results in
  `EVENT_CANDIDATES_FOUND`.
- A grounded main issue but no usable candidate results in `NO_EVENT_CANDIDATE` and an empty
  `event_candidates` array.
- No grounded main issue results in `NO_MAIN_ISSUE`; candidate detection does not run and its
  status is `NOT_RUN`.
- An unavailable model, malformed response, or other stage failure records `FAILED`, preserves
  available raw output, and records an `error_message`.
- Only candidates with an exact evidence quote present in `p1_clean_content_text` enter the
  `event_candidates` array.

## Why this design

The separate test table isolates experimental AI output from stable Phase 1 news data. The
main-issue-first sequence helps the model distinguish an article's central subject from background
context before it identifies potential events. Raw outputs, prompt version, and explicit statuses
make reliability problems visible instead of silently turning them into incomplete data.

When the output format and workflow are proven reliable, replace this testing representation with
a durable `terra_space_event_candidates` table that stores one candidate per row and links it to
the Phase 1 article.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [n8n Candidate Canonical Event Detection Prototype](2026-08-01-n8n-candidate-canonical-event-prototype.md)
- [Staged Event Detection Pipeline](../decisions/Staged-Event-Detection-Pipeline.md)
