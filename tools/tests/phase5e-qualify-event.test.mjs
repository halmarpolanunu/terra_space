import test from 'node:test';
import assert from 'node:assert/strict';

import { qualifyEvent } from '../n8n/phase5e-qualify-event.mjs';

function input(overrides = {}) {
  const candidate = {
    candidate_id: 'candidate-1',
    status: 'VALID',
    quote_validation_status: 'VERIFIED',
    safeguard_status: 'ACCEPT',
  };
  return {
    phase5a: {
      candidate_id: 'candidate-1',
      phase3_event_candidate_result_id: 'phase3-result-1',
      phase5a_status: 'PREPARED',
    },
    phase3: { id: 'phase3-result-1', status: 'NEEDS_REVIEW', candidates: [candidate] },
    phase5b: {
      classification_status: 'CLASSIFIED',
      safeguard_status: 'ACCEPT',
      event_type_id: 'type-1',
      event_type_is_active: true,
    },
    phase5c: { phase5c_status: 'PREPARED' },
    phase5d: { recommendation_status: 'POSSIBLE_DUPLICATE' },
    timeline: { event_date: null, event_date_precision: 'unknown' },
    geography: { event_geography_status: 'AWAITING_REFERENCE_REVIEW' },
    ...overrides,
  };
}

test('qualifies only the independently grounded candidate and keeps every source field', () => {
  const source = input();
  const result = qualifyEvent(source);

  assert.equal(result.phase5e_status, 'FINAL');
  assert.deepEqual(result.qualification_reason_codes, ['FINAL_CANDIDATE_GROUNDED']);
  assert.deepEqual(result.phase3, source.phase3);
  assert.deepEqual(result.phase5d, source.phase5d);
  assert.deepEqual(source, input());
});

test('returns stable not-final reasons for core qualification failures', () => {
  const cases = [
    {
      name: 'rejects a candidate whose own safeguard rejected it',
      value: input({ phase3: { id: 'phase3-result-1', candidates: [{ candidate_id: 'candidate-1', status: 'VALID', quote_validation_status: 'VERIFIED', safeguard_status: 'REJECT' }] } }),
      reasons: ['CANDIDATE_SAFEGUARD_NOT_ACCEPTED'],
    },
    {
      name: 'rejects an unverified candidate quote',
      value: input({ phase3: { id: 'phase3-result-1', candidates: [{ candidate_id: 'candidate-1', status: 'VALID', quote_validation_status: 'PENDING', safeguard_status: 'ACCEPT' }] } }),
      reasons: ['CANDIDATE_QUOTE_NOT_VERIFIED'],
    },
    {
      name: 'rejects a missing Phase 5B result without hiding the event',
      value: input({ phase5b: null }),
      reasons: ['PHASE5B_RESULT_MISSING'],
    },
    {
      name: 'rejects a failed Phase 5B result without hiding the event',
      value: input({ phase5b: { classification_status: 'FAILED', safeguard_status: 'NOT_RUN' } }),
      reasons: ['PHASE5B_TECHNICAL_FAILURE'],
    },
    {
      name: 'rejects a failed Phase 5C result without hiding the event',
      value: input({ phase5c: { phase5c_status: 'FAILED' } }),
      reasons: ['PHASE5C_NOT_PREPARED'],
    },
    {
      name: 'rejects a classified inactive Event Type',
      value: input({ phase5b: { classification_status: 'CLASSIFIED', safeguard_status: 'ACCEPT', event_type_id: 'type-1', event_type_is_active: false } }),
      reasons: ['CLASSIFIED_TYPE_NOT_ACTIVE'],
    },
    {
      name: 'rejects a classified result whose safeguard did not accept it',
      value: input({ phase5b: { classification_status: 'CLASSIFIED', safeguard_status: 'REJECT', event_type_id: 'type-1', event_type_is_active: true } }),
      reasons: ['PHASE5B_SAFEGUARD_NOT_ACCEPTED'],
    },
    {
      name: 'rejects a Phase 3 result from another article before using its candidate',
      value: input({ phase3: { id: 'another-phase3-result', candidates: [{ candidate_id: 'candidate-1', status: 'VALID', quote_validation_status: 'VERIFIED', safeguard_status: 'ACCEPT' }] } }),
      reasons: ['PHASE3_RESULT_ID_MISMATCH'],
    },
    {
      name: 'rejects a classified result without an assigned Event Type identity',
      value: input({ phase5b: { classification_status: 'CLASSIFIED', safeguard_status: 'ACCEPT', event_type_is_active: true } }),
      reasons: ['CLASSIFIED_TYPE_ID_MISSING'],
    },
    {
      name: 'rejects a malformed candidate identity',
      value: input({ phase5a: { candidate_id: '', phase5a_status: 'PREPARED' } }),
      reasons: ['CANDIDATE_ID_MISSING'],
    },
    {
      name: 'rejects an ambiguous candidate identity',
      value: input({ phase3: { id: 'phase3-result-1', candidates: [{ candidate_id: 'candidate-1', status: 'VALID', quote_validation_status: 'VERIFIED', safeguard_status: 'ACCEPT' }, { candidate_id: 'candidate-1', status: 'VALID', quote_validation_status: 'VERIFIED', safeguard_status: 'ACCEPT' }] } }),
      reasons: ['CANDIDATE_ID_NOT_UNIQUE'],
    },
  ];

  for (const scenario of cases) {
    const result = qualifyEvent(scenario.value);
    assert.equal(result.phase5e_status, 'NOT_FINAL', scenario.name);
    assert.deepEqual(result.qualification_reason_codes, scenario.reasons, scenario.name);
  }
});

test('does not treat optional Phase 4 limitations or a duplicate recommendation as final blockers', () => {
  const cases = [
    {
      name: 'limited Phase 4 record with rejected optional facts',
      value: input({ phase5a: { candidate_id: 'candidate-1', phase3_event_candidate_result_id: 'phase3-result-1', phase5a_status: 'PREPARED', phase4_status: 'INCOMPLETE', phase4_safeguard_status: 'REJECT' } }),
    },
    {
      name: 'unknown actual date',
      value: input({ timeline: { event_date: null, event_date_precision: 'unknown', timeline_reference_basis: 'SOURCE_PUBLICATION_DATE' } }),
    },
    {
      name: 'unresolved event geography',
      value: input({ geography: { event_geography_status: 'AWAITING_REFERENCE_REVIEW' } }),
    },
    {
      name: 'possible duplicate recommendation',
      value: input({ phase5d: { recommendation_status: 'POSSIBLE_DUPLICATE' } }),
    },
  ];

  for (const scenario of cases) {
    const result = qualifyEvent(scenario.value);
    assert.equal(result.phase5e_status, 'FINAL', scenario.name);
  }
});

test('accepts an accepted Unclassified result without inventing an Event Type', () => {
  const result = qualifyEvent(input({
    phase5b: {
      classification_status: 'UNCLASSIFIED',
      safeguard_status: 'ACCEPT',
      event_type: null,
    },
  }));

  assert.equal(result.phase5e_status, 'FINAL');
  assert.deepEqual(result.qualification_reason_codes, ['FINAL_CANDIDATE_GROUNDED']);
});
