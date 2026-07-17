---
type: Design Plan
title: Settings UI and UX Polish Plan
description: Simplify the Settings menu so everyday users see essential choices first and technical controls appear only when needed.
tags: [settings, ui, ux, design]
status: planned
okf_version: "0.1"
---

# Settings UI and UX Polish Plan

## Goal

Make Settings feel calm and understandable for a non-technical single user. The screen should
show the few choices needed for normal use first, rather than exposing every technical detail at
once.

## Design principles

- Use plain-language labels and short explanations of what a setting changes.
- Separate everyday controls from advanced or rarely used technical controls.
- Keep local-only status visible, but do not make the user interpret implementation details.
- Reveal extra detail progressively: show it when it is needed, not all at once.
- Preserve access to every existing capability; this is a reorganization and clarity pass, not
  hidden removal of important controls.

## Work to plan before implementation

- Inventory every current Settings control, its purpose, how often it is used, and what can go
  wrong if it is changed.
- Group controls into clear areas such as AI connection, event-type management, data/storage, and
  advanced diagnostics, based on the actual current feature set.
- Identify the default view for a normal user and which details should live behind an "Advanced"
  disclosure or separate sub-panel.
- Create a simple screen proposal and review it with the owner before changing the layout.
- Ensure connection errors, offline LM Studio status, save results, and blocked actions remain
  clear and actionable.
- Verify keyboard navigation, browser zoom, empty states, and both normal and offline local-AI
  conditions.

## Acceptance checks

- A first-time user can understand what the screen is for without needing technical knowledge.
- Routine tasks, such as choosing the local AI model or managing event types, remain easy to find.
- Technical details stay available when needed, but no longer dominate the first screen view.
- No setting is silently changed by the redesign.

## Navigation

- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Event Type Descriptions and AI Classification](../decisions/Event-Type-Descriptions-and-AI-Classification.md)
