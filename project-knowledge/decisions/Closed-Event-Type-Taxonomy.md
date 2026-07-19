---
type: Decision
title: Closed Event Type Taxonomy
description: Local AI may select only active event types and leaves the type blank when none fits.
tags: [project-knowledge, decision, event-types, extraction, lm-studio]
status: active
okf_version: "0.1"
---

# Context

The previous event-type decision allowed local AI to propose a new inactive type when no active
definition fitted. The owner now maintains a curated initial global IR taxonomy and does not want
AI suggestions to expand it.

# Decision

The taxonomy is closed for AI extraction. LM Studio may return the exact name of an active Event
Type or no type at all. If no active definition fits, the saved draft event has a null Event Type
and the owner selects one manually during Event Review. AI output must not contain a suggested type
or suggested description, and persistence must never create an Event Type from AI extraction.

Existing manually created Event Types remain manageable by the owner. Existing event records keep
their currently linked type; no historical event is rewritten automatically.

# Alternatives considered

- Let AI suggest inactive types for human activation.
- Force AI to choose the nearest active type.
- Store an AI explanation for why no type fitted.

# Reasons

- The owner prefers human control and a concise monitoring taxonomy.
- An empty type is more trustworthy than a forced incorrect classification.
- Removing suggestions prevents taxonomy clutter and preserves clear filters.

# Consequences

- This supersedes the AI-suggestion portions of [Event Type Descriptions and AI Classification](Event-Type-Descriptions-and-AI-Classification.md).
- Extraction schema, prompt, persistence, and tests must reject or ignore suggested-type fields.
- Event Review must continue to allow manual selection from active types when a draft type is blank.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
