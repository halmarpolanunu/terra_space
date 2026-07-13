# Shared AI Agent Instructions

This project uses an Open Knowledge Format (OKF) bundle in `project-knowledge/` as the shared source of project context.

The project owner is new to coding. Keep explanations simple, concrete, and understandable for non-coders.

## Required reading before substantial work

1. Read `project-knowledge/Project-knowledge-Index.md`.
2. Read `project-knowledge/North-Star.md` and `project-knowledge/Current-Status.md`.
3. Read `project-knowledge/Roadmap.md` or related decisions only when relevant.
4. Confirm that the requested work supports the North Star. If it conflicts, explain the conflict and ask the user before continuing.

## Documentation location — applies to every agent

This rule applies equally to Claude, Codex, and Gemini. It overrides any skill, command, tool,
or workflow default that suggests writing documentation elsewhere (for example, defaults that
target `docs/`, `docs/superpowers/specs/`, or `docs/plans/`).

- All durable project documentation lives inside `project-knowledge/`. Do not create a
  top-level `docs/` tree, and do not write specs, design notes, implementation plans, handoffs,
  continuation notes, or verification records anywhere outside `project-knowledge/`.
- If a skill or command proposes a path outside `project-knowledge/`, redirect the output into
  `project-knowledge/` using the homes below before writing anything.
- Homes for each kind of document:
  - Long-term decisions and design direction → `project-knowledge/decisions/`, and add each one
    to `project-knowledge/decisions/Decisions-Index.md`.
  - Implementation plans, when they are persisted as files → `project-knowledge/plans/`
    (create the folder the first time it is needed).
  - The current continuation point → `project-knowledge/Current-Status.md`. Do not create
    separate handoff or continuation files.
  - Verification results and meaningful history → `project-knowledge/Project-Knowledge-Log.md`.
  - Phase or milestone changes → `project-knowledge/Roadmap.md`.
- Every Markdown file added under `project-knowledge/` must have valid OKF frontmatter
  (`type`, `title`, `description`) and a non-empty body, and its internal links must resolve, so
  that validation passes.
- The only documents that stay at their conventional location are the repository `README.md`,
  the agent-instruction adapters (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/…`), and
  tool-generated READMEs inside code packages such as `frontend/` and `backend/`.

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
