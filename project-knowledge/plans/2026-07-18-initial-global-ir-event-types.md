---
type: Implementation Plan
title: Initial Global IR Event Types Configuration Plan
description: Adds the owner-approved initial global international-relations event types through the existing Terra Sense Event Types controls.
tags: [international-relations, event-types, terra-sense]
status: completed
okf_version: "0.1"
---

# Initial Global IR Event Types Configuration Plan

> **For agentic workers:** Use the existing Event Types interface only. Do not change application code, routes, APIs, or database schema.

## Goal

Create twelve active Event Types that guide local AI classification and review for the approved
global international-relations monitoring taxonomy.

## Configuration to add

| Event Type | Description |
| --- | --- |
| Keamanan & Konflik — Pernyataan / ancaman keamanan | Official security statement, warning, threat, ultimatum, or declared security concern that has not yet become a material action. |
| Keamanan & Konflik — Pengerahan atau kesiapan militer | Mobilization, deployment, exercises, alert posture, reinforcement, or other preparation by military or security forces. |
| Keamanan & Konflik — Operasi keamanan / serangan bersenjata | A reported security operation, strike, raid, interception, or use of armed force. |
| Keamanan & Konflik — Konflik bersenjata / eskalasi kekerasan | Sustained armed confrontation or a material escalation of violence between organized actors. |
| Diplomasi — Pernyataan diplomatik resmi | Official diplomatic communication, position, protest, recognition, condemnation, or policy announcement. |
| Diplomasi — Perundingan / mediasi | Negotiation, dialogue, mediation, summit, ceasefire talk, or other effort to manage a dispute. |
| Diplomasi — Kesepakatan / kerja sama diplomatik | Signed agreement, treaty, joint statement, formal cooperation, or concluded diplomatic arrangement. |
| Diplomasi — Keretakan hubungan / tindakan diplomatik koersif | Diplomatic rupture, expulsion, recall, downgrade, ultimatum, or coercive diplomatic measure. |
| Ekonomi & Energi — Sinyal kebijakan ekonomi atau energi | Official economic or energy policy signal, planned measure, warning, forecast, or announced review not yet implemented. |
| Ekonomi & Energi — Sanksi / pembatasan perdagangan | Implemented sanction, tariff, export control, embargo, import restriction, asset freeze, or comparable trade restriction. |
| Ekonomi & Energi — Kesepakatan ekonomi, perdagangan, atau energi | Concluded trade, investment, supply, infrastructure, energy, or economic cooperation agreement. |
| Ekonomi & Energi — Gangguan pasokan, perdagangan, atau infrastruktur energi | Disruption to supply, shipping, trade flows, energy production, energy infrastructure, or strategic commodity access. |

## Steps

- [x] Added each table row exactly once, including its description; all twelve returned as Active.
- [x] Preserved the existing suggested `Airstrike` type because it is in use by a draft event.
- [x] Read the local API after creation: 13 total types, 12 active approved taxonomy types.
- [x] Confirmed the configuration change did not modify LM Studio settings.
- [x] Recorded the completed configuration and validated Project Knowledge.

## Acceptance checks

- All twelve approved types are active and have non-empty descriptions.
- Existing event records and settings are unchanged.
- The types are available to the existing local-AI classification path and Event Review picker.

## Navigation

- [Taxonomy Decision](../decisions/Initial-Global-IR-Event-Taxonomy.md)
- [Terra Sense Product Organization](../decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md)
- [Project Knowledge](../Project-knowledge-Index.md)
