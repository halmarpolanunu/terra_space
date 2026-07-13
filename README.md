# terra_space

This folder uses a lean Project Knowledge setup so coding agents can share the same project memory.

## Start here

1. Read `AGENTS.md`.
2. Read `project-knowledge/Project-knowledge-Index.md`.
3. Read `project-knowledge/North-Star.md` and `project-knowledge/Current-Status.md`.
4. Read `project-knowledge/Roadmap.md` only when planning or prioritizing work.

## Validate Project Knowledge

Run this after changing files inside `project-knowledge/`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

## Notes

- Keep explanations simple. The project owner is new to coding.
- Record only important long-term decisions in `project-knowledge/decisions/`.
- Do not add capabilities, use cases, or separate milestone folders unless the project explicitly needs them later.
