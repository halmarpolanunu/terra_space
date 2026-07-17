---
type: Investigation Plan
title: Event Detection Reconsideration Plan
description: Reassess the full local-AI event detection workflow before choosing a replacement design.
tags: [event-detection, extraction, lm-studio, investigation]
status: planned
okf_version: "0.1"
---

# Event Detection Reconsideration Plan

## Goal

Review the whole process that turns a document into draft events, then propose a clearer and more reliable approach before changing production behavior.

## Questions to answer

- What is the current path from document text to draft event, validation, duplicate suggestion, and human approval?
- Which parts are handled by the local AI, which parts are deterministic code, and where do errors or missing facts most often occur?
- How well does the current local model perform on a small, owner-approved set of representative documents?
- Should detection be split into smaller stages, such as finding candidate events first and extracting structured fields second?
- What information must always be grounded in an evidence quote, and what should remain blank when the document does not support it?
- How should the human review screen explain confidence, missing fields, rejected suggestions, and possible duplicates without silently changing approved events?

## Deliverables before implementation

- A simple diagram of the current workflow and its failure points.
- A small local test set with expected draft events and evidence quotes.
- Measured baseline results for the current process.
- One or more proposed designs, including trade-offs, that preserve local-only AI, human approval, visible uncertainty, and the rule that AI must not invent facts.
- A decision document and separate implementation plan only after the owner chooses a direction.

## Navigation

- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
- [Event Type Descriptions and AI Classification](../decisions/Event-Type-Descriptions-and-AI-Classification.md)
