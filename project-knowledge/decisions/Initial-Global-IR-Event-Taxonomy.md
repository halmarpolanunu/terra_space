---
type: Decision
title: Initial Global International Relations Event Taxonomy
description: Defines the first concise set of global international-relations event types for Terra Sense and Terra Insight.
tags: [project-knowledge, decision, taxonomy, international-relations]
status: active
okf_version: "0.1"
---

# Context

The owner wants Terra Space to monitor global international-relations developments and later
analyse them by region and country. CAMEO/GDELT provide useful hierarchical event-data references,
but their interaction-focused vocabulary does not by itself cover the owner's economic and energy
monitoring needs. The current application stores Event Types as a flat list and uses their
descriptions to guide local LM Studio classification.

# Decision

Use a concise, domain-first taxonomy for the first configuration. Keep the current flat Event Type
storage for this delivery: each leaf is saved with a domain prefix, while this document is the
authoritative tree. Do not build a new database tree structure yet.

```text
Security & Conflict
├─ Security Statement / Threat
├─ Military Mobilization
├─ Armed Operation / Strike
└─ Armed Conflict Escalation

Diplomacy
├─ Diplomatic Statement
├─ Negotiation / Mediation
├─ Diplomatic Agreement
└─ Diplomatic Rupture / Coercion

Economy & Energy
├─ Economic / Energy Policy Signal
├─ Sanctions / Trade Restrictions
├─ Economic / Energy Agreement
└─ Supply / Energy Infrastructure Disruption
```

Each leaf uses a concise English title and has a simple description in Terra Sense. Early signals such as a
threat or official statement are valid events in their own right; a later material action is a
separate event. No priority score is added at this stage.

# Alternatives considered

- Use a complete CAMEO/GDELT-style codebook immediately.
- Organize by action first, then attach domain labels.
- Build a database-backed parent/child event-type tree before adding any initial types.

# Reasons

- The owner chose security/conflict, diplomacy, and economy/energy as the first global monitoring
  domains.
- A concise set is easier to review, improves local-AI guidance, and avoids a large unused codebook.
- Domain-first labels remain understandable in Event Review and future regional/country analysis.
- Retaining flat storage avoids a risky data-model change while preserving a clear path to a true
  visual tree later.

# Consequences

- The next implementation plan must define the exact flat name and description for all 12 types,
  add them through the existing Event Types path, and verify LM Studio receives them as active
  descriptions.
- Location fields, not Event Type names, remain the basis for region and country analysis.
- A future parent/child taxonomy requires a separate approved design and migration plan.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [North Star](../North-Star.md)
