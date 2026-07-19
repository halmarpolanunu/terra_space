---
type: Decision
title: Event Taxonomy Tree and Management
description: Replaces flat Event Type management with an owner-managed four-level taxonomy tree in Terra Sense.
tags: [project-knowledge, decision, event-types, taxonomy, terra-sense]
status: active
okf_version: "0.1"
---

# Context

Terra Sense currently stores and displays Event Types as a flat, repeated list of editable rows.
The owner finds this presentation visually cluttered and it cannot express the approved international
relations taxonomy beyond a name prefix. The initial taxonomy already has three domains and twelve
approved Event Types, while the closed-taxonomy rule requires local AI to select only an existing
active type or leave the type blank.

# Decision

Terra Sense will use an owner-managed, database-backed taxonomy tree:

```text
Domain
└── Category
    └── Subcategory
        └── Event Type
```

Only the leaf-level `Event Type` can be assigned to an event or selected by local AI. The three
upper levels organize, filter, and explain the taxonomy; they are never event values themselves.

The first tree contains the twelve approved Event Types exactly as arranged below:

```text
Security & Conflict
├── Signalling & Posture
│   ├── Security Signalling
│   │   └── Security Statement / Threat
│   └── Military Readiness
│       └── Military Mobilization
└── Military & Conflict Activity
    ├── Use of Force
    │   └── Armed Operation / Strike
    └── Conflict Dynamics
        └── Armed Conflict Escalation

Diplomacy
├── Diplomatic Engagement
│   ├── Diplomatic Communication
│   │   └── Diplomatic Statement
│   ├── Dialogue & Facilitation
│   │   └── Negotiation / Mediation
│   └── Agreements
│       └── Diplomatic Agreement
└── Diplomatic Pressure & Breakdown
    └── Coercion & Rupture
        └── Diplomatic Rupture / Coercion

Economy & Energy
├── Policy & Restrictions
│   ├── Policy Signalling
│   │   └── Economic / Energy Policy Signal
│   └── Sanctions & Trade
│       └── Sanctions / Trade Restrictions
└── Cooperation & Systems
    ├── Economic & Energy Cooperation
    │   └── Economic / Energy Agreement
    └── Supply & Infrastructure
        └── Supply / Energy Infrastructure Disruption
```

The legacy `Airstrike` Event Type will be removed. Draft events that currently reference it remain
in place, but their Event Type becomes blank for human review. No event record is deleted.

The Event Types screen becomes a calm, English-language `Event Taxonomy` workspace. It uses a
tree panel on the left and an inspector panel on the right. The selected node's details and actions
appear only in the inspector, avoiding repeated forms and destructive buttons in every row. The
owner can add, rename, deactivate, or delete nodes, but the initial delivery does not include
drag-and-drop, free workflow editing, or arbitrary node ordering. A parent may create only the
next valid level, and Event Types require a name, description, and active state as today.

# Alternatives considered

- Keep flat Event Type records and encode paths into long labels.
- Keep the tree only in documentation while the application remains flat.
- Build a fully editable drag-and-drop workflow/tree editor.

# Reasons

- A real tree provides clear future filters and analysis without making broad domains selectable as
  event facts.
- The tree-and-inspector layout gives the owner a simpler, less cluttered management experience.
- Controlled parent/child creation protects the four-level taxonomy from invalid structures.
- Keeping AI selection at the Event Type leaf preserves the existing closed-taxonomy safety rule.
- Excluding drag-and-drop and free workflow editing keeps the first delivery focused and safe.

# Consequences

- This supersedes the flat-storage-only portion of [Initial Global International Relations Event
  Taxonomy](Initial-Global-IR-Event-Taxonomy.md) and brings hierarchical taxonomy management into
  the MVP scope.
- A database migration, API changes, extraction-prompt path context, frontend picker updates, and
  a safe data migration are required.
- Existing event references remain stable because Event Types remain leaf records; only their
  parent taxonomy path is added.
- The closed Event Type rule remains unchanged: local AI may select an active leaf or leave it
  empty, never create or suggest a new Event Type. “Exact” means a match against the canonical
  active leaf name after surrounding whitespace is removed and letter case is normalized; this is
  only matching, not permission to create or suggest a new name.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Initial Global International Relations Event Taxonomy](Initial-Global-IR-Event-Taxonomy.md)
- [Closed Event Type Taxonomy](Closed-Event-Type-Taxonomy.md)
- [Project Knowledge](../Project-knowledge-Index.md)
