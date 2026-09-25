---
type: Decision
title: Phase 2 Main Issue Led Terra Insight
description: Makes current Phase 2 Main Issues the entry point to Home and Explore, with source-linked Phase 5 events as the next layer of evidence.
tags: [project-knowledge, decision, design, issues, terra-insight]
status: active
---

# Context

The [guided command center redesign](Terra-Space-Guided-Command-Center-Redesign.md) made Phase 5
events the default story. After reviewing Home and Explore, the owner changed direction and
approved Phase 2 Main Issue as the main pillar of Terra Space's story. This is the current Phase 2
pipeline, not the separate earlier [Issue-first experience](../plans/2026-08-15-issue-first-terra-insight-design.md).

A read-only check of the local API on 2026-09-24 found 50 Phase 2 Main Issues and 109 Phase 5
events. All 109 events linked to one of those Issues by their Phase 1 source ID. The 50 Issues
all had at least one linked event. These counts describe the local dataset at that moment, not
a permanent completeness guarantee.

# Decision

- Home opens with a selected Phase 2 Main Issue, its source, and the events and locations linked
  to that source. The broader charts clearly state when they count events across all Issues.
- Explore begins with a searchable Main Issue list. Selecting one reveals its source-grounded
  summary and evidence quote, then filters the Phase 5 map, timeline, and event index to that
  Issue. An explicitly labeled all-Issues view preserves cross-source exploration.
- The link is the existing Phase 1 source ID. The interface does not infer a relationship from
  similar text or automatically merge Issues across articles.
- Phase 5 `FINAL` and `NOT_FINAL` remain visibly distinct. Missing event dates and unresolved
  Event Geography remain visible as missing information.
- The earlier Issues, Events, and Dashboard routes were subsequently removed by
  [Retire Earlier Insight Screens](Retire-Earlier-Insight-Screens.md). Data corrections remain
  in the pipeline under [Pipeline-Only Data Correction](Pipeline-Only-Data-Correction.md).

# Alternatives considered

- Keep events as the first screen and present Issues as a secondary section.
- Merge similar Issue labels from different source articles into one topic.

# Reasons

An Issue gives the user a clear starting question. The source ID already provides a traceable
route from that Issue to Phase 5 events and source evidence. Keeping article-level Issues separate
preserves provenance and avoids implying an unverified cross-source synthesis.

# Consequences

The [North Star](../North-Star.md) now describes Issue-led analysis. The earlier event-led Home
and Explore parts of the guided command center decision are superseded by this decision; its
four destinations, visual identity, and cinematic interaction direction remain active. Future
cross-source themes would need their own evidence and design decision.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
