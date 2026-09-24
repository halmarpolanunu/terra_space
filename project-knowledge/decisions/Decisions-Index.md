---
type: Knowledge Index
title: Decisions Index
description: Index of important project decisions and their reasoning.
tags: [project-knowledge, decisions, index]
status: active
---

# Decisions

- [Atlas Stage Issue-Level Home Design](Atlas-Stage-Issue-Level-Home-Design.md) - Draft specification for the owner-approved cinematic Home wireframe and all-Issue globe behavior; awaiting written-spec review.
- [Phase 2 Main Issue Led Terra Insight](Phase-2-Main-Issue-Led-Terra-Insight.md) - Current Phase 2 Main Issues lead Home and Explore; linked Phase 5 events and evidence follow each Issue.
- [Terra Space Guided Command Center Redesign](Terra-Space-Guided-Command-Center-Redesign.md) - Approved navigation and visual direction; its event-led entry is superseded by the Main Issue decision.
- [Phase 5D Deterministic Duplicate Recommendations](Phase-5D-Deterministic-Duplicate-Recommendations.md) - Strict, model-free pair comparison for explainable possible-duplicate recommendations without merging.
- [Phase 5C Timeline and Geography](Phase-5C-Timeline-and-Geography.md) - Uses honest timeline references, approved offline coordinates, separate Event Geography and Actor Network outputs, and database-reviewed suggestions without turning AI proposals into facts.
- [Phase 5B Event Type Classification](Phase-5B-Event-Type-Classification.md) - Uses a bounded local classifier plus independent safeguard, up to two corrective retries, visible Unclassified results, and optional database-reviewed proposals without automatic taxonomy expansion.
- [Phase 5 Event Generation and Qualification](Phase-5-Conservative-Event-Drafts.md) - Uses one checkpointed n8n workflow to make all retained events visible, prepare timeline and map data, recommend duplicates, and qualify safe final events without automatic merging.
- [Phase 4 Event Fact Extraction](Phase-4-Event-Fact-Extraction.md) - Approved extraction boundary, amended to use narrow date/epistemic, actor-only, and location-only model steps and safeguards.
- [Phase 3 Event Candidate Detection](Phase-3-Event-Candidate-Detection.md) - Detects complete, evidence-grounded Event Candidates while carrying review flags forward instead of stopping the pipeline.
- [Phase 2 Review-Flagged Results](Phase-2-Review-Flagged-Results.md) - Keeps evidence-grounded proposed Main Issues as simple review flags while processing continues.
- [Phase 2 Main-Issue Detection](Phase-2-Main-Issue-Detection.md) - Establishes a Main-Issue-only, evidence-grounded Phase 2 workflow before event-candidate work.
- [Verified Phase 1 Cleaning Baseline](Verified-Phase-1-Cleaning-Baseline.md) - Locks the owner-verified local article cleaner and its safety checks as the baseline for future changes.
- [Separated Manual Intake and Deferred Queue Processing](Separated-Manual-Intake-and-Deferred-Queue-Processing.md) - Separates one-at-a-time article collection from owner-triggered batch Phase 1 processing.
- [Terra Space n8n Workflow Folder Placement](Terra-Space-n8n-Workflow-Folder-Placement.md) - Every newly created Terra Space n8n workflow belongs in the `Terra_Space` folder.
- [Active Workflow Boundary](Active-Workflow-Boundary.md) - Superseded record of the former five-workflow boundary; the owner reset the pipeline on 2026-08-24.
- [Issue-first Independent Evidence Retention](Issue-First-Independent-Evidence-Retention.md) - Keeps grounded Issues and Events while omitting only optional relationships that lack complete explicit evidence.
- [Pipeline-Only Data Correction](Pipeline-Only-Data-Correction.md) - Terra Insight and Terra Sense do not provide event or issue review; data defects are corrected in the pipeline and corrected sources are reprocessed.
- [Fresh Phase-Prefixed Supabase Architecture](Fresh-Phase-Prefixed-Supabase-Architecture.md) - replaces SQLite with a fresh local Supabase source of truth organized by explicit Phase 1, Phase 2, and Phase 3 table roles, with immediate Dashboard visibility and human authority.
- [One-Click Full News Processing](One-Click-Full-News-Processing.md) - Adds a master n8n workflow that runs the three established local processing stages from one article submission while retaining reusable individual stages.
- [Automated Final Event Record Pipeline](Automated-Final-Event-Record-Pipeline.md) - Phase 3 turns grounded candidates into automatically finalized or safely withheld detailed event records through local-LLM enrichment, taxonomy classification, deterministic validation, and an independent safeguard.
- [Automatic Event Visibility With Manual Filtering](Automatic-Event-Visibility-With-Manual-Filtering.md) - Amends Dashboard authority so every processed event, including pipeline exceptions, appears automatically; the owner filters or hides events manually instead of the pipeline hiding them.
- [Retire Terra Space's Own Extraction Pipeline](Retire-Terra-Space-Own-Extraction-Pipeline.md) - Retires the in-app staged LM Studio extraction pipeline now that n8n owns event detection end to end; Terra Space keeps only Documents CRUD, editing, and Dashboard authority.

- [MVP Local-First Architecture](MVP-Local-First-Architecture.md) - Terra Space MVP is a local single-user app that stores data locally and uses only local LM Studio for AI processing.
- [Visual Design Direction](Visual-Design-Direction.md) - Calm "mission brief" tactical look on pure black, with a 3D globe, amber accent, serif source documents, and one-thing-at-a-time dense screens.
- [Amber Glass Background and Browser Zoom](Amber-Glass-Background-and-Browser-Zoom.md) - Adds a restrained amber-on-black background family and glass shell, and scales the Dashboard command deck across common browser zoom levels.
- [Document & Event Data Model](Document-Event-Data-Model.md) - Extends the Phase 1 schema with evidence quotes, duplicate flags, actor roles, suggestion tracking, and numeric coordinates for Phase 2/3 workflows.
- [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md) - Uses an embedded local gazetteer and explicit precision to populate map coordinates without network geocoding.
- [Design Pass Sequencing and Tailwind Plus Reference](Design-Pass-Sequencing.md) - Defers any further aesthetic design pass until after Phase 5, and records which Tailwind Plus Application UI patterns should inform Phase 5's Settings screen and the eventual pass.
- [Database Storage Moved to a Docker-Managed Volume](Database-Storage-Location.md) - Moves only the SQLite database out of the Windows-mounted `data` folder and into a Docker-managed volume, fixing a slow (~70s) container startup down to ~8.5s.
- [Event Type Descriptions and AI Classification](Event-Type-Descriptions-and-AI-Classification.md) - Adds human-reviewed event-type definitions for user guidance and local AI classification.
- [Local Supabase Storage Direction](Local-Supabase-Storage-Direction.md) - superseded plan to copy SQLite data into local Supabase; replaced by the fresh phase-prefixed architecture.
- [Terra Insight and Terra Sense Product Organization](Terra-Insight-and-Terra-Sense-Product-Organization.md) - Organizes the product into an analysis workspace and a separate local data-processing workflow.
- [Initial Global International Relations Event Taxonomy](Initial-Global-IR-Event-Taxonomy.md) - Defines the initial concise domain-first event types for global international-relations monitoring.
- [Closed Event Type Taxonomy](Closed-Event-Type-Taxonomy.md) - Superseded blanket no-suggestion policy; Phase 5B now permits optional pending proposals while preserving human approval authority.
- [Single Source Date and Event Date](Single-Source-Date-and-Event-Date.md) - Proposed simplification to one Publication Date for documents and one Event Date for extracted events.
- [Event Taxonomy Tree and Management](Event-Taxonomy-Tree-and-Management.md) - Replaces flat Event Type management with a four-level owner-managed tree and a calmer Terra Sense taxonomy workspace.
- [Staged Event Detection Pipeline](Staged-Event-Detection-Pipeline.md) - superseded: replaced the single extraction call with a Signal Parser plus four narrow per-candidate classifiers; retired in favor of n8n-only event detection.

# Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
