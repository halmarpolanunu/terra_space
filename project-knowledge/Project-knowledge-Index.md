---
type: Knowledge Index
title: Project Knowledge Index
description: Entry point for the project's shared knowledge.
tags: [project-knowledge, index]
status: active
okf_version: "0.1"
---

# Project Knowledge

This file is the main entry point for humans and AI agents. Start here, then follow only the links relevant to the current task.

## Direction and continuity

- [North Star](North-Star.md) — overarching objective, success definition, boundaries, and principles
- [Current Status](Current-Status.md) — current focus, recent progress, blockers, and next actions
- [Feedback Backlog](Feedback-Backlog.md) — owner-reported gaps and future development requests not yet scheduled
- [Project Knowledge Log](Project-Knowledge-Log.md) — meaningful changes to the knowledge bundle
- [Phase 4 Review Audit — 2026-09-08](Phase-4-Review-Audit-2026-09-08.md) — candidate-by-candidate classification of the 21 review-flagged results in sequences 98–107
- [Terra Space Operating Guide](Terra-Space-Operating-Guide.md) — superseded historical guide to the pre-reset pipeline

## Planning and decisions

- [Phase 5 Event Generation and Qualification](decisions/Phase-5-Conservative-Event-Drafts.md) — approved lean one-workflow direction for visible events, classification, timeline/map enrichment, duplicate recommendation, and qualification
- [Phase 5A Prepare Event Records Implementation Plan](plans/2026-09-10-phase-5a-prepare-event-records.md) — test-first plan for the deterministic first stage of the single Phase 5 workflow
- [Phase 4 Event Fact Extraction](decisions/Phase-4-Event-Fact-Extraction.md) — approved minimal design for enriching retained Phase 3 candidates before taxonomy, normalization, deduplication, and final events
- [Phase 4 Event Fact Extraction Implementation Plan](plans/2026-08-27-phase-4-event-fact-extraction.md) — test-first execution plan with separate approval gates for migration, five-candidate pilot, and full processing
- [Phase 4 Narrow Event Fact Extraction Implementation Plan](plans/2026-08-31-phase-4-narrow-event-fact-extraction.md) — approved reliability amendment plan that separates date, actor, and location work before a new controlled pilot
- [Roadmap](Roadmap.md) — long-term phases and measurable milestones
- [Decisions Index](decisions/Decisions-Index.md) — important choices and their reasoning
- [Phase 3 Event Candidate Detection Plan](plans/2026-08-27-phase-3-event-candidate-detection.md) — planned minimal, evidence-grounded candidate-detection stage after the verified Phase 2 Main Issue baseline
- [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md) — Documents and batch processing build plan
- [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md) — current task-by-task build plan for Event Review and Deduplication

- [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md) — task-by-task build plan for Events and Dashboard
- [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md) — task-by-task build plan for Settings and final MVP verification
- [Issue-First Terra Insight Design](plans/2026-08-15-issue-first-terra-insight-design.md) — approved design direction for valid article-level Issues, issue-filtered globe exploration, and evidence-backed actor arcs
- [Issue-First Terra Insight Implementation](plans/2026-08-15-issue-first-terra-insight-implementation.md) — completed validated Issue experience and local rollout; existing routes remain the fallback
- [Issue-first Independent Evidence Retention](decisions/Issue-First-Independent-Evidence-Retention.md) — active no-inference rule that retains a grounded Issue/Event while omitting an unsupported optional relationship
- [Active Workflow Boundary](decisions/Active-Workflow-Boundary.md) — superseded record of the former five-workflow n8n boundary
- [Separated Manual Intake and Deferred Queue Processing](decisions/Separated-Manual-Intake-and-Deferred-Queue-Processing.md) — approved collection queue and owner-triggered Phase 1 processing direction.
- [Deferred Phase 1 Queue Processing Implementation Plan](plans/2026-08-25-deferred-phase1-queue-processing.md) — completed implementation record for the separate intake and process-all workflows.
- [Terra Space n8n Workflow Folder Placement](decisions/Terra-Space-n8n-Workflow-Folder-Placement.md) — every newly created Terra Space n8n workflow belongs in the `Terra_Space` folder.
- [Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md) — build plan that closed Phase 1's remaining item
- [Design Pass Audit](plans/2026-07-15-design-pass-audit.md) — screen-by-screen findings for the deferred aesthetic design pass
- [Layered Command Deck and Motion Design](plans/2026-07-15-layered-command-deck-motion-design.md) — approved globe-dominant 3D Dashboard and controlled-cinematic motion specification
- [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md) — checkpointed, test-first execution plan with an isolated populated visual workbench
- [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md) — approved background, glass-shell, and browser-zoom direction
- [Amber Glass Background and Browser Zoom Implementation Plan](plans/2026-07-16-amber-glass-background-browser-zoom.md) — test-first asset, shell, command-deck scaling, and verification plan ready for a new execution session

- [Event Deletion Design](plans/2026-07-15-event-deletion-design.md) — approved safety rules for deleting draft and approved events
- [Event Deletion Implementation Plan](plans/2026-07-15-event-deletion-implementation.md) — test-first implementation plan for protected event deletion
- [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md) — clusters co-located globe pins and surfaces an unresolved-locations list
- [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md) — strengthens the LM Studio extraction prompt/schema and adds a location-level grounding check
- [Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md) — play/pause and speed/direction mini controller, plus a root-cause fix for permanently stalled ambient rotation
- [Event Type Descriptions and AI Classification](decisions/Event-Type-Descriptions-and-AI-Classification.md) — approved rules for described event types, human activation, and description-aware local AI classification
- [Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md) — test-first database, API, extraction, Settings, selection guidance, and verification plan

- [Fresh Phase-Prefixed Supabase Architecture](decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md) - approved fresh local Supabase source of truth with Phase 1 collection, Phase 2 candidates, Phase 3 authoritative events, and Dashboard human authority
- [Local Supabase Migration Plan](plans/2026-07-17-local-supabase-migration.md) - superseded plan to copy SQLite application data into local Supabase
- [Terra Insight and Terra Sense Product Organization](decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md) - approved product organization: Terra Insight presents and analyses trusted data; Terra Sense collects, processes, and reviews it
- [Initial Global International Relations Event Taxonomy](decisions/Initial-Global-IR-Event-Taxonomy.md) - approved initial monitoring taxonomy for global security/conflict, diplomacy, and economy/energy
- [Initial Global IR Event Types Configuration Plan](plans/2026-07-18-initial-global-ir-event-types.md) - creates the twelve approved active Event Types through Terra Sense
- [Closed Event Type Taxonomy Implementation Plan](plans/2026-07-18-closed-event-type-taxonomy.md) - prevents local AI event-type suggestions and leaves unmatched draft types blank
- [Event Taxonomy Tree and Management](decisions/Event-Taxonomy-Tree-and-Management.md) - approved four-level Domain, Category, Subcategory, and Event Type structure for Terra Sense
- [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md) - test-first plan for the taxonomy migration, closed local-AI selection, and calm tree-plus-inspector workspace
- [Document Metadata Extraction Context Plan](plans/2026-07-18-document-metadata-extraction-context.md) - sends title and source dates to local AI without treating them as event facts
- [Single Source Date and Event Date Implementation Plan](plans/2026-07-18-single-source-date-event-date.md) - approved simplification to one document date and one event date, ready for implementation
- [Terra Insight and Terra Sense Organization Implementation Plan](plans/2026-07-18-terra-insight-terra-sense-organization.md) - implementation plan for grouped navigation, a read-only Terra Sense flow monitor, and Event Types inside Terra Sense
- [Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md) - merged plan covering both the route backgrounds and the Settings layout
- [Globe Halo Zoom Behavior Plan](plans/2026-07-17-globe-halo-zoom-behavior.md) - make the globe halo behave correctly while zooming in and out
- [Globe Backside Node Visibility Plan](plans/2026-07-17-globe-backside-node-visibility.md) - hide location nodes on the far side of the globe
- [Staged Event Detection Pipeline](decisions/Staged-Event-Detection-Pipeline.md) - approved redesign: Signal Parser plus four narrow per-candidate classifiers, ISO alpha-3, actor aliases, and a per-stage extraction log
- [Staged Event Detection Pipeline Implementation Plan](plans/2026-07-20-staged-event-detection-pipeline.md) - checkpointed, test-first build plan for the staged pipeline, ready for a fresh execution session
- [n8n Candidate Canonical Event Detection Prototype](plans/2026-08-01-n8n-candidate-canonical-event-prototype.md) - testing-phase n8n workflow comparing two LM Studio models and two extraction techniques for detecting provisional candidate events
- [Phase 2 Main-Issue and Event-Candidate Testing Design](plans/2026-08-06-phase-2-main-issue-event-candidate-testing-design.md) - approved design for a single-model, two-stage n8n reliability test that stores grounded results in a separate Supabase test table
- [Phase 2 Main-Issue and Event-Candidate Testing Implementation Plan](plans/2026-08-06-phase-2-main-issue-event-candidate-testing-implementation.md) - task-by-task plan for the separate Supabase test table and two-stage n8n reliability workflow
- [Phase 3 Event Records Implementation Plan](plans/2026-08-07-phase-3-event-records.md) - builds the guarded automatic final-event pipeline from the latest Phase 2 candidates.
- [One-Click Full News Processing Implementation Plan](plans/2026-08-08-one-click-full-news-processing.md) - refactors the three n8n stages into callable sub-workflows and adds one master form that runs the whole local pipeline.
- [Fresh Phase-Prefixed Supabase Foundation Plan](plans/2026-08-10-fresh-supabase-foundation.md) - creates the shared local PostgreSQL schema, descriptions, reference data, authority functions, and rollback checkpoint.
- [n8n Phase-Prefixed Table Transition Plan](plans/2026-08-10-n8n-phase-table-transition.md) - rewires the four inactive workflows to the new Phase 1, Phase 2, and Phase 3 contracts.
- [Terra Space Supabase Application Transition Plan](plans/2026-08-10-terra-space-supabase-transition.md) - moves the FastAPI/Next.js application from SQLite to the shared Supabase database and implements Dashboard authority.
- [Supabase Read-Only Bridge Design](plans/2026-08-11-supabase-read-only-bridge-design.md) - approved verification-first scope for displaying the local Supabase pipeline data in Terra Space without application writes.
- [Supabase Read-Only Bridge Implementation Plan](plans/2026-08-11-supabase-read-only-bridge-implementation.md) - task-by-task backend/frontend build plan for the bridge, including the undocumented live-database table rename it discovered and corrected first.
- [Automatic Event Visibility With Manual Filtering](decisions/Automatic-Event-Visibility-With-Manual-Filtering.md) - amends Dashboard authority so every processed event, including pipeline exceptions, appears automatically; the owner filters or hides events manually instead.
- [Automatic Event Visibility Design](plans/2026-08-11-automatic-event-visibility-design.md) - approved design for showing every processed Phase 3 event automatically with a manual visibility filter and a browser-only per-event hide control.
- [Automatic Event Visibility Implementation Plan](plans/2026-08-11-automatic-event-visibility-implementation.md) - task-by-task backend/frontend build plan for automatic exception visibility, filtering, and hiding.
- [Supabase Cutover and Verification Plan](plans/2026-08-10-supabase-cutover-verification.md) - verifies the complete system, rollback, no-SQLite-write behavior, and owner-approved activation.

## Reading rule

Read the North Star and Current Status before substantial work. Read the Roadmap or related
decisions only when they are relevant to the task. Check the Feedback Backlog whenever work
touches an area it mentions.
