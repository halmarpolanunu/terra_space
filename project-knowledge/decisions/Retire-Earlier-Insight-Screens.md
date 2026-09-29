---
type: Decision
title: Retire Earlier Insight Screens
description: Removes the old Issues, Events, and Dashboard interfaces so Home and Explore are the only Terra Insight entry points.
tags: [project-knowledge, decision, design, terra-insight]
status: active
---

# Context

The current Phase 2 Main Issue experience now lives in Home and Explore. The earlier
`/issues`, `/events`, and `/dashboard` interfaces describe a different data path and remain
visible as links beside the new Explore view. The owner asked to remove that earlier version
and explicitly approved updating the North Star. The owner limited removal to these three
UI screens; existing data and processing remain.

# Decision

- Home and Explore are the Terra Insight entry points. The old `/issues`, `/events`, and
  `/dashboard` page routes, their page-specific components, and links to them are removed.
- The shared event globe remains available to Explore and Prepare as a component outside the
  retired Dashboard folder.
- Source documents return to Sources. Prepare links to current Main Issues through Explore;
  the older Sense overview links to Home.
- Supabase records, backend APIs, n8n workflows, and the Phase 1–5 pipeline are retained.
  Removing these screens does not delete or rewrite historical records.

# Alternatives considered

- Keep the old pages but hide their links. This would leave an unsupported second interface
  accessible by URL and keep its code in the project.
- Redirect old URLs to Explore. This would preserve stale query parameters and imply that the
  old and current data paths are interchangeable.

# Reasons

One clear Home-to-Explore path makes the source-grounded Main Issue story easier to understand.
Removing obsolete pages also prevents users from reaching a parallel UI with different Issue
and event definitions.

# Consequences

Bookmarks to the three retired routes no longer open those screens. Existing records and
processing remain intact. The owner will review the revised Issue layout and navigation in
the local app and pull request.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
