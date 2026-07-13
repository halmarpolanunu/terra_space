# Shared AI Agent Instructions

This project uses an Open Knowledge Format (OKF) bundle in `project-knowledge/` as the shared source of project context.

The project owner is new to coding. Keep explanations simple, concrete, and understandable for non-coders.

## Required reading before substantial work

1. Read `project-knowledge/Project-knowledge-Index.md`.
2. Read `project-knowledge/North-Star.md` and `project-knowledge/Current-Status.md`.
3. Read `project-knowledge/Roadmap.md` or related decisions only when relevant.
4. Confirm that the requested work supports the North Star. If it conflicts, explain the conflict and ask the user before continuing.

## Maintaining Project Knowledge

- Update Project Knowledge only when direction, roadmap, an important decision, or the project's continuation point changes meaningfully.
- Never change the North Star silently. Propose the change and obtain human approval first.
- Do not create placeholder information when details are not yet known.
- Use `.project-template/okf-templates/Decision.md` only for decisions that affect long-term direction, architecture, security, data, or project operation.
- Add every decision document to `project-knowledge/decisions/Decisions-Index.md`.
- Update `project-knowledge/Current-Status.md` after substantial work changes the continuation point.
- Update `project-knowledge/Roadmap.md` only when a phase or milestone changes.
- Add to `project-knowledge/Project-Knowledge-Log.md` only for meaningful knowledge changes.
- Preserve other contributors' changes and stop for human review if changes conflict.

## Status values

Use only these status values unless the project explicitly extends them:

- `draft`
- `active`
- `planned`
- `in-progress`
- `blocked`
- `completed`
- `superseded`

## Validation

After modifying Project Knowledge, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Fix all errors before reporting the work complete. Explain any remaining warnings.
