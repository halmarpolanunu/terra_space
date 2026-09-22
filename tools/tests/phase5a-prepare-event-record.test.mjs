import test from 'node:test';
import assert from 'node:assert/strict';

import {preparePhase5ARecord} from '../n8n/phase5a-prepare-event-record.mjs';

function fixture(overrides = {}) {
  const phase4Status = overrides.phase4_status ?? 'VALID';
  return {
    phase4_event_fact_id: '11111111-1111-4111-8111-111111111111',
    phase3_event_candidate_result_id: '22222222-2222-4222-8222-222222222222',
    phase1_source_id: '33333333-3333-4333-8333-333333333333',
    candidate_id: '59-c1',
    source_publication_date: '2026-09-08',
    phase3_result_status: 'VALID',
    phase3_result_reason: null,
    phase3_candidate_status: 'VALID',
    phase3_candidate_reason: null,
    candidate_title: 'Original candidate title',
    candidate_description: 'Original candidate description.',
    candidate_evidence_quote: 'Original exact evidence quote.',
    phase4_status: phase4Status,
    phase4_extraction_status: 'FACTS_FOUND',
    phase4_safeguard_status: 'ACCEPT',
    phase4_review_reason:
      phase4Status === 'VALID' ? null : 'Optional facts were unavailable.',
    phase4_error_message: null,
    facts: {
      event_date: null,
      event_date_precision: 'unknown',
      event_date_evidence_quote: null,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: 'Original exact evidence quote.',
      actors: [],
      locations: [],
    },
    existing_phase5_record_id: null,
    existing_phase5a_status: null,
    sequence_id: 59,
    source_title: 'Source title',
    ...overrides,
  };
}

test('routes a VALID Phase 4 result to NORMAL and PREPARED', () => {
  const result = preparePhase5ARecord(fixture({phase4_status: 'VALID'}));

  assert.equal(result.event_path, 'NORMAL');
  assert.equal(result.phase5a_status, 'PREPARED');
  assert.equal(result.error_message, null);
});

test('routes INCOMPLETE and NEEDS_REVIEW results to LIMITED', () => {
  for (const phase4Status of ['INCOMPLETE', 'NEEDS_REVIEW']) {
    const result = preparePhase5ARecord(fixture({phase4_status: phase4Status}));

    assert.equal(result.event_path, 'LIMITED');
    assert.equal(result.phase5a_status, 'PREPARED');
  }
});

test('copies every approved upstream field without rewriting', () => {
  const input = fixture({
    phase3_result_status: 'NEEDS_REVIEW',
    phase3_result_reason: 'Article-level review reason.',
    phase3_candidate_status: 'NEEDS_REVIEW',
    phase3_candidate_reason: 'Candidate-level review reason.',
    phase4_status: 'NEEDS_REVIEW',
    phase4_safeguard_status: 'REJECT',
    phase4_review_reason: 'Phase 4 review reason.',
  });

  const result = preparePhase5ARecord(input);

  assert.deepEqual(
    {
      phase4_event_fact_id: result.phase4_event_fact_id,
      phase3_event_candidate_result_id: result.phase3_event_candidate_result_id,
      phase1_source_id: result.phase1_source_id,
      candidate_id: result.candidate_id,
      source_publication_date: result.source_publication_date,
      phase3_result_status: result.phase3_result_status,
      phase3_result_reason: result.phase3_result_reason,
      phase3_candidate_status: result.phase3_candidate_status,
      phase3_candidate_reason: result.phase3_candidate_reason,
      candidate_title: result.candidate_title,
      candidate_description: result.candidate_description,
      candidate_evidence_quote: result.candidate_evidence_quote,
      phase4_status: result.phase4_status,
      phase4_extraction_status: result.phase4_extraction_status,
      phase4_safeguard_status: result.phase4_safeguard_status,
      phase4_review_reason: result.phase4_review_reason,
      phase4_error_message: result.phase4_error_message,
      facts: result.facts,
    },
    {
      phase4_event_fact_id: '11111111-1111-4111-8111-111111111111',
      phase3_event_candidate_result_id: '22222222-2222-4222-8222-222222222222',
      phase1_source_id: '33333333-3333-4333-8333-333333333333',
      candidate_id: '59-c1',
      source_publication_date: '2026-09-08',
      phase3_result_status: 'NEEDS_REVIEW',
      phase3_result_reason: 'Article-level review reason.',
      phase3_candidate_status: 'NEEDS_REVIEW',
      phase3_candidate_reason: 'Candidate-level review reason.',
      candidate_title: 'Original candidate title',
      candidate_description: 'Original candidate description.',
      candidate_evidence_quote: 'Original exact evidence quote.',
      phase4_status: 'NEEDS_REVIEW',
      phase4_extraction_status: 'FACTS_FOUND',
      phase4_safeguard_status: 'REJECT',
      phase4_review_reason: 'Phase 4 review reason.',
      phase4_error_message: null,
      facts: {
        event_date: null,
        event_date_precision: 'unknown',
        event_date_evidence_quote: null,
        epistemic_status: 'reported',
        epistemic_status_evidence_quote: 'Original exact evidence quote.',
        actors: [],
        locations: [],
      },
    },
  );
});

test('deep-clones facts while preserving unknown dates and empty arrays', () => {
  const input = fixture();
  const result = preparePhase5ARecord(input);

  assert.notEqual(result.facts, input.facts);
  assert.equal(result.facts.event_date, null);
  assert.equal(result.facts.event_date_precision, 'unknown');
  assert.deepEqual(result.facts.actors, []);
  assert.deepEqual(result.facts.locations, []);

  result.facts.actors.push({name: 'Mutation'});
  assert.deepEqual(input.facts.actors, []);
});

test('rejects FAILED and unknown Phase 4 statuses', () => {
  for (const phase4Status of ['FAILED', 'UNKNOWN']) {
    assert.throws(
      () => preparePhase5ARecord(fixture({phase4_status: phase4Status})),
      new RegExp(`not eligible.*${phase4Status}`, 'i'),
    );
  }
});

test('rejects a LIMITED record without its Phase 4 reason', () => {
  assert.throws(
    () =>
      preparePhase5ARecord(
        fixture({phase4_status: 'INCOMPLETE', phase4_review_reason: '   '}),
      ),
    /limited record must preserve its Phase 4 reason/i,
  );
});

test('creates a unique submission UUID for every attempt', () => {
  const first = preparePhase5ARecord(fixture());
  const second = preparePhase5ARecord(fixture());
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assert.match(first.submission_key, uuidPattern);
  assert.match(second.submission_key, uuidPattern);
  assert.notEqual(first.submission_key, second.submission_key);
});

test('does not invent fields belonging to later Phase 5 stages', () => {
  const result = preparePhase5ARecord(fixture());

  for (const forbiddenField of [
    'event_type',
    'canonical_actor',
    'latitude',
    'longitude',
    'duplicate_of',
    'final_status',
    'published_at',
  ]) {
    assert.equal(Object.hasOwn(result, forbiddenField), false);
  }
});
