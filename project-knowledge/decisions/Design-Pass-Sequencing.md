---
type: Decision
title: Design Pass Sequencing and Tailwind Plus Reference
description: Defer any further aesthetic design pass until after Phase 5 (MVP complete), and record which Tailwind Plus Application UI patterns should inform Phase 5's Settings screen and the eventual pass.
tags: [project-knowledge, decision, design, ui]
status: active
---

# Context

Phase 4 (Events and Dashboard) is built and verified against the locked
[Visual Design Direction](Visual-Design-Direction.md). While reviewing it, the owner found
Tailwind Plus's "Application UI" component catalog
(`https://tailwindcss.com/plus/ui-blocks#product-application-ui`) and asked which parts of the
current dashboard could benefit from which sections of it, and separately, whether to apply any
of that now or wait until every Roadmap phase is built.

# Decision

Finish Phase 5 (Settings and final MVP verification) before doing any further aesthetic design
pass. Do not adopt Tailwind Plus patterns wholesale or restyle existing screens for polish alone
right now. Two exceptions stay in scope throughout: fixing genuine usability defects as they're
found (as already done for the Events page), and building Phase 5's Settings screen with the
relevant Tailwind patterns in mind from the start, so it is not designed once and then redone.

## Tailwind Plus categories mapped to current screens (reference for the eventual pass)

- **Summary panel metrics** → Data Display › Stats
- **Events list / Dashboard "Filtered events" table** → Lists › Tables
- **Event detail facts grid** → Data Display › Description Lists
- **Page heading rows** (eyebrow + title + primary action) → Headings › Page Headings
- **Panel titles** (Summary, Event locations, Timeline) → Headings › Section Headings
- **StatusChip (Confirmed/Claim/Rumor/Denied)** → Elements › Badges
- **LM Studio offline / error messages** → Feedback › Alerts
- **"No events match these filters"** → Feedback › Empty States
- **Filter bar selects/comboboxes** → Forms › Select Menus, Comboboxes, Form Layouts
- **Left navigation rail** → Navigation › Sidebar Navigation, Shells › Sidebar Layouts
- **Timeline / recent-intake list** → Lists › Feeds

## Categories to consult specifically when building Phase 5 (Settings)

- Page Examples › Settings Screens
- Forms › Toggles, Radio Groups, Action Panels

# Alternatives considered

- **Do the design pass now, screen by screen** — rejected. Settings doesn't exist yet, so any
  pass now covers an incomplete surface and would need repeating once Settings ships, doubling
  the verification cost (lint, tests, Docker rebuild, browser check) for no net benefit.
- **Ignore Tailwind Plus entirely** — rejected. Several categories (Stats, Tables, Description
  Lists, Alerts, Empty States) address real gaps in the current implementation (plain-text
  errors, an unstructured facts grid, a stat block that doesn't use a dedicated stat-tile
  pattern), so the reference is worth preserving for later even if not acted on now.

# Reasons

- The MVP's value is the document-to-event workflow being complete and provable end-to-end, not
  visual polish on a partial product; Phase 5 closes the last gap in that workflow.
- A single design pass across a finished product costs less total effort than polishing now and
  again after Phase 5 adds new UI (Settings forms, toggles, event-type management).
- Building Phase 5 with the relevant Tailwind patterns in mind (Settings Screens, Toggles, Radio
  Groups, Action Panels) avoids building Settings once and redesigning it during the later pass.
- Tailwind Plus ships generic light-mode markup and utility classes; nothing drops in as-is
  against the pure-black, amber, mono/serif mission-brief system and this project's hand-written
  CSS. Every category here is a structural/interaction reference, not a source to copy from.

# Consequences

- [Current-Status.md](../Current-Status.md)'s next action remains: plan and build Phase 5.
- Whoever plans Phase 5's Settings screen should read this decision first and consult the
  "Page Examples › Settings Screens" and "Forms › Toggles / Radio Groups / Action Panels"
  categories above while designing it, rather than inventing settings UI patterns from scratch.
- A dedicated design-pass session, informed by the full category mapping above, is expected
  after Phase 5 is verified and the MVP is otherwise complete. That session should re-open this
  decision and the Visual Design Direction decision together.
- Usability defects (not aesthetic preference) found in the meantime should keep being fixed
  immediately, as with the Events page filter/search/table-header fixes already made.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Visual Design Direction](Visual-Design-Direction.md)
