---
type: Plan
title: Design Pass Audit - Screen-by-Screen Findings
description: Completed audit and implementation outcome for the aesthetic design pass across all five MVP screens, grounded in the locked Visual Design Direction.
tags: [project-knowledge, plan, design, ui, audit]
status: completed
---

# Design Pass Audit - Screen-by-Screen Findings

**Date:** 2026-07-15. **Method:** the app was run from the `design-pass` worktree, all five
screens were captured as full-page and viewport screenshots, and each screenshot was reviewed
against the locked [Visual Design Direction](../decisions/Visual-Design-Direction.md) and the
Tailwind Plus category map in [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md).
No source files were modified — this is an audit only, intended as the input for the
implementation half of the design pass.

**Important caveat:** every screenshot was captured with an **empty database** — zero documents,
zero events, zero event types. That made this an excellent audit of the empty states (which turn
out to need the most work), but the populated views — the one-event-at-a-time review card, the
events table, the event facts grid, attachment thumbnails, the globe with pins — were not visible
and could not be critiqued. **A follow-up capture with sample data is needed before or during the
implementation pass.**

## Implementation outcome — completed 2026-07-15

The implementation half is complete. It stayed inside the locked pure-black/amber "mission
brief" language and reused the existing shared components and CSS classes. The Tailwind Plus
category map was used only as a structural checklist.

Before judging populated states, an isolated sample database was created with nine realistic
documents and events across different event types, epistemic statuses, review states, dates,
locations, duplicate states, and image attachments. The implementation was then reviewed in a
real desktop browser on all five screens, including the one-event-at-a-time review card, source
evidence, duplicate comparison, event facts, attachment thumbnails, approved-events table, and
the globe with real pins. The isolated data did not alter the owner's normal database.

All findings below are resolved:

- **Global:** all five screens now share one page-header pattern; a permanent top status bar owns
  the brand, offline-safe state, and LM Studio state; the muted token is now `#7b8990`; disabled
  actions remain legible; and navigation is numbered `01` through `05`.
- **Dashboard:** the shared filter is compact and expandable, so the summary and globe are
  visible in the initial desktop viewport; marker count is part of the panel heading; the map
  fills its frame; real pins have restrained amber halos; summary, timeline, and event-register
  hierarchy and spacing were tightened; counts and sorting are grouped.
- **Documents:** the shared header, capped form width, required-field semantics, titled queue,
  populated row rhythm, attachment counts, and larger thumbnails now form one clear intake flow.
- **Event Review:** the empty state has a route forward, while populated review uses matched
  source/event panels, stronger evidence hierarchy, separated facts, and a clear duplicate
  decision area without adding distracting motion.
- **Events:** compact shared filters include location placeholders; count and sort are grouped;
  the event register, populated rows, facts grid, status, and source hierarchy were polished.
- **Settings:** service state moved into the global bar; connection testing is grouped with its
  URL; panel headings are distinct from field labels; event types have both a useful empty state
  and clearer populated-row actions.

Terra Space is a **desktop browser application only**. Phone/mobile presentation is not a
supported product surface or an acceptance target for this pass.

## What is true everywhere (all five screens)

### Working well — keep

- The core mood is right: pure black, amber accent, mono uppercase labels, subtle corner
  brackets on panels, dark restrained globe. It genuinely reads "calm mission brief," not
  "sci-fi toy."
- The left navigation rail is clean, and the active item (amber left border + warm wash) is
  exactly per the locked direction.
- Button language is consistent: bordered, mono, uppercase, amber for primary actions.

### Global issues

1. **USABILITY DEFECT — internal jargon shown to the user.** Documents says "PHASE 2" above its
   title and Event Review says "PHASE 3" — roadmap phase numbers left in the interface
   (`frontend/src/app/documents/page.tsx` line 203, `frontend/src/app/event-review/page.tsx`
   line 213). They mean nothing to a user and look unfinished. **Recommendation:** replace with
   meaningful eyebrow lines in the same style as the other pages, e.g. "SOURCE INTAKE" for
   Documents and "EXTRACTION QUEUE" for Event Review. *(Tailwind Plus: Page Headings.)*
2. **Inconsistent page headings.** Dashboard, Events, and Settings have a large title plus a
   one-line explanation; Documents and Event Review have a small plain title and no explanation.
   **Recommendation:** one shared page-header pattern (eyebrow, large title, one muted intro
   sentence, optional right-side action button like Dashboard's OPEN EVENTS) applied to all five
   pages. *(Page Headings.)*
3. **The locked "top status bar" does not exist.** The design direction promises a top bar with
   the TERRA SPACE wordmark and mono readouts (`LOCAL // OFFLINE-SAFE`, `LM STUDIO ● OFFLINE`).
   Instead, "LM Studio is available." floats as a plain sentence under the Dashboard and
   Settings titles, and other pages show nothing. **Recommendation:** implement the status bar
   as designed — it gives the LM Studio status a permanent, glanceable home on every screen and
   removes the floating sentence. Until then, at minimum style the message as a labeled status
   chip, not body text. *(Alerts / Badges.)*
4. **Muted text is slightly too dark for small print.** The muted gray `#5f6d75` on black
   measures roughly 3.9:1 contrast — just below the 4.5:1 accessibility guideline for small
   text, and it is used for all the small uppercase field labels and intro sentences. This is a
   genuine (mild) contrast shortfall, not a taste change. **Recommendation:** brighten the muted
   token one step (e.g. toward `#74838c`) — same palette, same mood, comfortably readable.
5. **Disabled primary buttons are nearly invisible.** Disabled buttons drop to `#39454b`
   (~2.2:1). "ADD DOCUMENT" and "PROCESS SELECTED" — the two most important buttons on
   Documents — are barely there when disabled. **Recommendation:** keep disabled buttons at the
   muted text color and signal "disabled" with the dimmer border + not-allowed cursor instead of
   vanishing the label.
6. Minor: the locked direction specifies **numbered** nav items ("01 Dashboard…"); the rail is
   unnumbered. Cheap fidelity win if still wanted. *(Sidebar Navigation.)*

## Dashboard

**Keep:** the heading row (eyebrow + title + OPEN EVENTS button) is the best-structured header
in the app. The four labeled filter clusters with amber tick-marks are clear. The summary row
(left-border ticks, mono amber numbers) is a good start on the Stats pattern. The globe looks
appropriately dark and calm.

**Issues:**

1. **The filter form dominates the page.** Roughly 450 pixels of filters come before any actual
   intelligence; in the viewport screenshot no data is visible at all — no summary numbers, no
   globe, just filters. The locked direction says the globe is the centerpiece.
   **Recommendation:** compress the filters into a compact single-row toolbar, or a collapsible
   "FILTERS" panel that opens on demand, so summary + globe are visible without scrolling. Since
   Events shares this same filter block, one fix improves both pages. *(Select Menus / Form
   Layouts.)*
2. **"Map markers: 0" looks like leftover debug text** floating between the panel title and the
   map. **Recommendation:** fold it into the EVENT LOCATIONS panel header as a right-aligned
   mono readout ("MARKERS 0"). *(Section Headings.)*
3. **USABILITY DEFECT — misleading empty message.** With no filters set and an empty database,
   the Timeline and Filtered Events panels say "No events match these filters." Nothing is
   filtered — there are simply no events yet. A new user would hunt for a filter to clear.
   **Recommendation:** two distinct messages: no data at all → "No approved events yet. Approve
   extracted events in Event Review." (with a link); filters active → keep the current message
   and add a "Clear filters" action. *(Empty States.)*
4. **The globe panel is double-framed with dead space** — a border inside a border, small globe,
   wide empty margins, which pushes Timeline/Filtered Events far down the page.
   **Recommendation:** let the map fill its panel edge-to-edge inside the corner brackets, and
   at wide widths consider the validated 3-column concept (globe center, lists beside it)
   instead of one tall stack.
5. **Bottom panels misaligned and stretched.** Timeline's box ends well above Filtered Events',
   and in the Filtered Events toolbar the count sits far left while SORT ORDER is pushed to the
   far right — the locked layout rule is "group, don't stretch." **Recommendation:** equalize
   the two panels' heights and cluster count + sort together.

## Documents

**Keep:** the add-document form panel itself is tidy — mono labels, sensible two-column date
row, clean field styling.

**Issues:**

1. "PHASE 2" eyebrow — defect, covered in global issue 1.
2. Small heading, no intro sentence — global issue 2. *(Page Headings.)*
3. **USABILITY DEFECT — an unlabeled mystery panel.** Below the form sits a second panel
   containing only a dim disabled "PROCESS SELECTED" button and empty space. Nothing says this
   is where the document list will appear; a first-time user cannot tell what it is or that
   adding a document will populate it. **Recommendation:** give the panel a title ("DOCUMENT
   QUEUE" or similar) and a proper empty state: "No documents yet — add your first document
   above." *(Section Headings + Empty States.)*
4. Disabled buttons nearly invisible — global issue 5, and this page is where it bites hardest.
5. **The form is very wide** — the Title field stretches ~1000px, so labels and fields lose
   their visual pairing. **Recommendation:** cap the form's width (roughly the width Settings
   uses) and let the panel breathe. *(Form Layouts.)*

## Event Review

**Keep:** almost nothing was visible in the empty state — heading plus one sentence. (The actual
review card could not be audited; it needs a populated capture.)

**Issues:**

1. "PHASE 3" eyebrow — defect, covered in global issue 1.
2. **USABILITY DEFECT — a dead-end empty state.** The entire screen is the sentence "No
   documents are waiting for review." on a black void: no panel, no explanation of what appears
   here, and no way forward. This is the weakest screen in the audit. **Recommendation:** a
   proper framed empty state — a panel with the bracket motif, one sentence of orientation
   ("Events extracted from processed documents appear here for one-at-a-time approval."), and a
   button linking to Documents ("ADD OR PROCESS DOCUMENTS"). This is the canonical Empty States
   pattern: icon/message/call-to-action. *(Empty States.)*
3. Small heading — global issue 2.

## Events

**Keep:** the best page header in the app (eyebrow "APPROVED INTELLIGENCE ONLY", big title,
muted explanation), grouped filter clusters, and a real toolbar with the approved-event count
and sort control. The dashed-border empty box nicely distinguishes "empty result" from a content
panel.

**Issues:**

1. **Same misleading "No events match these filters" defect** as the Dashboard when the database
   is simply empty. Same fix. *(Empty States.)*
2. **The three location filter fields have no placeholder text** — COUNTRY, PROVINCE OR STATE,
   CITY OR REGENCY are blank dark boxes, while the Search field does have a hint; they read as
   dead space. **Recommendation:** add placeholders like "Any country". *(Form Layouts.)*
3. The filter block again fills most of the screen before results — same compact/collapsible fix
   as Dashboard (shared component, one fix).
4. Minor: count far-left vs sort far-right stretching — cluster them per "group, don't stretch."

## Settings

**Keep:** the strongest screen — it was built with the Tailwind patterns in mind and it shows.
Clear panels, plain-language descriptions inside each panel, correct button hierarchy (amber
SAVE CONNECTION primary vs. neutral TEST CONNECTION secondary), tidy mono labels. This is the
quality bar the other screens should be raised to.

**Issues:**

1. **Missing empty state for event types.** With zero types, the Event Types panel just ends
   after the "NEW EVENT TYPE" input — no list, no message. **Recommendation:** "No event types
   yet — add one above. Types suggested by the AI will also appear here for activation."
   *(Empty States.)*
2. "LM Studio is available." floats above the panels and duplicates what the connection panel is
   about — global issue 3; it belongs in the (missing) status bar or as a status chip inside the
   LM STUDIO CONNECTION panel. *(Alerts.)*
3. **Flat heading hierarchy inside panels:** the panel title "EVENT TYPES" is the same size and
   color as the field label "NEW EVENT TYPE," so titles and labels blur together.
   **Recommendation:** make panel titles a step larger/brighter than field labels. *(Section
   Headings.)*
4. Minor: TEST CONNECTION sits between the URL and MODEL fields; grouping Test beside the URL
   field it actually tests (and Save at the panel's end) would read more naturally. *(Action
   Panels.)*

## Prioritized top 5

Usability defects first (per [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md),
these get fixed regardless of design-pass timing):

1. ~~**Remove "PHASE 2" / "PHASE 3" from the UI"** (Documents, Event Review)~~ — **Fixed
   2026-07-15**: replaced with "Source intake" and "Extraction queue".
2. ~~**Fix the Event Review dead-end empty state**~~ — **Fixed 2026-07-15**: a framed panel now
   explains what appears there and links to Documents.
3. ~~**Fix the misleading "No events match these filters"**~~ — **Fixed 2026-07-15**: Dashboard
   and Events now show "No approved events yet" with a link to Event Review when nothing is
   filtered, and the original message plus a "Clear filters" action when filters are active.
4. ~~**Make the Documents queue panel legible**~~ — **Fixed 2026-07-15**: titled "Document queue"
   with a "No documents yet" empty state; disabled primary buttons no longer fade to
   near-invisible (`.btn:disabled` now uses the `--text-muted` token).

Highest-impact polish:

5. ~~**Compress the shared filter block** (Dashboard + Events) into a compact toolbar or
   collapsible panel so the globe and summary are visible without scrolling~~ — **Fixed
   2026-07-15**: search remains immediately available, advanced filters open on demand, active
   filters are counted, and the Dashboard summary plus globe are visible in the initial desktop
   viewport.

Runners-up: ~~unify the page-header pattern across all five screens~~; ~~build the locked top
status bar~~; ~~brighten the muted text token one step for contrast~~ — **all fixed
2026-07-15**.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Design Pass Sequencing](../decisions/Design-Pass-Sequencing.md)
