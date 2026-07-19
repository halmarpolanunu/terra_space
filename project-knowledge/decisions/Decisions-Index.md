---
type: Knowledge Index
title: Decisions Index
description: Index of important project decisions and their reasoning.
tags: [project-knowledge, decisions, index]
status: active
---

# Decisions

- [MVP Local-First Architecture](MVP-Local-First-Architecture.md) - Terra Space MVP is a local single-user app that stores data locally and uses only local LM Studio for AI processing.
- [Visual Design Direction](Visual-Design-Direction.md) - Calm "mission brief" tactical look on pure black, with a 3D globe, amber accent, serif source documents, and one-thing-at-a-time dense screens.
- [Amber Glass Background and Browser Zoom](Amber-Glass-Background-and-Browser-Zoom.md) - Adds a restrained amber-on-black background family and glass shell, and scales the Dashboard command deck across common browser zoom levels.
- [Document & Event Data Model](Document-Event-Data-Model.md) - Extends the Phase 1 schema with evidence quotes, duplicate flags, actor roles, suggestion tracking, and numeric coordinates for Phase 2/3 workflows.
- [Local Location Coordinate Resolution](Local-Location-Coordinate-Resolution.md) - Uses an embedded local gazetteer and explicit precision to populate map coordinates without network geocoding.
- [Design Pass Sequencing and Tailwind Plus Reference](Design-Pass-Sequencing.md) - Defers any further aesthetic design pass until after Phase 5, and records which Tailwind Plus Application UI patterns should inform Phase 5's Settings screen and the eventual pass.
- [Database Storage Moved to a Docker-Managed Volume](Database-Storage-Location.md) - Moves only the SQLite database out of the Windows-mounted `data` folder and into a Docker-managed volume, fixing a slow (~70s) container startup down to ~8.5s.
- [Event Type Descriptions and AI Classification](Event-Type-Descriptions-and-AI-Classification.md) - Adds human-reviewed event-type definitions for user guidance and local AI classification.
- [Local Supabase Storage Direction](Local-Supabase-Storage-Direction.md) - Plans a safe transition from SQLite to Supabase hosted on the owner's computer while preserving local-first operation.
- [Terra Insight and Terra Sense Product Organization](Terra-Insight-and-Terra-Sense-Product-Organization.md) - Organizes the product into an analysis workspace and a separate local data-processing workflow.
- [Initial Global International Relations Event Taxonomy](Initial-Global-IR-Event-Taxonomy.md) - Defines the initial concise domain-first event types for global international-relations monitoring.
- [Closed Event Type Taxonomy](Closed-Event-Type-Taxonomy.md) - Prevents local AI from suggesting types; unmatched extracted events keep a blank type for human review.
- [Single Source Date and Event Date](Single-Source-Date-and-Event-Date.md) - Proposed simplification to one Publication Date for documents and one Event Date for extracted events.
- [Event Taxonomy Tree and Management](Event-Taxonomy-Tree-and-Management.md) - Replaces flat Event Type management with a four-level owner-managed tree and a calmer Terra Sense taxonomy workspace.

# Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
