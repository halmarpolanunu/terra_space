---
type: Decision
title: MVP Local-First Architecture
description: Terra Space MVP runs locally for one user, stores data locally, and uses LM Studio as the only AI processing path.
tags: [project-knowledge, decision, mvp, architecture]
status: active
---

# Context

Terra Space needs an MVP that is simple, usable, and not dependent on cloud infrastructure. The product brief requires manual document input, local batch processing through LM Studio, event extraction, review, deduplication recommendation, and dashboard visualization.

# Decision

Build Terra Space MVP as a local-first single-user application. Store data and attachments locally. Use the local LM Studio endpoint for AI processing. Do not add authentication, role management, microservices, cloud deployment, or AI cloud fallback in the MVP.

Terra Brief is excluded from the MVP. It may later become a Terra Space module that uses Terra Space's event database.

Event types must be stored as editable data. They must not be permanent hard-coded enums.

# Alternatives considered

- Cloud-hosted multi-user app with authentication and role management.
- Microservice architecture.
- Cloud AI fallback using OpenAI, Gemini, or another external service.
- Hard-coded event type enum.
- Including Terra Brief inside the MVP.

# Reasons

- The MVP is intended for one local user.
- Local storage keeps data and attachments under user control.
- LM Studio keeps AI processing local.
- Avoiding cloud infrastructure, auth, and microservices reduces implementation cost and operational complexity.
- Dynamic event types let the system adapt as the user's event taxonomy changes.
- Keeping Terra Brief out of MVP prevents scope expansion before the core document-to-event workflow is proven.

# Consequences

- The app must remain openable when LM Studio is offline.
- Batch jobs must fail or pause safely when LM Studio is unavailable and allow retry later.
- LLM output must be validated before saving.
- Approved events must not be automatically overwritten by document reprocessing.
- Possible duplicate events must be flagged for user decision, not automatically merged.
- Future features should not be blocked, but they should not be built during MVP unless technically required.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
