---
type: Decision
title: Event Type Descriptions and AI Classification
description: Event types carry human-reviewed descriptions that guide both users and local AI classification.
tags: [project-knowledge, decision, event-types, extraction, lm-studio]
status: active
---

# Context

Terra Space currently stores an event type as only a name and an active/inactive status. A short
name such as "Report", "Statement", or "Incident" does not explain when that type should be used.
This makes similar types difficult for the owner to distinguish and gives LM Studio too little
context when it chooses an existing type or proposes a new one.

The owner wants descriptions to help both human review and local AI classification. The design
must preserve existing data, keep AI suggestions subject to human confirmation, and continue to
work locally.

# Decision

Every event type will have a nullable description of at most 1,000 characters alongside its name
and active status. A description explains when the type should be used.

The following validation rules apply:

- A newly created active event type must have a non-blank description.
- An AI-suggested event type may initially have a blank description because it is still a draft.
- A suggested or inactive type cannot be activated until it has a non-blank description.
- Existing active types with no description remain active after migration so the upgrade does not
  break existing events or processing. If one is later deactivated, it cannot be reactivated until
  its description is completed.
- Blank descriptions are stored as null, never as invented placeholder text.

Settings will let the owner create and edit an event type's name and description together. Types
that need a description will be visibly marked, and activation will explain why it is unavailable
when the description is blank.

Event Review and Events editing will show the selected type's description directly below the type
control. Filter menus and compact event summaries will continue to show only the type name so they
remain concise.

For extraction, LM Studio will receive every active event type as a structured name-and-description
pair. The prompt will require the model to compare the document against those existing definitions
first. Only when none fits may the model suggest a new type, including a draft description.

AI output cannot overwrite a human-authored description. If a proposed name matches an existing
type, Terra Space uses the existing record and ignores the AI-proposed description. Repeated
suggestions of the same new name create one inactive type. A missing AI description is accepted for
the inactive suggestion but must be completed before activation.

# Alternatives considered

- **Descriptions only for human display** - rejected because it leaves LM Studio choosing among
  bare names and does not address the classification problem.
- **Let AI create and activate described types automatically** - rejected because event types are
  authoritative project data and the North Star requires human confirmation of AI suggestions.
- **Require descriptions immediately for every existing type during migration** - rejected because
  it would make the upgrade disruptive and could block an otherwise working local installation.

# Reasons

- Definitions make similar event types easier for the owner to understand and review.
- Supplying existing definitions before allowing suggestions reduces near-duplicate types.
- Human activation preserves control over the project's taxonomy.
- Nullable migration behavior protects existing data while applying stronger rules to future
  changes.
- The change remains local-first because descriptions and AI processing stay inside Terra Space and
  LM Studio.

# Consequences

- The database needs a nullable description column and a reversible migration.
- Event-type API responses, create/update validation, frontend data types, and Settings controls
  must support descriptions.
- The extraction schema must support a suggested description, and the LM Studio request must carry
  active type names and descriptions rather than a list of names alone.
- Event Review and Events editing need contextual description text for the selected type.
- Automated tests must cover migration safety, activation rules, API behavior, prompt contents,
  protection from AI overwrites, duplicate suggestions, and the affected interfaces.
- Existing active types without descriptions remain a visible cleanup task for the owner but do not
  stop current processing.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [North Star](../North-Star.md)
- [Feedback Backlog](../Feedback-Backlog.md)

