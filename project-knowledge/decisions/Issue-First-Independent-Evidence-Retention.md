---
type: Decision
title: Issue-first Independent Evidence Retention
description: Keeps a grounded Issue and Event when only an optional relationship lacks complete explicit evidence.
tags: [project-knowledge, decision, issue-first, evidence]
status: active
---

# Context

After the 24-source Issue-first rebuild, all 13 withheld sources had a valid main-Issue quote.
They were withheld because one optional Event quote or relationship endpoint failed a strict
grounding test. The former all-or-nothing recorder behavior therefore hid otherwise grounded
article-level analysis and Events, despite relationships and arcs being optional.

# Decision

Issue-first keeps each layer of evidence independent:

- The main Issue must still have a valid label, summary, and exact source evidence quote.
- An Event is retained only when its own title and exact source evidence quote are valid.
- A relationship is retained only when its own exact quote, both actor names, both canonical
  country/ISO pairs, and every supplied location word are explicitly present and valid.
- If an optional Event or relationship fails, the pipeline drops that component only. It never
  rewrites, expands, maps, or guesses a fact.
- The guarded database recorder remains the final validation authority, and all correction stays
  pipeline-only followed by source reprocessing.

The active n8n implementation is `issue-first-v3`: its prompt states the optional relationship
rule, its read-only country-reference lookup checks exact country/ISO pairs, and its normalizer
filters invalid optional components before the recorder.

# Alternatives considered

- **Keep all-or-nothing validation for the complete response.** Rejected because one unsupported
  optional relationship suppresses a separately grounded Issue and Event.
- **Allow manual review or correction of Issue/Event records.** Rejected by the
  [Pipeline-Only Data Correction](Pipeline-Only-Data-Correction.md) decision.
- **Relax quote, actor, country, or location validation.** Rejected because it would lower the
  no-inference evidence standard.
- **Infer country aliases or repair malformed model output.** Rejected because the pipeline may
  only use wording explicitly present in the source and the checked-in country reference.

# Reasons

This preserves the same standard of proof for every published fact while matching the product
rule that relationships and map arcs are optional. It retains useful evidence-backed Events
without creating a route for plausible-but-unsupported locations, actors, or country codes.

# Consequences

- The 13 affected sources were reprocessed sequentially through Issue-first only after the n8n
  workflow passed runtime validation with 0 errors and 0 warnings.
- All 24 sources now have a latest successful Issue-first run, producing 24 valid Issues, 114
  valid Issue Events, and 5 complete evidence-backed relationships.
- Historical failed and offline-model runs remain append-only diagnostic history; no source,
  Event, Issue, or workflow output was reset or manually edited.
- The web application runtime was not running during this work, so port 3000 could not be used
  for an API check. The local Supabase read projections supplied the final result counts.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Pipeline-Only Data Correction](Pipeline-Only-Data-Correction.md)
- [Project Knowledge](../Project-knowledge-Index.md)
