---
type: Implementation Plan
title: One-Click Full News Processing Implementation Plan
description: Refactor the three local n8n processing stages into callable sub-workflows and add one form-driven master workflow that runs them in sequence.
tags: [project-knowledge, plan, n8n, orchestration]
status: in-progress
---

# One-Click Full News Processing Implementation Plan

## Execution status (2026-08-09)

### Current state — read this first

| Workflow | ID | Nodes (before → after) | Validation | Active |
|---|---|---|---|---|
| `Terra Space - Input News Manual` | `gABPryH3jTe2Ktz5` | 6 → 9 | 0 errors, 0 warnings | no |
| `Terra Space - Event Candidates` | `pO6m1mpaHz2Ae5ZR` | 18 → 21 | 0 errors, 0 warnings | no |
| `Terra Space - Event Records` | `qsbIodzbMPxgQeRg` | 30 → 33 | 0 errors, 0 warnings | no |
| `Terra Space - Full News Processing` | `SwXzUU9aHg4NZ9Kx` | new, 9 | 0 errors, 0 warnings | no |

**The one-click path is working and verified end to end.** One form submission runs all three stages
in order and returns a summary; the user never sees or types a UUID. Master execution `1638` is the
reference run. Every count it reported was checked against the Phase 1, Phase 2, and Phase 3 tables
and matched.

**Verified:** the Phase 1 success path, the Phase 2 internal path, the Phase 3 internal and chat
paths, all three stage contracts, the one-retry rule in both directions (rescue and retained
exception), exact-quote grounding, and the full master success path.

**Not yet verified:** the three negative cases (empty raw article text, an article with no grounded
candidate, a malformed UUID), the manual-recovery check, and the Phase 3 test webhook path — the
last of which needs the workflow active, so it is deferred with activation.

**Activation:** all four workflows are deliberately inactive. Activating
`Terra Space - Full News Processing` would give it a permanent form URL instead of needing
"Execute workflow" each time. That decision is still open and belongs to the owner.

Three Phase 3 defects were found and fixed during testing — two pre-existing ones that silently
deleted candidates, plus one in this plan's own summary node. Full detail below. Before the fixes,
a six-candidate article persisted only 2 records; it now persists all 6.

### How the testing actually went

**First run — master execution `1625`, article "Ukraine hits two oil refineries deep in Russian
territory" (BBC), Phase 1 UUID `b7c73695-0154-4b16-9dc2-ab917182be1d`:**

- Phase 1 (`1626`, 20s) succeeded and returned its contract exactly:
  `{stage: 'PHASE_1', status: 'SUCCESS', p1_uuid: 'b7c73695-…', p1_title: '…', cleaned_character_count: 4065}`.
- Phase 2 (`1627`, 22s) succeeded and returned:
  `{stage: 'PHASE_2', status: 'EVENT_CANDIDATES_FOUND', p1_uuid: 'b7c73695-…', candidate_count: 6, main_issue_status: 'MAIN_ISSUE_FOUND', error_message: null}`.
- Phase 3 (`1628`) failed after 147ms at `Get Latest Event Candidates` with
  `Node 'Parse Phase 1 UUID' hasn't been executed`.

The handoff between stages worked on the first try: no UUID was copied by hand, and each stage
received the previous stage's result.

**The bug.** `Get Latest Event Candidates` filtered on
`$('Parse Phase 1 UUID').item.json.p1_uuid`. That node only runs on the chat and webhook paths, so
the reference was unresolvable whenever Phase 3 was called through `Phase 3 Internal Input` — which
is exactly the master-workflow path. This is the same class of problem already anticipated for the
Phase 3 aggregate node (deviation 1 below); the sweep that found it had missed this node. Fixed by
pointing the filter at `$('Normalize Phase 3 Input').item.json.p1_uuid`, which runs on all three
entry paths, so the chat and webhook paths keep working unchanged. Phase 3 re-validates at 0 errors.

Phase 2's remaining nodes were then checked for the same pattern and are clean: none references its
chat-only parse node. Phase 1 has no such reference either.

Nothing was rolled back. The Phase 1 row and the Phase 2 candidate run/latest rows for
`b7c73695-0154-4b16-9dc2-ab917182be1d` were written correctly and are still available, so Phase 3
can be re-run against that UUID on its own without repeating Phase 1 or Phase 2.

**Second and third runs — Phase 3 alone via its chat trigger, executions `1630` and `1631`.** The
fix worked: the internal path resolves, the article loads, and all 6 Phase 2 candidates expand. Both
runs completed. `Build Phase 3 Stage Result` did fire on the batch loop's completed output, so the
plan's Task 3 Step 3 contingency is **not** needed for the reason it anticipated.

Those runs did, however, expose two pre-existing Phase 3 defects, both of which silently lose
candidates. Neither was introduced by this plan's changes, and both sit inside the protected Phase 3
pipeline that this plan's Global Constraints say to leave unchanged. They were reported to the owner
before any fix was attempted; the owner's answer was "Fix both now", which is the approval recorded
in the amended Global Constraint above.

**Defect A — candidates vanish when the local gazetteer has no matching row.**
`Resolve Primary Location Locally` is a Supabase `getAll` node. An input item whose `lookup_key`
finds no gazetteer row produces no output item, so that candidate disappears from the pipeline
entirely: no enrichment record, no `EXCEPTION`, no run-history row, no trace of any kind. In
execution `1631`, 8 items entered that node and 5 came out. The three lost candidates were:

| Candidate key suffix | `lookup_key` | Why it matched nothing |
|---|---|---|
| `1355:1545` | `null` | No grounded ISO3 location at all |
| `2695:2863` | `null` | No grounded ISO3 location at all |
| `2437:2604` | `UKR␟kharkiv region` | Gazetteer holds `UKR␟kharkiv`, not `…region` |

An event with no location, or with a location phrased slightly differently from the gazetteer,
should still become a record — blank or `EXCEPTION`, but visible. Silent deletion contradicts both
the North Star principle that AI and lookup failures must stay visible and the Automated Final Event
Record Pipeline rule that failed records are retained as exceptions.

**Defect B — the persistence loop is fed twice, and loses a record.**
`Retry Once?` sends non-retry items straight to `Persist Latest Records One at a Time` while retried
items go the long way round and arrive later. The loop therefore receives a fresh input twice and
completes twice. In execution `1631`, 3 candidates reached `Save Event Record Run` but only 2
reached `Prepare Latest Event Row`, and the lost one was the single `FINAL` candidate
(`2865:2986`, run `90`) — so the only successful record of that run was never written to
`terra_space_event_records`. That table holds 2 `EXCEPTION` rows for this article and no `FINAL` row.

**Consequence C — the stage summary can only be as accurate as Defect B allows.**
Because the loop completes twice, `Build Phase 3 Stage Result` runs twice and the caller receives the
last run, which saw only the retried batch: `processed_candidate_count: 2, final_count: 0,
exception_count: 2`. The node's logic is correct for the items it is given; it under-reports because
the loop hands it a partial set. Fixing this properly depends on fixing Defect B first, so the node
is being left as written rather than papered over with a workaround that would hide the real fault.

**Both defects were fixed on 2026-08-09 with the owner's explicit approval** ("Fix both now"), under
the amended Global Constraint above. Phase 3 is now 32 nodes and validates at 0 errors and 0
warnings. No grounding rule, prompt, model setting, taxonomy rule, safeguard, or retry rule was
touched; only the plumbing that lost records changed.

**Fix for Defect A — `Attach Local Coordinates`.** Now runs once for all items and rebuilds the full
candidate list from `$('Prepare Local Location Lookup').all()`, joining the gazetteer hits by
`lookup_key` through a Map instead of reading the Supabase node's output positionally. A candidate
whose location is absent or unmatched now continues with `coordinate_status`
`NO_GROUNDED_LOCATION` or `UNRESOLVED` and null coordinates, exactly as the status values already
intended, rather than disappearing. The gazetteer table, the lookup key format, and the
`Resolve Primary Location Locally` node itself are unchanged.

**Fix for Defect B — the batch loop was removed.** `Persist Latest Records One at a Time` existed
only to force `Get Existing Latest Event Row` to return exactly one row per candidate, which is the
same Supabase-drops-unmatched-items behaviour as Defect A. It is deleted, and
`Retry Once?` (false) now flows straight to `Prepare Latest Event Row` →
`Get Existing Latest Event Row` → `Determine Latest Record Persistence` → `Latest Record Exists?` →
`Save Latest Event Record` / `Create Latest Event Record`. `Determine Latest Record Persistence`
now runs once for all items and joins the existing-row lookup back onto every candidate by
`candidate_key`, setting `existing_id` only where a row already exists. With no loop, the first-pass
and retry-pass items each persist independently and correctly, so neither can displace the other.

**First attempt at Consequence C — superseded, see below.** `Build Phase 3 Stage Result` was changed
to walk `$('Prepare Latest Event Row').all(0, runIndex)` over increasing run indexes. That approach
turned out to be invalid and was replaced; the working fix is described further down.

**Fix A verified, plus one knock-on correction (execution `1633`).** The first re-run proved Fix A
works: `Resolve Primary Location Locally` returned only 2 gazetteer rows, and
`Attach Local Coordinates` still emitted all **6** candidates, correctly marked `RESOLVED`,
`UNRESOLVED`, and `NO_GROUNDED_LOCATION`. The run then failed at `Build Taxonomy Request` with
`Paired item data … is unavailable`: because `Attach Local Coordinates` now rebuilds the candidate
list rather than passing its input through, n8n can no longer trace an item back through that node,
and `Build Taxonomy Request` was reading `$('Collect Active Event Types').item`. Changed to
`.first()`, which is equivalent because that node always holds exactly one item of active taxonomy
leaves, and no longer depends on paired-item tracing. Every other cross-node `.item` reference in
Phase 3 was checked and all of them point at nodes downstream of the rebuild, so none is affected.

**Defects A and B are confirmed fixed (execution `1635`, success, 2m10s).**
`terra_space_event_records` now holds a row for **all 6** distinct `candidate_key` values for this
article, where it previously held 2. The four candidates that used to be deleted at the gazetteer
step are now present and all reached `FINAL` with `CLASSIFIED` taxonomy, `ACCEPT` safeguard, and a
`UNRESOLVED` location status — visible, retained records instead of silent deletion. No candidate is
lost between expansion and persistence any more.

**Consequence C needed a second, different fix.** The first attempt had
`Build Phase 3 Stage Result` walk `$('Prepare Latest Event Row').all(0, runIndex)` over increasing
run indexes. That does not work: the run-index argument is not honoured the way the code assumed, so
every iteration returned the same final run and the deduplication collapsed it back to that one
run's 2 candidates — reported as `processed_candidate_count: 2, final_count: 1, exception_count: 1`
while 6 candidates had in fact persisted. A Code node cannot read another node's earlier runs, and
first-pass and retry-pass candidates are inherently persisted in different runs, so no in-memory
aggregation across them is possible.

Replaced with an explicit read-back. `Normalize Phase 3 Input` now also emits `run_started_at`, and
a new Supabase node `Get This Run's Record Runs` reads `terra_space_event_record_runs` filtered by
`p1_news_uuid` and `processed_at >= run_started_at`, so it returns exactly the append-only rows this
execution wrote and nothing from an earlier one. `Build Phase 3 Stage Result` now aggregates that
result, keeping the highest `attempt_number` per `candidate_key`. This still honours the plan's
constraint against summarising from the latest table, because the run-history table is append-only
and the time filter scopes it to this execution. Phase 3 is now 33 nodes, 0 errors, 0 warnings.

**Task 3 Step 4 is now fully verified (execution `1637`, success, 2m15s).** Every number agrees
across the stage result, the append-only history, and the latest table:

- Stage result: `{stage: 'PHASE_3', status: 'COMPLETED', p1_uuid: 'b7c73695-…', final_count: 4, exception_count: 2, processed_candidate_count: 6}`.
- `terra_space_event_record_runs` gained 8 rows for this execution: all 6 candidates at
  `attempt_number: 1`, plus `attempt_number: 2` for the two that failed — the one-retry rule
  behaving exactly as specified.
- `terra_space_event_records` holds 6 rows, one per `candidate_key`: 4 `FINAL` with
  `safeguard_status: ACCEPT` and `attempts_used: 1`, and 2 `EXCEPTION` with
  `safeguard_status: REJECT` and `attempts_used: 2`. Every row's `processed_at` comes from this
  execution, so all 6 were written by this run.

This also confirms the three protected behaviours the step asks for: a successful candidate reports
`FINAL`; a rejected candidate retries exactly once and is then retained as `EXCEPTION`; and one
candidate's exception does not stop the others from becoming final. Location handling is honest
too — 2 rows `RESOLVED` against the gazetteer, 4 `UNRESOLVED`, none deleted.

**The one-click path works end to end (master execution `1638`, success, 3m03s).** One form
submission of an Independent live-blog article ran Phase 1 (`1639`), Phase 2 (`1640`), and Phase 3
(`1641`) in sequence, each waiting for the previous stage. No UUID was ever shown to or entered by
the user. The master returned:

```
status: COMPLETED
p1_uuid: 3070cf55-8326-4e4c-99df-d6db00df9cf1
phase_1: SUCCESS, cleaned_character_count 8334
phase_2: EVENT_CANDIDATES_FOUND, MAIN_ISSUE_FOUND, candidate_count 5
phase_3: COMPLETED, final_count 4, exception_count 1, processed_candidate_count 5
message: Saved article; found 5 candidate(s); created 4 final record(s) and 1 exception(s).
```

Read-only database checks against `3070cf55-8326-4e4c-99df-d6db00df9cf1` agree with every number:
1 `terra_space_news_v2` row (no duplicate), 1 `terra_space_event_candidate_runs` history row, 1
`terra_space_event_candidates` latest row holding 5 candidates, 7
`terra_space_event_record_runs` rows, and 5 `terra_space_event_records` rows — 4 `FINAL` and 1
`EXCEPTION`, matching the summary exactly.

Grounding holds throughout: all 5 Phase 2 candidate evidence quotes and all 8 Phase 3 source-actor
evidence quotes are exact substrings of `p1_clean_content_text`.

The run history also shows the retry rule working in both directions, which earlier runs had not
demonstrated: attempt 1 produced 3 `FINAL` and 2 `EXCEPTION`; of the two retries, one was rescued to
`FINAL` and one stayed `EXCEPTION` and was retained. A single exception did not affect any other
candidate.

**Next:** the remaining negative cases and the manual-recovery check in the unchecked steps below —
empty raw article text, an article that yields no grounded candidate, and a malformed UUID.

### What was built

Each stage keeps its original interactive trigger and gains an `Execute Workflow Trigger` beside it,
with both routed through one shared normalizer, plus a small node that returns the stage's agreed
result contract. Each internal trigger declares its contract as explicit named inputs, so the master
workflow maps fields by name rather than passing an unshaped item through.

- **Phase 1** — added `Phase 1 Internal Input` (six declared article fields),
  `Normalize Phase 1 Input` (rejects a blank required field before any LM Studio call or Supabase
  insert), and `Build Phase 1 Stage Result` after the save node.
- **Phase 2** — added `Phase 2 Internal Input`, `Normalize Phase 2 Input`, and
  `Build Phase 2 Stage Result` after both the create and update branches, reading
  `Prepare Event Candidate Result` so both branches return the same shape.
- **Phase 3** — added `Phase 3 Internal Input`, `Normalize Phase 3 Input` (fed by the chat trigger,
  the test webhook, and the internal trigger), `Get This Run's Record Runs`, and
  `Build Phase 3 Stage Result`. Removed `Persist Latest Records One at a Time`; see Defect B.
- **Master** — `Terra Space - Full News Processing`: one Form Trigger at
  `terra-space-full-news-processing` with the same six fields, three Execute Sub-workflow calls that
  each wait for completion, guarded by `Phase 1 Succeeded?` and `Candidates Found?`, and three
  terminal summary nodes.

### Deviations from the written plan

1. **Phase 3 aggregate UUID fallback.** The plan's fallback reads
   `$('Parse Phase 1 UUID').first().json.p1_uuid`. That node does not run when Phase 3 is called
   through `Phase 3 Internal Input`, so the reference would fail exactly in the master-workflow
   path. The fallback now reads `$('Normalize Phase 3 Input').first().json.p1_uuid`, which runs on
   every entry path.
2. **`Build No-Candidate Summary` distinguishes a failure from an empty result.** The plan asks
   this node to report `COMPLETED_NO_CANDIDATE`. The false branch of `Candidates Found?` also
   catches a Phase 2 `FAILED` result, and reporting that as a completion would hide the failure
   that Task 5 Step 2 is meant to detect. The node now reports `COMPLETED_NO_CANDIDATE` only for
   `NO_EVENT_CANDIDATE`, and `FAILED` with `failed_phase: 'PHASE_2'` otherwise. A genuine
   no-candidate article is still treated as a successful pipeline completion.
3. **No workflow exports were committed.** The checkpoint steps allow for this: the repository has
   no n8n export folder, so workflow JSON is not versioned locally. n8n's own version history holds
   the previous versions.

4. **Task 3 Step 3's batch-loop contingency is moot.** The step anticipated that the loop's
   completed output might not expose every persisted row, and offered a per-execution outcome array
   as the alternative. The loop's completed output did fire, but the loop itself was the source of
   Defect B and has been removed, so neither the original design nor that contingency survives. The
   terminal aggregate now reads back this execution's own append-only run rows instead.

### Production-readiness verification (2026-08-09)

Run with all four workflows inactive throughout. Because nothing is activated, every check needed
the owner to arm a trigger from the n8n editor; the payloads were then sent from the host so the
inputs were exact.

**Check 1 — empty article text fails safely. PASSED.** Master `1643` → Phase 1 `1644`, failed in
154 ms at `Normalize Phase 1 Input` with `Phase 1 input is missing p1_raw_content_text.` The
execution path contains only the skipped form trigger and the normalizer: no LM Studio call, no
Supabase insert, and Phase 2 was never invoked. Row counts before and after were identical
(`terra_space_news_v2` 8, Phase 2 history 22, Phase 2 latest 8, Phase 3 runs 116, Phase 3 latest 15)
and no row matches the test title.

Two things this check surfaced that are worth keeping:

- **The blank-text condition cannot be produced from the browser at all.** n8n's form validation
  trims whitespace, so it rejects even a single space as empty. `Normalize Phase 1 Input` is
  therefore defence-in-depth reachable only by a non-browser caller — which is exactly the internal
  trigger the master workflow uses, and exactly what this check exercised.
- Execution `1642` is a test-harness artifact, not a product defect: the first attempt posted JSON
  where n8n's Form node requires `multipart/form-data`, so it failed at the trigger and wrote
  nothing. The successful attempt posted `field-0`…`field-5` as multipart, matching the field order
  in the form definition.

**Check 3 — malformed UUID rejected before any database access. PASSED for Phase 3.** Execution
`1646` failed in 85 ms at `Parse Phase 1 UUID` with `Paste one valid Phase 1 article UUID as your
chat message.` The execution path stops there, so `Get Phase 1 Source` never ran and no query or
write occurred. Note which guard fires where: the chat and webhook paths are caught by
`Parse Phase 1 UUID`, which runs first, while `Normalize Phase 3 Input` is the equivalent guard on
the internal path. Both exist and neither reaches Supabase.

Execution `1645` is another harness artifact: using **Execute step** on a trigger node only captures
a sample payload and runs that node alone, so it produced a 13-ms no-op. Running a webhook path end
to end requires the main **Execute workflow** button with that trigger selected. The same mistake
explains the earlier 31-ms execution `1629`.

**Checks 4, 5 and 6 — one run covers all three. PASSED.** Execution `1647` (2m03s) re-ran Phase 3
through the test webhook for `3070cf55-8326-4e4c-99df-d6db00df9cf1`, the 5-candidate article from
master run `1638`.

| Candidate key suffix | Run rows this execution | Max attempt | Latest outcome | Latest `attempts_used` |
|---|---|---|---|---|
| `3039:3275` | 2 | 2 | `EXCEPTION` | 2 |
| `3505:3683` | 1 | 1 | `FINAL` | 1 |
| `5039:5179` | 1 | 1 | `FINAL` | 1 |
| `6207:6355` | 1 | 1 | `FINAL` | 1 |
| `7395:7529` | 2 | 2 | `FINAL` | 2 |

- **Check 6 (no records dropped):** all 5 expanded candidates reconcile against both tables, and
  every latest row's `attempts_used` matches its highest attempt in the history.
- **Check 5 (webhook parity):** the stage result was `final_count: 4, exception_count: 1,
  processed_candidate_count: 5` — the same protected behaviour as the internal trigger.
- **Check 4 (manual recovery):** Phase 3 run rows went 7 → 14 (append-only history retained), Phase
  3 latest rows stayed at 5 (updated in place by `candidate_key`, no duplicates), `terra_space_news_v2`
  stayed at 8 (no duplicate Phase 1 row), and Phase 2 history stayed at 1 (Phase 3 did not touch
  Phase 2).

One honest caveat: the outcome distribution is not identical between runs of the same article. Here
`7395:7529` failed its first attempt and was rescued on retry, and a different candidate ended as the
exception than in master run `1638`. The counts matched, the safeguard behaved correctly, and nothing
was lost — this is the local model's documented run-to-run non-determinism, not a pipeline fault.

**Check 3 — malformed UUID. PASSED for Phase 2 as well.** Executions `1648` and `1649` failed in
41 ms and 24 ms at `Parse Phase 1 UUID from Message` with the same guard message. The path contains
only the chat trigger and the parse node, so `Get Phase 1 Article` never ran and no query occurred.

**Check 4 — manual recovery. PASSED for Phase 2.** Execution `1650` (22.9s) re-ran Phase 2 through
the chat trigger for `3070cf55-8326-4e4c-99df-d6db00df9cf1` and returned
`EVENT_CANDIDATES_FOUND`, `MAIN_ISSUE_FOUND`, 5 candidates. The latest-plus-history behaviour is
exactly as designed:

| Row | id | `processed_at` | Candidates |
|---|---|---|---|
| history (master run `1638`) | 54 | 14:13:13 | 5 |
| history (recovery run `1650`) | 55 | 15:59:52 | 5 |
| latest | 41 | 15:59:52 | 5 |

Both history rows retained, one latest row updated in place to match the newest run. No duplicate
Phase 1 row (`terra_space_news_v2` still 8 at that point) and the Phase 3 tables were untouched.

**Check 2 — no-candidate article. FAILED on its first run, then fixed.** Master `1651` (11.3s) →
Phase 1 `1652` → Phase 2 `1653` (1.1s), on a deliberately eventless instructional article about
cooking rice, Phase 1 UUID `76d8e150-9a67-4303-badb-324d20ad48a9`.

The data behaviour was correct in every respect: 1 Phase 1 row, 1 Phase 2 history row, 1 Phase 2
latest row, and **0 Phase 3 run rows and 0 Phase 3 latest rows — Phase 3 was never invoked.** The
model also behaved correctly, returning `{"status":"NO_MAIN_ISSUE","main_issue":null}` in 1.1
seconds.

The *reported outcome* was wrong. The master returned `status: 'FAILED'` with
`failed_phase: 'PHASE_2'`, when this is a normal successful completion.

Root cause: an article with no main issue never reaches candidate detection, so Phase 2 leaves
`event_detection_status` as `NOT_RUN`. `Build Phase 2 Stage Result` recognised only
`EVENT_CANDIDATES_FOUND` and `NO_EVENT_CANDIDATE`, so `NOT_RUN` fell through to `FAILED`, and the
master faithfully reported a failure that had not happened. This traces to this plan's own internal
contract table, which lists Phase 2's status as
`EVENT_CANDIDATES_FOUND | NO_EVENT_CANDIDATE | FAILED` and has no representation for `NO_MAIN_ISSUE`
— a legitimate Phase 2 outcome that predates this plan. It contradicts the Global Constraint that a
no-candidate result is a successful pipeline completion, not an error.

Fixed with the owner's approval, in `Build Phase 2 Stage Result` only: `NO_MAIN_ISSUE` combined with
`event_detection_status: 'NOT_RUN'` now maps to `NO_EVENT_CANDIDATE`, because the outcome is
materially identical — no grounded candidates and nothing for Phase 3 to do. Genuine model or
validation failures still map to `FAILED`, and `main_issue_status` is still returned so a caller can
tell "no main issue" from "main issue but no candidate". No detection, grounding, or persistence
logic changed. Phase 2 re-validates at 0 errors and 0 warnings.

This branch had never been exercised in any run, here or in the earlier Phase 2 testing, which is
precisely why it still contained an unnoticed fault.

**Check 2 re-run after the fix — PASSED.** Master `1654` (11.0s) → Phase 1 `1655` → Phase 2 `1656`
on the same eventless article, Phase 1 UUID `9e86df74-0420-445b-8e00-8ca60cbc4ded`. The master now
returns:

```
status: COMPLETED_NO_CANDIDATE
failed_phase: null
p1_uuid: 9e86df74-0420-445b-8e00-8ca60cbc4ded
phase_1: SUCCESS, cleaned_character_count 1889
phase_2: NO_EVENT_CANDIDATE, main_issue_status NO_MAIN_ISSUE, candidate_count 0
phase_3: null
message: Saved article; no grounded event candidate was found, so no event record was
         created. This is a normal, successful outcome.
```

Database state confirms it: 1 Phase 1 row, 1 Phase 2 history row, 1 Phase 2 latest row retaining
`main_issue_status: NO_MAIN_ISSUE`, and 0 rows in both Phase 3 tables — Phase 3 still never invoked.
The Phase 1 UUID is preserved throughout, and `main_issue_status` still distinguishes "no main
issue" from "main issue but no grounded candidate".

**All six production-readiness checks now pass.**

### Verification still owed

All six production-readiness checks pass. One item remains.

1. **Activation** (Task 5 Step 5). Ask the owner whether to activate
   `Terra Space - Full News Processing`, and only then activate it. Activating would also make the
   Phase 3 production webhook reachable; the test webhook path is already verified, so activation is
   the only thing that path still waits on.

Everything else in this section is complete. Note for whoever runs the remaining item: both
harness lessons above still apply — the master form needs `multipart/form-data` with `field-0`…
`field-5`, and **Execute step** on a trigger node only captures a sample payload, so a webhook path
needs the main **Execute workflow** button with that trigger selected.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user submit one article once and receive Phase 1 storage, Phase 2 candidate detection, and Phase 3 guarded event records without manually passing a UUID between workflows.

**Architecture:** Keep `Terra Space - Input News Manual`, `Terra Space - Event Candidates`, and `Terra Space - Event Records` as the owners of their existing processing and persistence rules. Add an Execute Workflow Trigger-compatible input to each, normalize interactive and internal inputs into one shared path, and return a compact stage result. Create `Terra Space - Full News Processing` as the only new user-facing form; it invokes each stage synchronously and stops safely at defined boundaries.

**Tech Stack:** n8n Form Trigger, Chat Trigger, Execute Workflow Trigger, Execute Sub-workflow, Code, IF, HTTP Request, and Supabase nodes; local LM Studio OpenAI-compatible endpoint; local Supabase/Postgres.

## Global Constraints

- Do not change the Phase 1/2/3 table schemas or erase existing rows.
- Keep all AI calls local and retain the existing `google/gemma-4-12b-qat`, temperature `0.1`, `reasoning_effort: 'none'`, and 180-second HTTP timeout configuration.
- Keep the Phase 2 exact-quote validation and Phase 3 field-level grounding, local-gazetteer lookup, closed-taxonomy validation, independent safeguard, and one-retry rule unchanged.
  - **Amended 2026-08-09 with the owner's explicit approval ("Fix both now").** Two pre-existing
    Phase 3 defects that silently deleted candidates were allowed to be fixed. The amendment covers
    only the plumbing that lost records; every grounding rule, the gazetteer data and its lookup
    key, the closed taxonomy, the independent safeguard, and the one-retry rule are unchanged. See
    Defects A and B in the execution status below.
- Use one explicit internal contract per stage; never have the master workflow simulate a form submission or chat message.
- Existing form/chat/test-webhook paths remain available for controlled manual testing and recovery.
- The master workflow must wait for each sub-workflow to finish before continuing.
- A `NO_EVENT_CANDIDATE` result is a successful pipeline completion, not an error.
- Do not activate any workflow or change a production trigger URL without the owner explicitly asking for activation after testing.
- Durable documentation stays under `project-knowledge/`.

## Internal stage contracts

| Stage workflow | Internal input | Required returned result |
|---|---|---|
| `Terra Space - Input News Manual` | `{ p1_published_date, p1_title, p1_raw_content_text, p1_source_domain, p1_source_url, p1_author }` | `{ stage: 'PHASE_1', status: 'SUCCESS', p1_uuid, p1_title, cleaned_character_count }` |
| `Terra Space - Event Candidates` | `{ p1_uuid }` | `{ stage: 'PHASE_2', status: 'EVENT_CANDIDATES_FOUND' | 'NO_EVENT_CANDIDATE' | 'FAILED', p1_uuid, candidate_count, main_issue_status, error_message }` |
| `Terra Space - Event Records` | `{ p1_uuid }` | `{ stage: 'PHASE_3', status: 'COMPLETED' | 'FAILED', p1_uuid, final_count, exception_count, processed_candidate_count, error_message }` |

---

### Task 1: Make Phase 1 callable without changing its cleaning rules

**Files:**
- Modify: n8n workflow `Terra Space - Input News Manual` (`gABPryH3jTe2Ktz5`).
- Test: n8n manual execution with one fixed article payload and existing Supabase test data.

**Interfaces:**
- Consumes: the Phase 1 internal input contract above, or the existing `Manual News Entry Form (Phase 1)` fields.
- Produces: the Phase 1 internal result contract; one inserted `terra_space_news_v2` row only after cleaned-text length validation passes.

- [x] **Step 1: Capture a safe baseline**

Run n8n runtime validation for `gABPryH3jTe2Ktz5`, export the workflow JSON/version, and record its current six-node graph. Confirm the current form and saved table fields remain: raw text, cleaned text, metadata, and `p1_collection_source: 'manual_input'`.

- [x] **Step 2: Add an internal trigger and input normalizer**

Add an `Execute Workflow Trigger` named `Phase 1 Internal Input`. Add a Code node named `Normalize Phase 1 Input` and route both the existing form trigger and the new internal trigger into it.

Use this code logic (with normal n8n `$json` syntax):

```javascript
const required = [
  'p1_published_date', 'p1_title', 'p1_raw_content_text',
  'p1_source_domain', 'p1_source_url', 'p1_author',
];
for (const field of required) {
  if (!String($json[field] ?? '').trim()) {
    throw new Error(`Phase 1 input is missing ${field}.`);
  }
}
return [{ json: { ...$json, p1_collection_source: 'manual_input' } }];
```

Route `Normalize Phase 1 Input` to the existing `Remove Obvious Non-Article Text` node. Do not duplicate cleaning prompt or LM Studio nodes.

- [x] **Step 3: Write a small, explicit Phase 1 result after persistence**

After `Save Manual News to Supabase`, add `Build Phase 1 Stage Result` (Code) with the following output. Ensure the save node's returned row supplies `p1_uuid`.

```javascript
const saved = $json;
const source = $('Prepare Clean Text for Supabase').first().json;
if (!saved.p1_uuid) throw new Error('Phase 1 save did not return p1_uuid.');
return [{
  json: {
    stage: 'PHASE_1', status: 'SUCCESS', p1_uuid: saved.p1_uuid,
    p1_title: source.p1_title,
    cleaned_character_count: String(source.p1_clean_content_text ?? '').length,
  },
}];
```

- [x] **Step 4: Verify failure and success behavior** — success via `1626`/`1639`/`1655`; empty-text failure via `1644`.

Run the workflow through `Phase 1 Internal Input` with a valid article. Verify exactly one new source row, the returned UUID, and a cleaned length at least the existing threshold. Run it with empty raw text and verify it fails before LM Studio or Supabase insertion.

- [ ] **Step 5: Validate and checkpoint**

Run n8n runtime validation. Confirm the original form still reaches the shared normalizer, the internal trigger reaches it too, and there are no warnings. Save/export the revised workflow and commit only files belonging to this task if workflow exports are versioned locally.

### Task 2: Make Phase 2 callable and return a stable candidate summary

**Files:**
- Modify: n8n workflow `Terra Space - Event Candidates` (`pO6m1mpaHz2Ae5ZR`).
- Test: n8n chat and Execute Workflow Trigger executions using one existing Phase 1 UUID with known grounded candidates, plus one UUID with no candidates if available.

**Interfaces:**
- Consumes: `{ p1_uuid }` from the master or a UUID parsed from the existing chat message.
- Produces: the Phase 2 internal result contract after it has written `terra_space_event_candidate_runs` and created/updated `terra_space_event_candidates`.

- [x] **Step 1: Preserve the chat entry point and add the internal trigger**

Add an `Execute Workflow Trigger` named `Phase 2 Internal Input` and a Code node named `Normalize Phase 2 Input` directly before `Get Phase 1 Article`.

Keep `Event Candidate UUID Chat` → `Parse Phase 1 UUID from Message`, then route it into the normalizer. Route the internal trigger into the same normalizer. Use this normalizer:

```javascript
const p1_uuid = String($json.p1_uuid ?? '').trim();
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p1_uuid)) {
  throw new Error('Paste or provide one valid Phase 1 article UUID.');
}
return [{ json: { p1_uuid } }];
```

- [x] **Step 2: Keep the current detection and persistence order**

Do not alter the core chain: load cleaned source → main issue request → main issue quote validation → candidate request when grounded → candidate schema/quote validation → `Prepare Event Candidate Result` → `Create Run History` → create/update latest result. In particular, history must continue to be written before the latest row is changed.

- [x] **Step 3: Add a Phase 2 summary node after both latest-row branches**

Connect `Create Event Candidate Result` and `Update Event Candidate Result` to a new Code node named `Build Phase 2 Stage Result`. It must read the prepared result rather than depend on branch-specific Supabase response shapes:

```javascript
const result = $('Prepare Event Candidate Result').first().json;
const candidates = Array.isArray(result.event_candidates) ? result.event_candidates : [];
const status = result.event_detection_status === 'EVENT_CANDIDATES_FOUND'
  ? 'EVENT_CANDIDATES_FOUND'
  : result.event_detection_status === 'NO_EVENT_CANDIDATE'
    ? 'NO_EVENT_CANDIDATE'
    : 'FAILED';
return [{ json: {
  stage: 'PHASE_2', status, p1_uuid: result.p1_news_uuid,
  candidate_count: candidates.length,
  main_issue_status: result.main_issue_status,
  error_message: result.error_message ?? null,
} }];
```

- [x] **Step 4: Verify both entry paths and result shapes** — internal via `1640`/`1656`, chat via `1650`; `NO_EVENT_CANDIDATE` via `1656`.

Execute through the chat trigger and through `Phase 2 Internal Input` using the same UUID. Verify both produce the same status and candidate count, append one history row per execution, and update only the single latest row for that UUID. Then test a `NO_EVENT_CANDIDATE` article: it must return `NO_EVENT_CANDIDATE` with `candidate_count: 0` and no Phase 2 failure.

- [x] **Step 5: Validate and checkpoint** — 0 errors/0 warnings; malformed UUID stops at `Parse Phase 1 UUID from Message` (`1648`/`1649`); chat path intact.

Run n8n runtime validation with expression checks. Save/export the workflow. Confirm malformed UUIDs stop before the Phase 1 query and that the chat path has not been removed.

### Task 3: Make Phase 3 callable and aggregate its per-candidate outcome

**Files:**
- Modify: n8n workflow `Terra Space - Event Records` (`qsbIodzbMPxgQeRg`).
- Test: n8n chat/webhook/internal executions using a UUID with multiple known candidates, including an exception case if available.

**Interfaces:**
- Consumes: `{ p1_uuid }` from the master, chat, or existing test webhook.
- Produces: the Phase 3 internal result contract only after all candidates have reached either `FINAL` or two-attempt `EXCEPTION` persistence.

- [x] **Step 1: Add a shared UUID normalizer**

Add `Phase 3 Internal Input` (`Execute Workflow Trigger`) and `Normalize Phase 3 Input` (Code). Route the existing chat parse node, test webhook parse node, and internal trigger into it, then route it to `Get Phase 1 Source`. Use the same UUID regular expression and error text from Task 2.

- [x] **Step 2: Preserve the protected candidate pipeline**

Do not alter the sequence after source loading: active taxonomy lookup → latest candidate retrieval → only quote-grounded candidate expansion → factual enrichment and field grounding → deterministic location lookup → exact active taxonomy leaf or `UNCLASSIFIED` → independent safeguard → append-only run save → at most one retry → latest-row create/update by `candidate_key`.

- [x] **Step 3: Add a terminal aggregate node after the batch loop completes**

Connect the completed-output path of `Persist Latest Records One at a Time` to `Build Phase 3 Stage Result` (Code). It must aggregate the latest persisted items for this execution, not query or overwrite Phase 1/2 data:

```javascript
const rows = $input.all().map((item) => item.json);
const p1_uuid = rows[0]?.p1_news_uuid ?? $('Parse Phase 1 UUID').first().json.p1_uuid;
const final_count = rows.filter((row) => row.pipeline_outcome === 'FINAL').length;
const exception_count = rows.filter((row) => row.pipeline_outcome === 'EXCEPTION').length;
return [{ json: {
  stage: 'PHASE_3',
  status: rows.length ? 'COMPLETED' : 'FAILED',
  p1_uuid,
  final_count,
  exception_count,
  processed_candidate_count: rows.length,
  error_message: rows.length ? null : 'No Event Record rows were persisted.',
} }];
```

If the current `Split In Batches` node cannot expose all final rows on its completed output, insert a Code node before the loop that stores a per-execution outcome array and make the terminal node aggregate that array. Do not query the latest table for this summary because it can contain a previous execution's rows.

- [x] **Step 4: Verify protected outcomes** — verified by execution `1637`; see the execution status above.

Run through `Phase 3 Internal Input` and confirm the summary counts match new `terra_space_event_record_runs` rows and the latest `terra_space_event_records` rows. Verify a successful candidate reports `FINAL`; a rejected candidate retries exactly once and then reports `EXCEPTION`; one exception does not prevent other candidates from becoming final.

- [x] **Step 5: Verify legacy entry points and checkpoint** — chat via `1630`/`1631`/`1637`, test webhook via `1646`/`1647`; 0 errors/0 warnings.

Run the existing chat path and the test webhook with the same UUID. Verify they produce the same persisted results as the internal trigger. Run n8n runtime validation and save/export the workflow.

### Task 4: Build the master one-click workflow

**Files:**
- Create: n8n workflow `Terra Space - Full News Processing`.
- Test: n8n form execution with a controlled article and an LM Studio test model.

**Interfaces:**
- Consumes: the same six source fields as the existing Phase 1 form.
- Produces: one completion object with `{ status, p1_uuid, phase_1, phase_2, phase_3, message }`.

- [x] **Step 1: Create the master form**

Create one Form Trigger named `Full News Processing Form` at the path `terra-space-full-news-processing`. Reuse exactly these required fields: `p1_published_date` (date), `p1_title`, `p1_raw_content_text` (textarea), `p1_source_domain`, `p1_source_url`, and `p1_author`. Do not expose a UUID field to the user.

- [x] **Step 2: Call Phase 1 synchronously**

Add `Execute Sub-workflow` node `Run Phase 1 Input and Cleaning`, select workflow `gABPryH3jTe2Ktz5`, configure it to wait for completion, and map all six form fields unchanged. Its output must be the Phase 1 internal result contract.

Add an IF node `Phase 1 Succeeded?` with condition:

```javascript
{{ $json.stage === 'PHASE_1' && $json.status === 'SUCCESS' && !!$json.p1_uuid }}
```

The false branch goes to `Build Pipeline Failure Summary` with phase `PHASE_1`; it must not call Phase 2.

- [x] **Step 3: Call Phase 2 synchronously and branch on no candidates**

On the true branch, add `Execute Sub-workflow` node `Run Phase 2 Event Candidates`, wait for completion, and map `{ p1_uuid: $json.p1_uuid }`. Add `Candidates Found?`:

```javascript
{{ $json.stage === 'PHASE_2' && $json.status === 'EVENT_CANDIDATES_FOUND' && $json.candidate_count > 0 }}
```

The false branch goes to `Build No-Candidate Summary`. Its output must preserve the Phase 1 UUID and report `status: 'COMPLETED_NO_CANDIDATE'`, rather than treating this normal outcome as a failure.

- [x] **Step 4: Call Phase 3 synchronously and construct the successful response**

On the true branch, add `Execute Sub-workflow` node `Run Phase 3 Event Records`, wait for completion, and map the same Phase 1 UUID. Add `Build Full Pipeline Summary` (Code):

```javascript
const phase_1 = $('Run Phase 1 Input and Cleaning').first().json;
const phase_2 = $('Run Phase 2 Event Candidates').first().json;
const phase_3 = $json;
return [{ json: {
  status: phase_3.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
  p1_uuid: phase_1.p1_uuid,
  phase_1, phase_2, phase_3,
  message: phase_3.status === 'COMPLETED'
    ? `Saved article; found ${phase_2.candidate_count} candidate(s); created ${phase_3.final_count} final record(s) and ${phase_3.exception_count} exception(s).`
    : 'Phase 3 did not complete; earlier stage data was retained.',
} }];
```

- [x] **Step 5: Test the master workflow's three terminal paths** — (a) `1638`, (b) `1654`, (c) `1643`.

Run controlled form submissions for: (a) an article with grounded candidates, (b) an article with no main issue or no grounded candidate, and (c) a deliberately invalid/empty input. Verify no UUID needs to be copied by the user, each summary is accurate, no stage runs after its predecessor fails, and every persisted row remains traceable through its Phase 1 UUID.

- [x] **Step 6: Validate and keep it inactive**

Run n8n runtime validation (including expressions and connections). Confirm the workflow has no activation side effect. Leave it inactive while the broader reliability test is completed.

### Task 5: End-to-end verification, recovery checks, and project knowledge

**Files:**
- Modify: `project-knowledge/Current-Status.md`.
- Modify: `project-knowledge/Project-Knowledge-Log.md`.
- Modify: `project-knowledge/Project-knowledge-Index.md`.
- Test: the four n8n workflows and read-only Supabase queries.

**Interfaces:**
- Consumes: the stage contracts from Tasks 1–3 and master summary from Task 4.
- Produces: verified evidence that one form submission is safe, traceable, and recoverable.

- [x] **Step 1: Run a full traceable success case** — verified by master execution `1638`; see the execution status above.

Submit one controlled article through the master form. Record the returned Phase 1 UUID; verify its Phase 1 source row, one Phase 2 history row and latest result, and one or more Phase 3 run/latest rows. Check that Phase 2 candidate evidence quotes and Phase 3 factual evidence quotes are exact substrings of `p1_clean_content_text`.

- [x] **Step 2: Run failure-isolation checks** — missing text `1643`; no-candidate `1654`; Phase 3 exception retained with two attempts in `1647`. No test data deleted.

Test: missing raw article text (no Phase 1 insert); an article returning no candidate (Phase 1/2 saved, Phase 3 not invoked); a model-invalid Phase 2 response (Phase 2 history records failure, Phase 3 not invoked); and a Phase 3 safeguard rejection (two history attempts and a retained `EXCEPTION`). Do not delete test data; identify it by its UUID and test title.

- [x] **Step 3: Verify manual recovery remains possible** — Phase 2 chat `1650`, Phase 3 webhook `1647`; history retained, latest rows updated in place, no duplicate Phase 1 row.

For the same Phase 1 UUID, manually invoke the Phase 2 and Phase 3 interactive entry points. Confirm they still accept a UUID, preserve history, and update their own latest rows without creating duplicate Phase 1 rows.

- [ ] **Step 4: Update project knowledge and validate it**

Update `Current-Status.md` with the workflow ID, activation state, verified execution IDs, verified terminal-path results, and the next reliability-testing action. Add a concise implementation record to `Project-Knowledge-Log.md`. Add this plan to `Project-Knowledge-Index.md` if it is not already linked.

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: `0 error(s), 0 warning(s)`.

- [ ] **Step 5: Request activation separately**

Report the test evidence and leave all workflows inactive. Ask the owner whether to activate `Terra Space - Full News Processing` and, if desired, the three supporting manual workflows. Activate only after that explicit confirmation.

## Plan self-review

- Spec coverage: Tasks 1–3 create the reusable stage boundaries; Task 4 creates the one-submit path; Task 5 tests safe stopping, history, recovery, and documentation.
- Placeholder scan: no deferred implementation placeholders are used; the one batch-loop contingency gives a concrete constraint and a non-stale alternative that must be resolved from the live n8n node behavior.
- Contract consistency: Phase 1 returns `p1_uuid`; Phase 2 and Phase 3 receive that field; all master branches return or preserve that UUID.

# Navigation

- [One-Click Full News Processing decision](../decisions/One-Click-Full-News-Processing.md)
- [Phase 3 Event Records plan](2026-08-07-phase-3-event-records.md)
- [Project Knowledge](../Project-knowledge-Index.md)
