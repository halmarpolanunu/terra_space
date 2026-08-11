---
type: Design Specification
title: Automatic Event Visibility and Manual Dashboard Filtering Design
description: Show every processed Phase 3 event automatically, including pipeline exceptions, while giving the owner manual filters and a per-event hide control on the Dashboard and Events.
tags: [supabase, terra-space, dashboard, visibility, read-only]
status: active
---

# Automatic Event Visibility and Manual Dashboard Filtering Design

## Purpose

Follows the [Automatic Event Visibility With Manual Filtering](../decisions/Automatic-Event-Visibility-With-Manual-Filtering.md)
decision. The completed [Supabase Read-Only Bridge](2026-08-11-supabase-read-only-bridge-design.md)
only ever shows `dashboard_status: published` events, so a real processed article whose four
candidates all became Phase 3 `EXCEPTION` records showed nothing in Terra Space at all. This design
makes every processed event show up automatically — published or exception — and gives the owner a
manual way to narrow what they're looking at.

## Chosen approach

Supabase stays exactly as read-only as the existing bridge already made it: no new write reaches
Supabase. Two independent mechanisms give the owner control without a Supabase write:

1. **A visibility filter**, alongside the existing search/date/type/actor/location filters already
   on Dashboard and Events: "All processed events" (default), "Published only", or "Exceptions
   only." Like every other filter here, it lives in the URL's query string, so a filtered view can
   be bookmarked or shared exactly like today's filters.
2. **A per-event "Hide" action**, stored only in the owner's browser (`localStorage`), not in
   Supabase. A hidden event disappears from the map, timeline, list, and charts until the owner
   un-hides it from a new "Hidden by you" panel. This is intentionally not synced anywhere — see
   the decision's "Interim mechanism" section for why, and its accepted limitation (resets if the
   owner clears browser storage or switches browsers).

Every exception event, wherever it appears, is visibly marked as a pipeline exception (not
identical to a validated event) and shows why it became an exception when the pipeline recorded a
reason.

## Screen behavior

- **Dashboard and Events**: both now request all `published`+`hidden` events by default, instead
  of `published` only. The existing `EventFilterBar` gains one more control: a "Visibility" filter
  offering All / Published only / Exceptions only. A new Dashboard summary stat, "Pipeline
  exceptions," is clickable like today's "Unresolved locations" stat and opens a list of the
  currently-shown exception events. A second new stat, "Hidden by you," opens a list of the
  owner's currently-hidden events, each with an "Unhide" button.
- **Globe / map**: an exception event's pin renders with a visibly different marker (a distinct
  outline/color, not the same solid marker as a published event), so a cluster of pins is honest
  about what's fully validated versus retained-with-caveats.
- **Event list (register) and timeline**: an exception event's row carries a small "Exception"
  badge next to its epistemic-status chip.
- **Event detail**: an exception event shows a clear callout — "Pipeline exception: not fully
  validated" — plus the recorded reason (from the safeguard or an error message) when the pipeline
  has one, and a "Hide" / "Unhide" button (browser-only, explained inline).
- **Sources and Event Review** are unaffected — this design only changes Phase 3 event visibility,
  not Phase 1/Phase 2 read-only display.

## Data model

`EventRead` (shared by SQLite and bridge events) gains three optional fields, all defaulting to
`None`/absent so existing SQLite-backed code paths need no changes:

- `pipeline_outcome`: `"FINAL" | "EXCEPTION" | null`
- `dashboard_status`: `"published" | "hidden" | "rejected" | "archived" | "merged" | null`
- `exception_reason`: a short, human-readable string built from the pipeline's own recorded
  safeguard reasons or error message for that candidate, when available; `null` otherwise.

`DashboardSummaryRead` gains one optional field, `exception_count: int = 0`, again defaulting so
the SQLite path is unaffected.

The bridge's event query changes from `where dashboard_status = 'published'` to
`where dashboard_status in ('published', 'hidden')` — the only two states real Phase 3 pipeline
output currently produces. `rejected`/`archived`/`merged` stay excluded, because those describe a
deliberate human decision (not yet possible until the Terra Space Supabase Application Transition
Plan adds real edit authority) rather than an automatic pipeline outcome.

## Safety and verification

- No new Supabase write path opens; the bridge's read-only transaction and query layer are
  unchanged in kind, only in which rows the existing SELECT returns.
- The per-event hide list lives in `localStorage` under a namespaced key and never leaves the
  browser; it is not sent to the backend and cannot affect Supabase.
- Tests cover: an `EXCEPTION` event is now returned by the bridge query and carries the right
  `dashboard_status`/`pipeline_outcome`/`exception_reason`; the visibility filter narrows correctly
  on both the events list and dashboard-summary routes; `rejected`/`archived`/`merged` rows (once
  they can exist) stay excluded; the browser-only hide/unhide helper round-trips correctly and is
  resilient to `localStorage` being unavailable (e.g. private browsing).
- Live verification re-checks the owner's real four-candidate article: all four now appear on
  Dashboard/Events, marked as exceptions, and the visibility filter and hide action both work
  against them.

## Out of scope

- Any Supabase write (hide, reject, archive, restore) — deferred to the Terra Space Supabase
  Application Transition Plan's real authority model.
- Syncing hidden events across browsers or devices.
- Changing Sources or Event Review behavior.
- Widening the epistemic-status filter dropdown to the full six-value set (a separately tracked,
  already-recorded non-goal from the read-only bridge plan).

## Related knowledge

- [Automatic Event Visibility With Manual Filtering (decision)](../decisions/Automatic-Event-Visibility-With-Manual-Filtering.md)
- [Automatic Event Visibility Implementation Plan](2026-08-11-automatic-event-visibility-implementation.md)
- [Supabase Read-Only Bridge Design](2026-08-11-supabase-read-only-bridge-design.md)
- [Terra Space Supabase Application Transition Plan](2026-08-10-terra-space-supabase-transition.md)
- [Current Status](../Current-Status.md)
