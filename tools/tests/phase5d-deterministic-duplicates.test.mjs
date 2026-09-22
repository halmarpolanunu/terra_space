import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateDuplicates, recommendDuplicates } from '../n8n/phase5d-deterministic-duplicates.mjs';

const date = '2026-08-24';
const city = '10000000-0000-4000-8000-000000000001';

function event(id, overrides = {}) {
  return {
    id,
    title: 'Explosives found near German power plant',
    facts: { actors: [{ name: 'German police', role: 'source' }] },
    timeline: {
      event_date: date,
      event_date_precision: 'exact',
      event_geographies: [{ geographic_reference_id: city, coordinate_precision: 'city_regency', resolution_status: 'RESOLVED' }],
    },
    ...overrides,
  };
}

test('recommends one stable unordered pair for strong same-action evidence', () => {
  const a = event('b');
  const b = event('a', { title: 'German power plant explosives found near' });
  const [result] = recommendDuplicates([a, b]);
  assert.equal(result.event_record_id_a, 'a');
  assert.equal(result.event_record_id_b, 'b');
  assert.equal(result.event_date, date);
  assert.equal(result.status, 'POSSIBLE_DUPLICATE');
  assert.equal(result.rule_version, 'phase5d-strict-v1');
  assert.equal(result.title_overlap_score, 1);
  assert.deepEqual(result.reason_codes, ['TITLE_OVERLAP', 'SHARED_ACTOR', 'SHARED_SPECIFIC_PLACE']);
  assert.deepEqual(recommendDuplicates([b, a]), [result]);
});

test('requires actual exact event dates, never publication reference dates', () => {
  const a = event('a', { timeline: { event_date: null, event_date_precision: 'unknown', timeline_reference_date: date } });
  assert.deepEqual(recommendDuplicates([a, event('b')]), []);
  assert.deepEqual(recommendDuplicates([event('a'), event('b', { timeline: { event_date: '2026-08-25', event_date_precision: 'exact' } })]), []);
});

test('rejects title overlap below three tokens or below 0.75 Jaccard', () => {
  assert.deepEqual(recommendDuplicates([event('a'), event('b', { title: 'Explosives found' })]), []);
  assert.deepEqual(recommendDuplicates([event('a'), event('b', { title: 'Explosives found near German power plant after separate lengthy investigation' })]), []);
});

test('same article, date, country and type do not compensate for a distinct action', () => {
  const shared = { phase1_source_id: 'one-article', event_type_id: 'same-type' };
  const a = event('a', { ...shared, title: 'German police proposes new safety plan for nuclear power plant today' });
  const b = event('b', { ...shared, title: 'German police approves new safety plan for nuclear power plant today' });
  assert.deepEqual(recommendDuplicates([a, b]), []);
});

test('a shared country or generic subject is insufficient', () => {
  const country = { geographic_reference_id: 'country', coordinate_precision: 'country', resolution_status: 'RESOLVED' };
  const a = event('a', { facts: { actors: [{ name: 'Officials', role: 'source' }] }, timeline: { event_date: date, event_date_precision: 'exact', event_geographies: [country] } });
  const b = event('b', { facts: { actors: [{ name: 'officials', role: 'recipient' }] }, timeline: { event_date: date, event_date_precision: 'exact', event_geographies: [country] } });
  assert.deepEqual(recommendDuplicates([a, b]), []);
});

test('a specific shared place can qualify when actors are absent', () => {
  const a = event('a', { facts: { actors: [] } });
  const b = event('b', { facts: { actors: [] } });
  assert.deepEqual(recommendDuplicates([a, b])[0].reason_codes, ['TITLE_OVERLAP', 'SHARED_SPECIFIC_PLACE']);
});

test('empty input and missing subject evidence yield zero recommendations', () => {
  assert.deepEqual(recommendDuplicates([]), []);
  const a = event('a', { facts: { actors: [] }, timeline: { event_date: date, event_date_precision: 'exact', event_geographies: [] } });
  const b = event('b', { facts: { actors: [] }, timeline: { event_date: date, event_date_precision: 'exact', event_geographies: [] } });
  assert.deepEqual(recommendDuplicates([a, b]), []);
});

test('reports how pairs were excluded without storing non-matches', () => {
  const a = event('a');
  const b = event('b', { title: 'German power plant explosives found near' });
  const c = event('c', { timeline: { event_date: null, event_date_precision: 'unknown', timeline_reference_date: date } });
  assert.deepEqual(evaluateDuplicates([a, b, c]).summary, {
    events_considered: 3,
    pairs_considered: 3,
    excluded_date: 2,
    excluded_title: 0,
    excluded_action: 0,
    excluded_subject: 0,
    recommended: 1,
  });
});
