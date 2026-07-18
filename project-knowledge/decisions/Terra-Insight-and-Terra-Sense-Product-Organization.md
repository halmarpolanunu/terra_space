---
type: Decision
title: Terra Insight and Terra Sense Product Organization
description: Organizes Terra Space into an analysis workspace and a separate data-sense workflow while keeping both local-first and under one product.
tags: [project-knowledge, decision, product-organization]
status: active
---

# Context

The implemented MVP currently presents document input, AI processing, event review, approved
events, and dashboard views as peer-level areas of one Terra Space application. The owner clarified
that Terra Space should primarily be where trusted data is presented and analysed, while the
collection and preparation of that data should have its own clearly visible workflow.

# Decision

Terra Space remains the single local-first product, organized into two major workspaces:

- **Terra Insight** is the analysis workspace. It presents approved, traceable events through the
  dashboard, map, timeline, event explorer, filters, and future analysis tools.
- **Terra Sense** is the data workflow workspace. It receives source material, normalizes it,
  processes it with local AI, shows pipeline status, detects possible duplicates, and contains
  Event Review before an event becomes available to Terra Insight.

The intended information flow is:

```text
Sources -> Terra Sense -> Event Review -> approved event database -> Terra Insight
```

This is a product and information-architecture direction, not a decision to split the current MVP
into separate deployed applications. Both workspaces continue to share local storage and use LM
Studio as the only MVP AI path.

# Alternatives considered

- Keep all current areas as unrelated peer-level menu items, with no distinction between data
  preparation and data analysis.
- Make Terra Sense an entirely separate application now.
- Keep Event Review in the analysis workspace.

# Reasons

- It gives each workspace one simple job: Terra Sense prepares trustworthy data; Terra Insight
  helps the owner understand that data.
- Review is part of validating AI output, so it belongs beside the processing pipeline rather than
  beside presentation and analysis.
- Keeping one local product avoids premature operational complexity while leaving room for Terra
  Sense to serve other products in the future.

# Consequences

- Future navigation and screen design should group Dashboard, Map, Timeline, Events, and analysis
  features under Terra Insight; sources, pipeline visibility, processing status, and Event Review
  should group under Terra Sense.
- A future Terra Sense screen may use a clear, node-and-connection pipeline visualization inspired
  by workflow tools, initially for visibility and inspection rather than free-form workflow editing.
- Automatic ingestion from news, social media, websites, or APIs remains outside the MVP. Until
  that boundary changes, Terra Sense begins with owner-provided documents.
- The current implemented navigation remains in place until a separately approved implementation
  plan defines the migration safely.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [North Star](../North-Star.md)
- [Roadmap](../Roadmap.md)
