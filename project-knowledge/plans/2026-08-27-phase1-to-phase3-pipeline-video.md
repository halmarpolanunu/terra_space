---
type: Plan
title: Phase 1 to Phase 3 Pipeline Video Implementation Plan
description: Plan for a short Remotion explainer that visualizes Terra Space article processing from Phase 1 through Phase 3.
tags: [project-knowledge, plan, remotion, video, phase-3]
status: completed
---

# Phase 1 to Phase 3 Pipeline Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one concise, silent, landscape MP4 explainer—maximum 15 seconds—showing how a Terra Space article moves from Phase 1 cleaning through Phase 3 Event Candidate detection.

**Architecture:** Add a new, isolated Remotion composition to the existing `terra-weekly-brief` project. It will use animated React/SVG shapes and text only: no article text, external media, local-AI call, n8n call, or database write occurs while rendering. The existing weekly-brief composition remains unchanged.

**Tech Stack:** Remotion 4.0.512, React 19, TypeScript, existing Tailwind-enabled Remotion project, and local MP4 rendering.

**Spec:** [Phase 3 Event Candidate Detection](../decisions/Phase-3-Event-Candidate-Detection.md) and [Phase 3 Event Candidate Detection Implementation Plan](2026-08-27-phase-3-event-candidate-detection.md)

## Global Constraints

- Use the existing project `terra-weekly-brief`; do not scaffold or replace a Remotion project.
- Create a new composition ID `TerraSpacePhasePipeline`; do not edit the timeline or content of `TerraWeeklyBrief`.
- Default delivery is a 15-second, 1920×1080, 30-fps, silent MP4. This format is clear for a presentation or YouTube; a vertical social version is a separate future composition.
- Use only verified current numbers: 29 cleaned articles, 29 Main Issues, 29 Phase 3 results, 109 Event Candidates, 12 `VALID`, and 17 `NEEDS_REVIEW`.
- Explain that a complete `NEEDS_REVIEW` output continues through the pipeline; only a technical `FAILED` result is requeued by the next owner-started manual run.
- Do not show article bodies, model outputs, source URLs, credentials, or personal data.
- Do not add actors, countries, locations, taxonomy, relationships, or final Event records to the visual; they are explicitly future work.
- Use Remotion frame-based animation (`useCurrentFrame()`, `interpolate()`, and `spring()`); do not use CSS animations or CSS transitions.
- Render only after the owner approves the final storyboard and presentation choices.

## Storyboard

| Time | Scene | Essential message |
| --- | --- | --- |
| 0–2 s | Opening | “Terra Space: Article → Event Candidates.” |
| 2–5 s | Phase 1 | Raw article → conservative cleaning → cleaned article. |
| 5–8 s | Phase 2 | Cleaned article → Main Issue → evidence check + safeguard. |
| 8–11 s | Phase 3 | Complete Main Issue → Event Candidates; `VALID` and `NEEDS_REVIEW` both continue. |
| 11–13 s | Status and retry | Complete `NEEDS_REVIEW` is retained; only technical `FAILED` enters an owner-started retry. |
| 13–15 s | Current verified state | 29 → 29 → 29, 109 candidates, and future scope boundary. |

### Task 1: Establish the video composition without changing the existing weekly brief

**Files:**

- Modify: `terra-weekly-brief/src/Composition.tsx`
- Create: `terra-weekly-brief/src/pipeline/PipelineVideo.tsx`

**Interfaces:**

- Consumes: Remotion `Composition` registration from `Composition.tsx`.
- Produces: composition ID `TerraSpacePhasePipeline`, `1920×1080`, `30` fps, and `450` frames.

- [x] **Step 1: Add a failing composition-registration check.**

  Run `npx remotion compositions` from `terra-weekly-brief`. Expected before implementation: the list does not contain `TerraSpacePhasePipeline`.

- [x] **Step 2: Add the new composition.**

  Register `<Composition id="TerraSpacePhasePipeline" component={PipelineVideo} durationInFrames={450} fps={30} width={1920} height={1080} />` alongside the existing weekly brief composition. Export `PipelineVideo` from its own new file.

- [x] **Step 3: Verify registration.**

  Run `npx remotion compositions`. Expected: both `TerraWeeklyBrief` and `TerraSpacePhasePipeline` appear.

### Task 2: Build one reusable pipeline-diagram visual language

**Files:**

- Create: `terra-weekly-brief/src/pipeline/pipeline-data.ts`
- Create: `terra-weekly-brief/src/pipeline/PipelineDiagram.tsx`

**Interfaces:**

- Consumes: phase labels, input/output labels, verified counts, and status rules from `pipeline-data.ts`.
- Produces: `PipelineDiagram` with props `{activePhase: 1 | 2 | 3 | 'all'; showCounts: boolean}`.

- [x] **Step 1: Define the fixed, reviewed display data.**

  Export Phase 1 as `Clean Articles`, Phase 2 as `Detect Main Issue`, Phase 3 as `Detect Event Candidates`; export the verified values `29`, `29`, `29`, `109`, `12`, and `17` as named constants. Do not read live database values during rendering.

- [x] **Step 2: Draw the full pipeline with stable semantic shapes.**

  Use one lane per phase, arrows left-to-right, rounded process blocks for actions, cylinder-shaped blocks for stored outputs, and a dashed outlined future-scope block. Show `Evidence quote check` and `Safeguard` in both Phase 2 and Phase 3.

- [x] **Step 3: Add restrained frame-based motion.**

  Reveal the active lane first, then its arrows and stored output. Use `interpolate()` with clamping and `spring()` for entry scale; respect the project’s existing dark visual background and amber accent.

- [x] **Step 4: Verify legibility.**

  Render stills at frames `90`, `210`, and `330` using `npx remotion still TerraSpacePhasePipeline --frame <frame> --output out/pipeline-<frame>.png`. Expected: no clipped labels and no unlabeled arrows at 1920×1080.

### Task 3: Assemble the six-scene, 15-second narrative

**Files:**

- Create: `terra-weekly-brief/src/pipeline/OpeningScene.tsx`
- Create: `terra-weekly-brief/src/pipeline/PhaseScene.tsx`
- Create: `terra-weekly-brief/src/pipeline/StatusRetryScene.tsx`
- Create: `terra-weekly-brief/src/pipeline/SummaryScene.tsx`
- Modify: `terra-weekly-brief/src/pipeline/PipelineVideo.tsx`

**Interfaces:**

- Consumes: `PipelineDiagram`, constants from `pipeline-data.ts`, and Remotion `Sequence`.
- Produces: the exact storyboard timing described above.

- [x] **Step 1: Implement the opening and Phase 1 sequence.**

  Put the title in frames `0–59`; show the Phase 1 lane in frames `60–149`. Keep copy to “Raw article → Cleaned article” and “Conservative cleaning.”

- [x] **Step 2: Implement Phase 2 and Phase 3 sequences.**

  Show Phase 2 in frames `150–239` and Phase 3 in frames `240–329`. In Phase 3, visibly state “VALID and NEEDS_REVIEW input both continue.”

- [x] **Step 3: Implement status/retry and final summary.**

  In frames `330–389`, animate the three states and show only `FAILED` returning to a “manual owner retry” arrow. In frames `390–449`, show `29 → 29 → 29`, `109 Event Candidates`, `12 VALID`, `17 NEEDS_REVIEW`, and the future boundary.

- [x] **Step 4: Verify timing.**

  Run `npx remotion still` at frames `0`, `90`, `180`, `270`, `360`, and `420`. Expected: each screenshot communicates one scene without relying on a previous scene.

### Task 4: Verify, review, and render the approved deliverable

**Files:**

- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Output: `terra-weekly-brief/out/terra-space-phase-pipeline.mp4`

**Interfaces:**

- Consumes: the approved composition and owner-approved storyboard choices.
- Produces: one MP4 and factual verification record.

- [x] **Step 1: Run code checks.**

  Run `npm run lint` in `terra-weekly-brief`. Expected: ESLint and TypeScript pass with no errors.

- [x] **Step 2: Review the complete video visually.**

  Render and inspect representative frames `0`, `90`, `180`, `270`, `360`, and `420`. Confirm the opening, all three phases, status/retry, and summary remain readable and do not overlap.

- [x] **Step 3: Render after owner approval.**

  Run `npx remotion render TerraSpacePhasePipeline out/terra-space-phase-pipeline.mp4`. Expected: one playable 15-second MP4 at 1920×1080 and 30 fps.

- [x] **Step 4: Record verification.**

  Update Current Status and the Project Knowledge Log with the rendered filename, confirmed duration/resolution, visual review result, and the commands that passed. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`; expected result is 0 errors and 0 warnings.

## Plan Self-Review

- **Scope coverage:** The storyboard covers Phase 1, Phase 2, Phase 3, evidence checks, safeguards, `NEEDS_REVIEW` continuation, failed-result retry, verified counts, and future scope.
- **Deliberate exclusions:** It does not narrate, use external media, render a vertical version, expose article content, or change n8n/Supabase data.
- **Safety:** The composition is isolated from the existing weekly brief and reads no live data while rendering.

## Implementation Record

Completed on 2026-08-27 after owner approval. Added the isolated `TerraSpacePhasePipeline`
composition at 1920×1080, 30 fps, and 450 frames (15 seconds), without changing the existing
`TerraWeeklyBrief` timeline. After owner review, the initial three-lane presentation was replaced
by one continuous “Living Data Flow”: the camera follows a glowing trace from the article through
cleaning, a grounded Main Issue, branching Event Candidates, retry, and the verified final counts.
It has no external media or live data.

Verification passed: the two pipeline motion-contract tests and `npm run lint` completed with no
errors, Remotion retained both compositions, and six representative rendered frames showed the
continuous path and key transformations without overlapping copy. The revised H.264 MP4 is
`terra-weekly-brief/out/terra-space-phase-pipeline.mp4` (6.8 MB).

# Navigation

- [Phase 3 Event Candidate Detection](../decisions/Phase-3-Event-Candidate-Detection.md)
- [Phase 3 Event Candidate Detection Implementation Plan](2026-08-27-phase-3-event-candidate-detection.md)
- [Project Knowledge](../Project-knowledge-Index.md)
