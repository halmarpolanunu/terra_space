import { evaluateDuplicates } from './phase5d-deterministic-duplicates.mjs';

function attemptId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 3) | 8).toString(16);
  });
}

function pairKey(row) {
  return `${row.event_record_id_a}|${row.event_record_id_b}`;
}

export function preparePhase5DItems(eventRecords, timelineResults, latestRows, historyRows) {
  if (![eventRecords, timelineResults, latestRows, historyRows].every(Array.isArray)) {
    throw new TypeError('Phase 5D inputs must be arrays');
  }

  const timelines = new Map(timelineResults
    .filter((row) => row?.phase5_event_record_id)
    .map((row) => [row.phase5_event_record_id, row]));
  const events = eventRecords.filter((row) => row?.id).map((row) => {
    const timeline = timelines.get(row.id);
    if (!timeline) throw new Error(`Missing Phase 5C result for event ${row.id}`);
    if (timeline.phase5c_status !== 'PREPARED') {
      throw new Error(`Phase 5C result is not prepared for event ${row.id}`);
    }
    return { id: row.id, title: row.candidate_title, facts: row.facts, timeline };
  });

  const { recommendations, summary } = evaluateDuplicates(events);
  const latest = new Map(latestRows
    .filter((row) => row?.event_record_id_a && row?.event_record_id_b)
    .map((row) => [pairKey(row), row]));
  const historyKeys = new Set(historyRows.map((row) => row?.submission_key).filter(Boolean));
  const items = [];

  for (const recommendation of recommendations) {
    const existing = latest.get(pairKey(recommendation));
    if (!existing) {
      items.push({ ...recommendation, submission_key: attemptId(), action: 'create' });
      continue;
    }
    if (existing.rule_version !== recommendation.rule_version) {
      throw new Error(`Phase 5D rule version changed for pair ${pairKey(recommendation)}; reviewed re-evaluation required`);
    }
    if (!historyKeys.has(existing.submission_key)) {
      items.push({ ...recommendation, submission_key: existing.submission_key, action: 'history_only' });
    }
  }

  const completedSummary = {
    ...summary,
    new_recommendations: items.filter((item) => item.action === 'create').length,
    history_recoveries: items.filter((item) => item.action === 'history_only').length,
  };
  if (items.length === 0) return [{ action: 'none', summary: completedSummary }];
  return items.map((item) => ({ ...item, summary: completedSummary }));
}
