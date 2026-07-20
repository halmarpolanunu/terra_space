---
type: Feedback Backlog
title: Owner Feedback Backlog
description: Standing list of owner-reported gaps and future development requests, not yet scheduled into the Roadmap.
tags: [project-knowledge, feedback, backlog]
status: active
---

# Owner Feedback Backlog

This file collects feedback the owner has given about the current state of Terra Space that is
not yet an approved decision or a scheduled Roadmap item. Every coding agent (Claude, Codex,
Gemini) should check this list when it touches a related area, so reported gaps are not
rediscovered from scratch or silently reintroduced. When an item here becomes a real
implementation plan or decision, link it from here and mark it resolved instead of deleting it.

## Open items

### Event locations do not reliably reach the Dashboard globe (2026-07-16)

- **Problem:** After documents are processed, many resulting events have no usable location, so
  they never appear as a pin on the Dashboard globe, and the owner has no way to tell which
  approved events are missing a pin or why.
- **Root cause (as currently understood):** Two compounding gaps in the existing pipeline.
  1. AI extraction does not consistently produce `country`/`admin1`/`city_regency` text for every
     event, even when the source document plausibly supports a location.
  2. Per the locked
     [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
     decision, coordinates are only ever set by an **exact** match against the local gazetteer
     (`country` → `country+admin1` → `country+admin1+city_regency`); a near-miss (spelling,
     alternate name, unmatched city) leaves `latitude`/`longitude` null with no fuzzy fallback.
  3. Neither gap is currently visible to the owner at the point of review or approval: the Events
     edit screen (see screenshot, 2026-07-16) lets locations be added/removed as free text, but
     nothing on that screen or on Events/Dashboard flags "this location did not resolve to a
     globe coordinate."
- **Requested outcome:** The owner wants confidence that every event they care about can be made
  to appear on the globe — either by the pipeline extracting/resolving location more reliably, or
  by giving the owner clear visibility plus a manual way to guarantee a pin (e.g., surfacing
  unresolved locations, or allowing a manual coordinate/gazetteer override on the edit screen).
- **Not yet decided:** The actual fix approach (looser matching, manual coordinate entry, an
  "unresolved location" review queue, etc.). This entry only records the reported gap; solving it
  requires a follow-up decision or implementation plan before code changes.
- **Additional facet reported (2026-07-16, same day, follow-up conversation):** the owner also
  noticed that events which *do* resolve to a coordinate can still be invisible on the globe if
  they land on the exact same point as another event (the gazetteer returns one fixed coordinate
  per city/admin1/country, so same-city events are pixel-for-pixel identical) — "is it possible the
  location should result the exact match of latitude and longitude so the pin tidak menumpuk pada
  satu titik."
- **Status:** Partially resolved, three of four facets addressed.
  1. **Visibility (both facets) — resolved.** The owner chose pure visibility (no fuzzy gazetteer
     matching, no manual coordinate override): co-located pins now group into one numbered cluster
     marker (click → list of the events at that point), and unresolved-location events are now
     surfaced via a clickable "Unresolved locations" Dashboard stat that opens a list of the
     affected events. See the
     [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md),
     verified with 148 frontend tests, lint, a production build, and (since the owner's live
     database had 0 approved events at the time) an isolated, fully torn-down Docker Compose stack
     seeded with test events — cluster marker, cluster-click → list → detail, the unresolved stat
     and its list, and correct marker counts all confirmed end to end in a real browser. Not yet
     confirmed against the owner's own live approved events specifically.
  2. **AI extraction not consistently producing location text — addressed, not yet fully confirmed.**
     Root-caused to the LM Studio system prompt and JSON schema never mentioning locations at all
     (confirmed by reading the exact request sent to the model) plus a second bug (nothing told the
     model `country` must be an ISO alpha-2 code). Fixed via the
     [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md):
     a strengthened system prompt with a concrete worked example (a first pass with abstract
     instructions plus schema field descriptions alone still produced zero locations against the
     owner's real document and local model, `qwen/qwen3.5-9b`), schema-level field descriptions, and
     a new location-level "never invent" grounding check (a location is dropped unless at least one
     of its named fields is found in the event's own evidence quote — reusing the existing
     `quote_found` helper; country-only locations are trusted, since an ISO code never appears
     literally in prose). Verified with 127 backend tests. The owner reprocessed their real "US
     military reimposes naval blockade..." document afterward and reported "seems good for now," but
     a precise before/after location count across more than one document was not captured in this
     session — see [Current Status](Current-Status.md) for the open follow-up.
  3. **Gazetteer's exact-match-only lookup — still explicitly out of scope.** No fuzzy/alternate-name
     matching or manual coordinate override was built; the owner chose visibility-only for this pass
     (see above). Remains a possible future item if extraction improvements alone prove
     insufficient.
- **New data point (2026-07-20):** the open reliability question in facet 2 above now has a second,
  concrete result. The owner reprocessed the same document again and approved the 3 resulting events;
  live database inspection confirmed all 3 have **zero** location rows at all (not merely unresolved
  coordinates — no location data was extracted or dropped-and-logged), despite evidence quotes that
  plainly name Iranian ports/infrastructure. The same document's two earlier 2026-07-18 reprocesses
  did produce IR/KW/BH locations. The extraction prompt, schema, and grounding-check code were
  re-read and still look correct, so this reads as the local model's own run-to-run inconsistency
  rather than a new code regression — but it is not proven, since `PersistResult.dropped_locations`
  (populated when a location is extracted but fails the evidence-grounding check) is never logged or
  surfaced anywhere, so there is no way to tell "the model extracted nothing" from "the model
  extracted something that got silently dropped." See [Current Status](Current-Status.md) for full
  detail. **Still not yet decided:** whether to add extraction-result observability, treat this as a
  one-off and reprocess again, or accept it as a hard reliability limit of the current local model
  (`qwen/qwen3.5-9b`) to discuss directly with the owner.
- **Follow-up (same day, 2026-07-20):** at the owner's request, reprocessed the same document again
  to check whether the empty-locations result was a one-off. It was not: the second reprocess
  produced 4 fresh draft events, again with zero locations on every one. A third, read-only diagnostic
  call — built from the exact production request (same system prompt, schema, active types/actors)
  and sent directly to LM Studio outside the persist path, so nothing was written to the database —
  produced a *third, different failure mode*: the model returned an `event_date` without the required
  `event_date_precision`, which fails schema validation entirely and would mark the whole document
  `failed` in the real pipeline. Three calls against the same document and prompt, at `temperature: 0`,
  produced three materially different outcomes (locations present, locations absent, schema-invalid).
  This is now read as a **model reliability/non-determinism problem**, not a code defect — the
  extraction prompt, JSON schema, and validation code were re-verified correct across all three calls.
  Plausible contributing factor, not confirmed: the system prompt grew substantially between the
  working 2026-07-18 runs and the failing 2026-07-20 runs (now 4925 characters, including all 12
  active Event Types' descriptions and full taxonomy paths, added by the
  [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md) which shipped
  2026-07-19, in between) — a longer prompt with more classification detail may be crowding out the
  model's attention on location/date-precision instructions, but this is a hypothesis, not something
  tested in isolation (would need a controlled A/B call with and without the taxonomy-path text to
  confirm, which was not done here). **Recommendation for the owner to weigh in on:** this may be near
  the practical limit of a small local model on this kind of multi-field structured extraction task,
  and worth a direct conversation about model choice, prompt simplification, or accepting more manual
  review overhead — rather than another round of prompt micro-tuning.

### Event Review card should let every draft field be edited in place (2026-07-16)

- **Owner's words:** "i want to be able to edit each draft intelligence's fields in this menu.
  So i do not need to edit them later."
- **Screenshot context:** the Event Review screen (`frontend/src/app/event-review/event-card.tsx`),
  read-only card view — Title, Type, Start, End, Locations, Actors, Summary, Epistemic status,
  with Reject / Edit / Approve buttons.
- **What already exists (checked in code, not assumed):** clicking `Edit` (`event-card.tsx:371`)
  already swaps the whole card into a form covering title, summary, start/end date and precision,
  event type, actors, and locations — i.e., every field shown in the read-only view except
  epistemic status is editable there, and epistemic status is already always directly clickable
  (`EpistemicStatusControl`, no edit mode needed). So full-field editing on this screen is not
  currently a missing capability.
- **Real gap (as currently understood):** the owner's phrasing ("so i do not need to edit them
  later") suggests either (a) the existing `Edit` button was not discovered/registered as "editing
  in this menu" — a discoverability problem, not a missing feature — or (b) the owner wants fields
  editable directly inline (no separate view/edit toggle at all), rather than a whole-card mode
  switch triggered by one `Edit` button. These two interpretations lead to different fixes (make
  `Edit` more prominent/obvious vs. redesign the card to always show editable inputs), so this
  needs a clarifying follow-up with the owner before any code changes.
- **Status:** Resolved. When asked to choose between the two interpretations, the owner confirmed
  interpretation (a): the existing `Edit` control was a discoverability problem, not a missing
  feature. Fixed in `frontend/src/app/event-review/event-card.tsx`: the button is now labeled
  "Edit fields" instead of the bare "Edit", moved to the first position in the action row (before
  Reject/Approve, matching the natural "modify, then decide" order), and given the same amber
  `btn-primary` accent already used for the equivalent Edit action on the Events detail view
  (`frontend/src/app/events/event-detail.tsx`), instead of blending in with Reject's plain neutral
  style. No new button color or design-token was introduced. Verified with 127 frontend tests,
  lint, a production build, and a live check against a rebuilt Docker frontend image using the
  owner's real draft events (4 existing drafts) — confirmed the relabeled/repositioned/accented
  button reads clearly and still opens the existing full-field edit form. Read-only verification,
  no data changed.

### Sidebar/Dashboard background feels too empty on pure black (2026-07-16)

- **Owner's words:** "i also want to add accent or picture to the sidebar or event the
  background of the dashboard so its not just pure black. its too empty and void."
- **Conflicts with an existing locked decision:** the
  [Visual Design Direction](decisions/Visual-Design-Direction.md) decision explicitly locks
  `Background is always pure black` (`#000000`) under "Palette (dark only, pure black)", and its
  "Alternatives considered" section records "Light mode / dual theme" as out of scope and a more
  decorated/cinematic treatment as rejected in favor of "Clarity over decoration." This request —
  an accent, picture, or textured background behind the sidebar/Dashboard — is a real change to
  that locked palette rule, not a bug and not something to implement by just tweaking CSS.
- **Requested outcome:** the owner wants the sidebar and/or Dashboard background to feel less
  empty/void — e.g. a subtle accent, image, or texture — without necessarily abandoning the dark
  "mission brief" look.
- **How to apply:** per `AGENTS.md`'s rule for the North Star ("never change silently, propose and
  get approval first"), the same caution applies to this locked decision: do not silently add
  background imagery/texture. First confirm with the owner what they want to keep vs. change
  (e.g., keep pure-black panels but add a subtle starfield/atmosphere texture already used on the
  globe, vs. a bigger palette change), then record the outcome as an update to, or a supersession
  of, the Visual Design Direction decision before implementing.
- **Status:** Resolved; implemented and verified. The owner approved
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md):
  restrained glass on the shared shell, stronger glass only on the Dashboard, and five original
  pure-black/amber backgrounds from one visual family with a unique motif per menu. The complete
  [implementation plan](plans/2026-07-16-amber-glass-background-browser-zoom.md) is implemented
  and verified with automated and read-only browser QA. No Roadmap milestone changed.

### Event types have no description, only a bare name (2026-07-16)

- **Owner's words:** "The event types i think its too shallow since i only provide Event name
  (without its description)."
- **Screenshot context:** Settings → Event Types panel — only a "New event type" name field and,
  per existing row, a name input plus Active/Enabled controls. No description field anywhere.
- **Original state confirmed in code before this work:** `EventType`
  (`backend/app/db/models.py:76-84`) had only
  `name` and `is_active` columns — no description column existed at all. Extraction
  (`backend/app/services/extraction.py:58-65`) matched or created an event type purely by exact
  name (`find_by_exact_name`); nothing passed a definition/description to the LLM to disambiguate
  similar-sounding types (e.g. "Report" vs. "Statement" vs. "Incident"). The Settings event-type
  row and the Event Review/Events edit-screen type pickers only showed/collected the bare name.
- **Requested outcome:** the owner wants each event type to carry a description, so both the
  reviewer (a human deciding "is this the right type?") and the extraction step (the AI choosing
  or suggesting a type) have more than a one- or two-word label to go on.
- **Decision:** The owner chose the integrated approach: descriptions guide both humans and LM
  Studio. AI must compare against existing active type names and descriptions before suggesting a
  new type; new suggestions may include a draft description but remain inactive until reviewed.
  Active types require descriptions, with a migration exception for existing active records so the
  upgrade remains safe. See
  [Event Type Descriptions and AI Classification](decisions/Event-Type-Descriptions-and-AI-Classification.md).
- **Status:** Resolved; implemented and verified through the
  [Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md).
  Settings now saves names and descriptions together, activation requires a description while
  preserving the legacy active-blank exception, Event Review and Events editing show the selected
  definition, and LM Studio receives deterministic active name/description pairs before it may
  suggest a new inactive type. Verified with 143 backend tests, 161 frontend tests, clean lint, a
  successful production build, focused prompt/activation checks, and an isolated browser workflow
  that left the owner's data unchanged.

### UI should adapt to the user's browser zoom level (2026-07-16)

- **Owner's words:** "I want the UI to be able to adapt to the zoom level of user browser."
  Confirmed this means the browser's own page zoom (e.g. Ctrl +/- or the browser's zoom control in
  Chrome/Edge), not the MapLibre globe zoom already fixed under the "Dashboard panel parallax and
  globe atmosphere ring during zoom" entry below. This is a general request, not a specific defect
  the owner has already reproduced or screenshotted — no concrete breakage has been observed and
  reported yet.
- **What's already true in the code (checked, not assumed):** most layout is written in `rem` and
  relative units (`.app-shell` uses a `16rem` sidebar and `min-height: 100dvh`, not fixed pixel
  widths), and the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) already
  permits "Desktop and laptop widths may reflow when the browser is resized." Browser zoom and
  browser-window resizing both shrink the effective CSS-pixel viewport, so some of this may already
  be covered by existing reflow behavior — but that has not been verified at non-100% zoom
  specifically.
- **Where this is most likely to break (not yet confirmed):** the Dashboard's Layered Command Deck
  is a one-viewport-height "stage" whose browser-verified viewports are `1920 × 1080` at 100%
  Windows scale, with `1920 × 930`/`1920 × 900` as the checked maximized-browser sizes (see
  [Current Status](Current-Status.md)); it has never been checked at a zoomed-in effective
  viewport (e.g. 125%/150%, which behaves like a much narrower/shorter window). The Documents
  two-panel layout and Event Review's two-column layout are also candidates worth checking.
- **Not yet decided:** whether existing reflow behavior is already "good enough" across common
  zoom levels, or which specific components need a targeted fix. This needs an actual live-browser
  pass across a range of zoom levels (e.g. 90%, 110%, 125%, 150%) on each of the five screens
  before scoping any implementation plan.
- **Status:** Resolved; implemented and verified. The owner chose proportional
  shrinking of the complete Dashboard command deck at browser zoom, while the other four menus
  reflow normally. Verification covered 90%, 100%, 110%, 125%, and 150% as defined in
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md).
  The complete
  [implementation plan](plans/2026-07-16-amber-glass-background-browser-zoom.md) is implemented
  and verified with whole-canvas scale checks, overflow checks, and read-only browser QA.

### Dashboard panel parallax and globe atmosphere ring during zoom (2026-07-16)

- **Owner's words:** "pada bagian ini, saya tidak pingin box Recent Signals, Situation Summary,
  dan Event Register (dibawah) bergerak mengikut pointer. seharusnya posisi mereka fix. Kemudian
  'cincin' warna orange yang mengitari bumi keren, tapi ketika saya melakukan zoom ke globe, cincin
  ini statik dan menutupi tampilan bumi."
- **Two separate issues reported:**
  1. The Situation Summary, Recent Signals, and Event Register panels currently move/shift
     following the mouse pointer (parallax). The owner wants their position fixed instead. Note:
     this is a deliberate feature from the locked
     [Visual Design Direction](decisions/Visual-Design-Direction.md) decision ("small pointer
     parallax communicates their depth" on the Layered Command Deck Dashboard) — this feedback
     conflicts with that decision, so removing/disabling parallax needs a decision update, not
     just a code tweak.
  2. The amber atmosphere ring around the globe looks good at rest, but stays static (does not
     scale/reposition) when the owner zooms into the globe, ending up covering/obscuring the
     globe's surface. This sounds like a rendering/behavior defect rather than an intentional
     design choice — not yet confirmed against the code.
- **Status:** Both items resolved. Item 2 (atmosphere ring): confirmed as a real defect — the
  ring (`.command-deck-globe::after`) is a fixed-size decorative overlay sized for the resting
  globe view and never tracked the MapLibre globe's actual zoom. `WorldMap` now fades the ring
  out via a `--globe-ring-opacity` CSS variable as the user zooms in, so it only shows at the
  intended full-globe view. Item 1 (panel parallax): the owner confirmed, when asked, that they
  wanted the parallax intensity reduced rather than removed entirely — keeping it consistent with
  the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) wording ("small
  pointer parallax communicates their depth"), so no decision update was needed. The pointer-move
  handler in `frontend/src/app/dashboard/layered-command-deck.tsx` now scales travel by 3px/2px
  (horizontal/vertical) instead of 8px/5px, a single shared CSS-variable pair
  (`--deck-parallax-x`/`--deck-parallax-y`) applied uniformly to Situation Summary, Recent
  Signals, and the Event Register dock. Verified with 127 frontend tests (1 updated to the new
  bounded values), lint, a production build, and a live check against a rebuilt Docker frontend
  image on the owner's real local database — read-only navigation only, no data changed (see
  [Current Status](Current-Status.md)).

### Documents page layout composition feels disproportionate (2026-07-16)

- **Owner's words:** "saya ingin tampilan menu documents dirapikan lagi secara layout supaya
  tidak akward secara komposisinya overallnya. Liat digambar, ukurannya tidak proporsional
  antara atas dan bawah." (Wants the Documents page layout tidied up — the overall composition
  feels awkward, with the top "New Document" form panel and the bottom "Document Queue" panel
  not proportional to each other.)
- **Screenshot context:** Documents page — "New Document" form panel (Title, Content, Document
  date, Publication date, Source URL, Add Document) sits above the "Document Queue" panel
  (Process Selected, list of queued documents). Both panels stop short of the page's right edge,
  leaving a large empty area to the right, and the two panels' heights/widths don't visually
  balance each other.
- **Status:** Resolved. Confirmed root cause in `frontend/src/app/globals.css`: the "New Document"
  form panel had a hard `width: min(100%, 52rem)` cap while the Documents page itself is up to
  `86rem` wide, and the Document Queue panel below it had no such cap — so the form panel stopped
  well short of the page's right edge while the queue panel didn't. Removed the cap so both panels
  match, and moved the Source URL field into the same row as Document date/Publication date (an
  auto-fit grid) so the reclaimed width is used instead of sitting empty inside the form. No
  change to the [Visual Design Direction](decisions/Visual-Design-Direction.md) palette or motion
  system. Verified with frontend tests, lint, a production build, and a live browser check (see
  [Current Status](Current-Status.md)).

## Navigation

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [Current Status](Current-Status.md)
- [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
