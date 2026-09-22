---
type: Decision
title: Phase 2 Review-Flagged Results
description: Phase 2 retains evidence-grounded proposals that need review and continues processing all sources.
tags: [project-knowledge, decision]
status: active
---

# Context

The owner needs every processed article to retain useful Phase 2 fields in Terra Space without
requiring a one-by-one check. The earlier design discarded the proposed fields whenever the
safeguard rejected them, which made the data incomplete.

# Decision

`NEEDS_REVIEW` is a simple review flag, not a pipeline stop. Every completed Phase 2 attempt keeps
an Issue title, description, and quote. When evidence or a safeguard is uncertain, the same fields
are retained with a clear reason for review. The pipeline continues with the next article. `VALID`
remains the label for an accepted result.

# Alternatives considered

- Discard every safeguard-rejected proposal.
- Add separate review tables, queues, and status vocabularies.

# Reasons

The chosen approach preserves complete useful data while keeping one clear safety signal. It avoids
extra tables and workflow branches, and downstream stages can use all records while recognizing
which ones require later review.

# Consequences

The current Phase 2 tables require every `NEEDS_REVIEW` result to retain its proposed fields. The
workflow must preserve them on every uncertain or technical model outcome so one error does not
stop the batch or leave an empty Issue row.

Before assigning `NEEDS_REVIEW`, the workflow may make at most two automatic correction attempts
for repairable evidence problems. Accepted evidence is stored as the exact source slice from the
cleaned Phase 1 article, including its original spacing and punctuation. A result that still lacks
support after the bounded repair remains `NEEDS_REVIEW`; the workflow must not invent missing facts
or force it to `VALID`.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
