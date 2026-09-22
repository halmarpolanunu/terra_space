import test from 'node:test';
import assert from 'node:assert/strict';

import { preparePhase5DItems } from '../n8n/phase5d-workflow-prepare.mjs';

const place = { geographic_reference_id: 'place-1', coordinate_precision: 'city_regency', resolution_status: 'RESOLVED' };
const events = [
  { id: 'b', candidate_title: 'Explosives found near German power plant', facts: { actors: [{ name: 'German police', role: 'source' }] } },
  { id: 'a', candidate_title: 'German power plant explosives found near', facts: { actors: [{ name: 'German police', role: 'source' }] } },
];
const timelines = events.map((event) => ({
  phase5_event_record_id: event.id,
  event_date: '2026-09-01',
  event_date_precision: 'exact',
  event_geographies: [place],
  phase5c_status: 'PREPARED',
}));

test('joins Phase 5A and 5C by event ID and emits only new recommendations', () => {
  const [item] = preparePhase5DItems(events, [...timelines].reverse(), [], []);
  assert.equal(item.action, 'create');
  assert.equal(item.event_record_id_a, 'a');
  assert.equal(item.event_record_id_b, 'b');
  assert.equal(item.event_date, '2026-09-01');
  assert.match(item.submission_key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(item.summary.recommended, 1);
});

test('a completed pair is skipped on repeat runs', () => {
  const [first] = preparePhase5DItems(events, timelines, [], []);
  const [again] = preparePhase5DItems(events, timelines, [first], [{ submission_key: first.submission_key }]);
  assert.equal(again.action, 'none');
  assert.equal(again.summary.recommended, 1);
  assert.equal(again.summary.new_recommendations, 0);
});

test('a latest row without history is recoverable without creating a second latest row', () => {
  const [first] = preparePhase5DItems(events, timelines, [], []);
  const [recovery] = preparePhase5DItems(events, timelines, [first], []);
  assert.equal(recovery.action, 'history_only');
  assert.equal(recovery.submission_key, first.submission_key);
});

test('zero recommendations emit one control item and no writes', () => {
  const [item] = preparePhase5DItems(events, [{ ...timelines[0], event_date_precision: 'unknown', event_date: null }, timelines[1]], [], []);
  assert.equal(item.action, 'none');
  assert.equal(item.summary.recommended, 0);
});

test('missing or failed Phase 5C results stop rather than silently compare incomplete data', () => {
  assert.throws(() => preparePhase5DItems(events, [timelines[0]], [], []), /missing Phase 5C/i);
  assert.throws(() => preparePhase5DItems(events, [{ ...timelines[0], phase5c_status: 'FAILED' }, timelines[1]], [], []), /not prepared/i);
});

test('a changed rule version cannot silently overwrite an earlier pair decision', () => {
  const [first] = preparePhase5DItems(events, timelines, [], []);
  assert.throws(() => preparePhase5DItems(events, timelines, [{ ...first, rule_version: 'older-rule' }], []), /rule version/i);
});
