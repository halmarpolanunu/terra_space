---
type: Decision
title: Automatic Event Visibility With Manual Filtering
description: Every processed Phase 3 event, including pipeline exceptions, appears automatically in Terra Insight; the owner filters or hides events manually instead of the pipeline hiding them automatically.
tags: [project-knowledge, decision, dashboard, supabase, visibility]
status: active
---

# Context

The [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)
decision made `phase3_events.dashboard_status` decide Terra Insight visibility automatically: a
Phase 3 `FINAL` result becomes `published` and appears immediately, while an `EXCEPTION` becomes
`hidden` and "does not enter Terra Insight." The completed
[Supabase Read-Only Bridge](../plans/2026-08-11-supabase-read-only-bridge-design.md) implemented
exactly that rule — its event query only ever selects `dashboard_status = 'published'`.

After the bridge went live, the owner watched a real article produce four Phase 2 candidates, all
four becoming Phase 3 `EXCEPTION`/`hidden` records — and none of them appeared anywhere in Terra
Space. The owner's new direction: every event the pipeline finishes processing should show up
automatically, exception or not, so the owner can see everything the system produced. The owner
then decides what to look at, by filtering or by hiding specific events — not the pipeline deciding
that on the owner's behalf by silently withholding exception records.

This changes one specific rule inside an `active` decision. Per `AGENTS.md`, the North Star and
locked decisions are never changed silently; this document records the change and why, rather than
quietly editing the old rule away.

# Decision

Automatic visibility is now based only on whether a record exists and is not a rejected/archived
human decision, not on pipeline outcome:

- `FINAL` events (`dashboard_status: published`) and `EXCEPTION` events (`dashboard_status: hidden`)
  both appear automatically in Terra Insight (Dashboard map, charts, timeline, event list, and
  Events), together, by default.
- Every place an `EXCEPTION` event is shown, it is visibly marked as a pipeline exception (not
  presented identically to a validated `FINAL` event), and the reason it became an exception is
  shown when the pipeline recorded one.
- The owner may narrow the view with a manual filter (show published only, exceptions only, or
  both — the default), and may individually hide a specific event out of view without changing any
  Supabase data.
- Records that reach `rejected` or `archived` status through a real human decision (not yet
  possible until the [Terra Space Supabase Application Transition
  Plan](../plans/2026-08-10-terra-space-supabase-transition.md) adds that authority) remain
  excluded from the normal view, exactly as before — this decision only changes the *automatic*,
  pipeline-driven `hidden` state, not a deliberate owner decision to reject or archive something.

## Interim mechanism, before Supabase write authority exists

The current [Supabase Read-Only Bridge](../plans/2026-08-11-supabase-read-only-bridge-design.md)
does not write to Supabase at all, and that stays true here: manual "hide" is stored only in the
owner's browser (not in Supabase), so it does not open a write path ahead of schedule. This means a
hidden event resets if the owner clears that browser's storage or opens Terra Space in a different
browser — an accepted, explained limitation for this interim period, not a defect.

Once the Terra Space Supabase Application Transition Plan adds real edit/reject/archive authority,
the owner's "hide" action should become that plan's existing `reject`/`archive` action instead of a
separate concept — there is no need for a third, permanent "hidden by owner" state alongside them.

# Alternatives considered

- **Keep automatic hiding of `EXCEPTION` records.** Rejected: the owner directly reported this
  hides real pipeline output with no way to see it, which contradicts the North Star's requirement
  that AI/lookup failures and uncertainty stay visible rather than silently dropped.
- **Open a real Supabase write path now for "hide."** Rejected for this pass: it would mean writing
  to Supabase before the reviewed, task-by-task [Terra Space Supabase Application Transition
  Plan](../plans/2026-08-10-terra-space-supabase-transition.md) has done that work, widening the
  bridge's write surface ahead of that plan's own safety checks. Revisit once that plan lands.
- **Scope this change to the read-only bridge preview only, leaving the future full-transition
  design describing automatic exception-hiding.** Considered, but the owner confirmed this is meant
  to be the permanent design, not a temporary preview behavior — so the transition plan is updated
  to match instead of planning to revert.

# Reasons

- The owner cannot decide what to do about a pipeline exception (reprocess, ignore, investigate)
  if it is invisible. Visibility is a precondition for the owner's own judgment, not a replacement
  for it.
- A pipeline exception is not necessarily wrong information — it means the automatic safeguards
  could not fully validate it, which is different from "this should never be looked at."
- Manual, owner-driven filtering keeps the same principle the North Star already states for
  epistemic status: uncertainty stays visible and labeled, rather than hidden by the system.

# Consequences

- [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)'s
  "Dashboard authority" table and one safety rule are amended in place (not superseded) to match —
  see that document's updated wording and the pointer back to this decision.
  Its table names, phase organization, and every other rule are unaffected.
  [Automated Final Event Record Pipeline](Automated-Final-Event-Record-Pipeline.md) is unaffected:
  `FINAL`/`EXCEPTION` still describe whether the pipeline's own safeguards accepted a record; this
  decision only changes whether an `EXCEPTION` record is automatically visible in Terra Insight.
- The [Supabase Read-Only Bridge](../plans/2026-08-11-supabase-read-only-bridge-implementation.md)'s
  event query, `EventRead` shape, and four screens need an implementation pass — see the
  [Automatic Event Visibility Implementation Plan](../plans/2026-08-11-automatic-event-visibility-implementation.md).
- The [Terra Space Supabase Application Transition Plan](../plans/2026-08-10-terra-space-supabase-transition.md)
  (not yet started) is updated so its eventual Dashboard-authority work keeps this same rule
  instead of reintroducing automatic exception-hiding.
- Browser-only "hide" is a real, explained limitation (per-browser, not synced) until real Supabase
  write authority exists; the owner has been told this directly, not left to discover it.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md)
- [Automated Final Event Record Pipeline](Automated-Final-Event-Record-Pipeline.md)
- [Automatic Event Visibility Design](../plans/2026-08-11-automatic-event-visibility-design.md)
- [Automatic Event Visibility Implementation Plan](../plans/2026-08-11-automatic-event-visibility-implementation.md)
- [Project Knowledge](../Project-knowledge-Index.md)
