---
type: Decision
title: Terra Space n8n Workflow Folder Placement
description: Every newly created Terra Space n8n workflow is placed in the Terra_Space folder.
tags: [project-knowledge, decision, n8n, project-operation]
status: active
---

# Context

Terra Space uses n8n for local pipeline workflows. Keeping every new Terra Space workflow in one
recognisable folder makes the workspace easier for the owner to navigate and avoids mixing project
workflows with unrelated personal workflows.

# Decision

When creating a new n8n workflow for Terra Space, place it in the n8n folder named `Terra_Space`.

# Alternatives considered

- Leave new workflows at the Personal-project root.
- Place workflows in folders ad hoc, based on the workflow author or its temporary purpose.

# Reasons

One consistent project folder makes workflow ownership and scope visible at a glance. It also
supports the owner's request for a simpler, less confusing n8n workspace.

# Consequences

- This rule applies to every newly created Terra Space workflow, including inactive test or staging
  workflows.
- It does not move or rename an existing workflow by itself.
- Before creating a new workflow, the agent must confirm that `Terra_Space` is selected as its
  destination folder.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
