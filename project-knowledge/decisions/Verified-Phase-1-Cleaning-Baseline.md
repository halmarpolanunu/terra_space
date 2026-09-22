---
type: Decision
title: Verified Phase 1 Cleaning Baseline
description: Lock the owner-verified local Phase 1 article-cleaning workflow as the baseline for future changes.
tags: [project-knowledge, decision, n8n, phase-1, baseline]
status: active
---

# Context

After the field-mapping correction, the owner ran the local **Terra Space - Process All Saved
Articles** workflow against 29 queued sources (sequences 46–74). A read-only review compared every
saved cleaned article with its raw source text.

All 29 sources finished with non-empty cleaned text. No saved article contained an accidental LM
Studio reply. Every article retained its main reporting sections; where a section was removed, it
was limited to one clear non-article section such as a photo caption, image credit, or live-coverage
notice. The four most shortened articles were individually checked and passed this same review.

# Decision

The verified Phase 1 cleaner is the approved baseline:

- The owner starts **Terra Space - Process All Saved Articles** manually in n8n and runs only one
  processor execution at a time.
- The workflow fetches queued or failed sources, processes one source at a time, and maps
  `raw_content_text` into the cleaner's internal input field.
- Deterministic removal is limited to clearly non-article material. The local LM Studio response is
  saved only when its paragraphs remain faithful to the deterministically cleaned source.
- If the model removes, rewrites, or adds content, the workflow safely stores the deterministic
  version instead and preserves the model response and reason in the append-only processing history.
- Empty cleaned text must never be marked `completed`; it follows the failed/retry path.

Do not change this baseline without owner approval and a new read-only comparison against raw and
cleaned source text.

# Alternatives considered

- Continue changing the cleaner based only on execution-success labels or text length.
- Accept local-model rewrites even when they cannot be verified against the article.
- Remove the fallback and save a failed model response as the article text.

# Reasons

The baseline protects the most important Phase 1 property: Terra Space must keep the actual news
reporting and must not turn an AI error into a trusted source record. It is proven on real owner
articles, stays local, and supports the North Star's requirement that AI does not invent facts.

# Consequences

- The current workflow is the normal, trusted way to clean newly queued Phase 1 articles.
- A successful n8n execution alone is not enough evidence for future cleaner changes; compare the
  saved output with source text before replacing this baseline.
- Future improvements may be proposed, but they must preserve the non-empty gate, fidelity guard,
  and append-only run history unless the owner explicitly approves a different safety design.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Separated Manual Intake and Deferred Queue Processing](Separated-Manual-Intake-and-Deferred-Queue-Processing.md)
- [Project Knowledge](../Project-knowledge-Index.md)
