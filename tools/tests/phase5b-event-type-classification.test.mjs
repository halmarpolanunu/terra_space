import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySafeguardDecision,
  buildClassifierPrompt,
  buildSafeguardPrompt,
  parseClassifierOutput,
  parseSafeguardOutput,
  prepareTechnicalFailure,
} from '../n8n/phase5b-event-type-classification.mjs';

const activeTypes = [
  {
    id: '9d3c99d3-aa65-4b0a-8181-27c6010fd831',
    name: 'Military Mobilization',
    description: 'A meaningful mobilization, deployment, readiness, or force-preparation action.',
    domain: 'Security & Conflict',
    category: 'Signalling & Posture',
    subcategory: 'Military Readiness',
    path: 'Security & Conflict > Signalling & Posture > Military Readiness > Military Mobilization',
  },
  {
    id: '1ea35b99-acb5-4841-948b-83d12310fb5b',
    name: 'Diplomatic Statement',
    description: 'An official diplomatic statement, communication, or position.',
    domain: 'Diplomacy',
    category: 'Diplomatic Engagement',
    subcategory: 'Diplomatic Communication',
    path: 'Diplomacy > Diplomatic Engagement > Diplomatic Communication > Diplomatic Statement',
  },
];

function eventFixture(overrides = {}) {
  return {
    phase5_event_record_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    phase4_event_fact_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    phase3_event_candidate_result_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    phase1_source_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    sequence_id: 59,
    candidate_id: '59-c1',
    source_publication_date: '2026-09-08',
    candidate_title: 'State deploys additional forces near the border',
    candidate_description: 'The defence ministry announced a readiness deployment.',
    candidate_evidence_quote: 'The defence ministry deployed two additional units near the border.',
    facts: {
      event_date: null,
      event_date_precision: 'unknown',
      actors: [{name: 'Defence ministry', role: 'source'}],
      locations: [],
    },
    event_path: 'NORMAL',
    phase5a_status: 'PREPARED',
    phase3_result_status: 'VALID',
    phase3_result_reason: null,
    phase3_candidate_status: 'VALID',
    phase3_candidate_reason: null,
    phase4_status: 'VALID',
    phase4_extraction_status: 'FACTS_FOUND',
    phase4_safeguard_status: 'ACCEPT',
    phase4_review_reason: null,
    phase4_error_message: null,
    source_title: 'Forbidden source title marker',
    full_article_text: 'Forbidden full article marker',
    another_candidate: 'Forbidden neighboring candidate marker',
    ...overrides,
  };
}

function metadata(overrides = {}) {
  return {
    classifier_model: 'google/gemma-4-12b-qat',
    classifier_prompt_version: 'phase5b-classifier-v1',
    safeguard_model: 'google/gemma-4-12b-qat',
    safeguard_prompt_version: 'phase5b-safeguard-v1',
    ...overrides,
  };
}

function classifiedOutput(overrides = {}) {
  return {
    selected_event_type: 'Military Mobilization',
    classification_reason: 'The evidence describes deployment and readiness activity.',
    new_type_proposal: null,
    ...overrides,
  };
}

function unclassifiedOutput(overrides = {}) {
  return {
    selected_event_type: null,
    classification_reason: 'No approved definition is sufficiently supported.',
    new_type_proposal: null,
    ...overrides,
  };
}

function proposal(overrides = {}) {
  return {
    name: 'Border Monitoring Action',
    description: 'A monitoring action that does not deploy or use armed force.',
    reason: 'None of the approved definitions covers observation-only activity.',
    possible_overlap: 'Military Mobilization, but no forces were deployed.',
    ...overrides,
  };
}

test('classifier prompt exposes only bounded prepared-event fields', () => {
  const rawPrompt = buildClassifierPrompt(eventFixture(), activeTypes);
  const prompt = JSON.parse(rawPrompt);

  assert.deepEqual(Object.keys(prompt.prepared_event).sort(), [
    'description',
    'evidence',
    'extracted_facts',
    'reasons',
    'source_publication_date',
    'statuses',
    'title',
  ]);
  assert.equal(prompt.prepared_event.title, 'State deploys additional forces near the border');
  assert.equal(
    prompt.prepared_event.evidence,
    'The defence ministry deployed two additional units near the border.',
  );
  assert.equal(rawPrompt.includes('Forbidden full article marker'), false);
  assert.equal(rawPrompt.includes('Forbidden neighboring candidate marker'), false);
  assert.equal(rawPrompt.includes('Forbidden source title marker'), false);
});

test('classifier prompt includes every exact active definition and complete path', () => {
  const prompt = JSON.parse(buildClassifierPrompt(eventFixture(), activeTypes));

  assert.deepEqual(prompt.active_event_types, activeTypes);
  assert.match(prompt.rules.join(' '), /outside knowledge/i);
  assert.match(prompt.rules.join(' '), /do not force/i);
  assert.match(prompt.rules.join(' '), /exactly one approved type or null/i);
});

test('classifier prompt delegates proposal evidence copying to the deterministic workflow', () => {
  const prompt = JSON.parse(buildClassifierPrompt(eventFixture(), activeTypes));
  const rules = prompt.rules.join(' ');

  assert.match(rules, /do not copy an evidence quote/i);
  assert.match(rules, /workflow attaches.*evidence deterministically/i);
  assert.match(rules, /return no proposal|new_type_proposal.*null/i);
  assert.match(rules, /unclassified/i);
});

test('classifier prompt includes prior safeguard feedback only on a corrective attempt', () => {
  const first = JSON.parse(buildClassifierPrompt(eventFixture(), activeTypes));
  const retry = JSON.parse(
    buildClassifierPrompt(
      eventFixture(),
      activeTypes,
      'The evidence does not establish an actual deployment.',
    ),
  );

  assert.equal(first.safeguard_feedback, null);
  assert.equal(
    retry.safeguard_feedback,
    'The evidence does not establish an actual deployment.',
  );
});

test('classifier parser accepts one approved type and restores its official identity', () => {
  const parsed = parseClassifierOutput(
    JSON.stringify(classifiedOutput({selected_event_type: '  military MOBILIZATION '})),
    activeTypes,
    eventFixture(),
  );

  assert.equal(parsed.selected_event_type, 'Military Mobilization');
  assert.equal(parsed.selected_event_type_id, '9d3c99d3-aa65-4b0a-8181-27c6010fd831');
  assert.equal(parsed.classification_reason, 'The evidence describes deployment and readiness activity.');
  assert.equal(parsed.new_type_proposal, null);
});

test('classifier parser accepts a null type without forcing a closest match', () => {
  const parsed = parseClassifierOutput(
    JSON.stringify(unclassifiedOutput()),
    activeTypes,
    eventFixture(),
  );

  assert.equal(parsed.selected_event_type, null);
  assert.equal(parsed.selected_event_type_id, null);
});

test('classifier parser rejects malformed JSON, arrays, missing keys, and extra keys', () => {
  const invalidValues = [
    '{not json',
    '[]',
    JSON.stringify({selected_event_type: null, classification_reason: 'Reason'}),
    JSON.stringify({...unclassifiedOutput(), extra: true}),
  ];

  for (const raw of invalidValues) {
    assert.throws(
      () => parseClassifierOutput(raw, activeTypes, eventFixture()),
      /classifier output/i,
    );
  }
});

test('classifier parser rejects unknown types and blank reasons', () => {
  assert.throws(
    () =>
      parseClassifierOutput(
        JSON.stringify(classifiedOutput({selected_event_type: 'Closest-looking unknown type'})),
        activeTypes,
        eventFixture(),
      ),
    /active Event Type/i,
  );
  assert.throws(
    () =>
      parseClassifierOutput(
        JSON.stringify(classifiedOutput({classification_reason: '   '})),
        activeTypes,
        eventFixture(),
      ),
    /classification reason/i,
  );
});

test('classifier parser rejects a proposal paired with an approved type', () => {
  assert.throws(
    () =>
      parseClassifierOutput(
        JSON.stringify(classifiedOutput({new_type_proposal: proposal()})),
        activeTypes,
        eventFixture(),
      ),
    /proposal.*only.*null/i,
  );
});

test('classifier parser accepts a grounded proposal for a null match', () => {
  const parsed = parseClassifierOutput(
    JSON.stringify(unclassifiedOutput({new_type_proposal: proposal()})),
    activeTypes,
    eventFixture(),
  );

  assert.deepEqual(parsed.new_type_proposal, {
    ...proposal(),
    supporting_evidence: 'The defence ministry deployed two additional units near the border.',
  });
});

test('classifier parser attaches the complete bounded evidence without requiring the model to copy it', () => {
  const {supporting_evidence: ignored, ...modelProposal} = proposal();
  const parsed = parseClassifierOutput(
    JSON.stringify(unclassifiedOutput({new_type_proposal: modelProposal})),
    activeTypes,
    eventFixture(),
  );

  assert.equal(
    parsed.new_type_proposal.supporting_evidence,
    'The defence ministry deployed two additional units near the border.',
  );
});

test('classifier parser rejects proposal fields that are missing, extra, or blank', () => {
  const {reason: ignored, ...missingReason} = proposal();
  const invalidProposals = [
    missingReason,
    {...proposal(), extra: 'not allowed'},
    proposal({description: '   '}),
    proposal({possible_overlap: '   '}),
  ];

  for (const newTypeProposal of invalidProposals) {
    assert.throws(
      () =>
        parseClassifierOutput(
          JSON.stringify(unclassifiedOutput({new_type_proposal: newTypeProposal})),
          activeTypes,
          eventFixture(),
        ),
      /proposal/i,
    );
  }
});

test('classifier parser rejects a proposal name matching an active type', () => {
  assert.throws(
    () =>
      parseClassifierOutput(
        JSON.stringify(
          unclassifiedOutput({new_type_proposal: proposal({name: '  DIPLOMATIC statement  '})}),
        ),
        activeTypes,
        eventFixture(),
      ),
    /proposal name.*active Event Type/i,
  );
});

test('classifier parser rejects a model-supplied evidence field that the workflow owns', () => {
  assert.throws(
    () =>
      parseClassifierOutput(
        JSON.stringify(
          unclassifiedOutput({
            new_type_proposal: proposal({supporting_evidence: 'Words copied by the model'}),
          }),
        ),
        activeTypes,
        eventFixture(),
      ),
    /proposal.*exactly/i,
  );
});

test('safeguard prompt independently includes evidence, definitions, and proposed result', () => {
  const classification = parseClassifierOutput(
    JSON.stringify(classifiedOutput()),
    activeTypes,
    eventFixture(),
  );
  const prompt = JSON.parse(buildSafeguardPrompt(eventFixture(), activeTypes, classification));

  assert.equal(
    prompt.prepared_event.evidence,
    'The defence ministry deployed two additional units near the border.',
  );
  assert.deepEqual(prompt.active_event_types, activeTypes);
  assert.deepEqual(prompt.proposed_classification, classification);
  assert.match(prompt.rules.join(' '), /independently/i);
  assert.match(prompt.rules.join(' '), /ACCEPT.*REJECT/i);
});

test('safeguard prompt treats an approved match and an unclassified proposal as valid review modes', () => {
  const classification = {
    selected_event_type: null,
    selected_event_type_id: null,
    classification_reason: 'No approved definition is sufficiently supported.',
    new_type_proposal: {
      ...proposal(),
      supporting_evidence: eventFixture().candidate_evidence_quote,
    },
  };
  const prompt = JSON.parse(buildSafeguardPrompt(eventFixture(), activeTypes, classification));

  assert.deepEqual(prompt.valid_review_modes, {
    approved_type_match:
      'Verify that the selected name and ID identify one active type and that its definition is supported by the prepared event.',
    unclassified:
      'Verify that no active type is sufficiently supported; a grounded new-type proposal is optional and permitted, and must not be rejected merely because no active type was selected.',
  });
});

test('safeguard parser accepts exact ACCEPT and concrete REJECT shapes', () => {
  assert.deepEqual(parseSafeguardOutput('{"decision":"ACCEPT","reason":null}'), {
    decision: 'ACCEPT',
    reason: null,
  });
  assert.deepEqual(
    parseSafeguardOutput(
      '{"decision":"REJECT","reason":"The evidence does not establish deployment."}',
    ),
    {decision: 'REJECT', reason: 'The evidence does not establish deployment.'},
  );
});

test('safeguard parser rejects extra fields, substituted types, and invalid reasons', () => {
  const invalid = [
    '[]',
    '{"decision":"ACCEPT","reason":"Should be null"}',
    '{"decision":"REJECT","reason":"   "}',
    '{"decision":"REJECT","reason":"Reason","selected_event_type":"Diplomatic Statement"}',
    '{"decision":"MAYBE","reason":null}',
  ];

  for (const raw of invalid) {
    assert.throws(() => parseSafeguardOutput(raw), /safeguard output/i);
  }
});

test('accepted approved match finalizes as CLASSIFIED and AI_ASSIGNED', () => {
  const event = eventFixture();
  const classification = parseClassifierOutput(
    JSON.stringify(classifiedOutput()),
    activeTypes,
    event,
  );
  const result = applySafeguardDecision(
    {event, classification, retry_count: 0, attempt_trace: [], metadata: metadata()},
    {decision: 'ACCEPT', reason: null},
  );

  assert.equal(result.action, 'FINALIZE');
  assert.deepEqual(
    {
      phase5_event_record_id: result.record.phase5_event_record_id,
      event_type_id: result.record.event_type_id,
      event_type_name: result.record.event_type_name,
      classification_status: result.record.classification_status,
      assignment_source: result.record.assignment_source,
      classification_reason: result.record.classification_reason,
      safeguard_status: result.record.safeguard_status,
      corrective_retry_count: result.record.corrective_retry_count,
      error_message: result.record.error_message,
    },
    {
      phase5_event_record_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      event_type_id: '9d3c99d3-aa65-4b0a-8181-27c6010fd831',
      event_type_name: 'Military Mobilization',
      classification_status: 'CLASSIFIED',
      assignment_source: 'AI_ASSIGNED',
      classification_reason: 'The evidence describes deployment and readiness activity.',
      safeguard_status: 'ACCEPT',
      corrective_retry_count: 0,
      error_message: null,
    },
  );
  assert.equal(result.proposal, null);
  assert.equal(result.record.attempt_trace.length, 1);
});

test('accepted null match finalizes as UNCLASSIFIED and retains an optional proposal', () => {
  const event = eventFixture();
  const classification = parseClassifierOutput(
    JSON.stringify(unclassifiedOutput({new_type_proposal: proposal()})),
    activeTypes,
    event,
  );
  const result = applySafeguardDecision(
    {event, classification, retry_count: 0, attempt_trace: [], metadata: metadata()},
    {decision: 'ACCEPT', reason: null},
  );

  assert.equal(result.record.classification_status, 'UNCLASSIFIED');
  assert.equal(result.record.event_type_id, null);
  assert.equal(result.record.assignment_source, null);
  assert.deepEqual(result.proposal, {
    phase5_event_record_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    proposed_name: 'Border Monitoring Action',
    proposed_description: 'A monitoring action that does not deploy or use armed force.',
    proposal_reason: 'None of the approved definitions covers observation-only activity.',
    possible_overlap: 'Military Mobilization, but no forces were deployed.',
    supporting_evidence: 'The defence ministry deployed two additional units near the border.',
    review_status: 'PENDING_REVIEW',
  });
});

test('safeguard rejection requests correction on retry counts zero and one', () => {
  for (const retryCount of [0, 1]) {
    const event = eventFixture();
    const classification = parseClassifierOutput(
      JSON.stringify(unclassifiedOutput({new_type_proposal: proposal()})),
      activeTypes,
      event,
    );
    const priorTrace = retryCount === 0
      ? []
      : [{attempt: 1, classification: {selected_event_type: null}, safeguard: {decision: 'REJECT', reason: 'First rejection.'}}];
    const result = applySafeguardDecision(
      {event, classification, retry_count: retryCount, attempt_trace: priorTrace, metadata: metadata()},
      {decision: 'REJECT', reason: 'The result is not sufficiently grounded.'},
    );

    assert.equal(result.action, 'RETRY');
    assert.equal(result.retry_count, retryCount + 1);
    assert.equal(result.feedback, 'The result is not sufficiently grounded.');
    assert.equal(result.proposal, null);
    assert.equal(result.attempt_trace.length, retryCount + 1);
  }
});

test('safeguard decision rejects a retry state with missing prior audit entries', () => {
  const event = eventFixture();
  const classification = parseClassifierOutput(
    JSON.stringify(classifiedOutput()),
    activeTypes,
    event,
  );

  assert.throws(
    () =>
      applySafeguardDecision(
        {event, classification, retry_count: 1, attempt_trace: [], metadata: metadata()},
        {decision: 'REJECT', reason: 'Second-attempt rejection.'},
      ),
    /audit trace.*retry count/i,
  );
});

test('third safeguard rejection finalizes UNCLASSIFIED with the full three-attempt trace', () => {
  const event = eventFixture();
  const classification = parseClassifierOutput(
    JSON.stringify(classifiedOutput()),
    activeTypes,
    event,
  );
  const priorTrace = [
    {attempt: 1, classification: {selected_event_type: 'Diplomatic Statement'}, safeguard: {decision: 'REJECT', reason: 'Wrong type.'}},
    {attempt: 2, classification: {selected_event_type: null}, safeguard: {decision: 'REJECT', reason: 'Reason unsupported.'}},
  ];
  const result = applySafeguardDecision(
    {event, classification, retry_count: 2, attempt_trace: priorTrace, metadata: metadata()},
    {decision: 'REJECT', reason: 'The final proposed match remains unsupported.'},
  );

  assert.equal(result.action, 'FINALIZE');
  assert.equal(result.record.classification_status, 'UNCLASSIFIED');
  assert.equal(result.record.event_type_id, null);
  assert.equal(result.record.assignment_source, null);
  assert.equal(result.record.corrective_retry_count, 2);
  assert.equal(result.record.attempt_trace.length, 3);
  assert.equal(result.record.attempt_trace[2].attempt, 3);
  assert.equal(result.record.safeguard_status, 'REJECT');
  assert.equal(result.proposal, null);
});

test('technical failure creates a retryable FAILED record without semantic invention', () => {
  const result = prepareTechnicalFailure(
    eventFixture(),
    metadata({
      corrective_retry_count: 1,
      safeguard_status: 'NOT_RUN',
      attempt_trace: [{attempt: 1, technical_error: 'Parser rejected malformed JSON.'}],
    }),
    new Error('Classifier response was malformed JSON.'),
  );

  assert.equal(result.action, 'FINALIZE');
  assert.equal(result.record.classification_status, 'FAILED');
  assert.equal(result.record.event_type_id, null);
  assert.equal(result.record.event_type_name, null);
  assert.equal(result.record.assignment_source, null);
  assert.equal(result.record.classification_reason, null);
  assert.equal(result.record.safeguard_status, 'NOT_RUN');
  assert.equal(result.record.corrective_retry_count, 1);
  assert.equal(result.record.error_message, 'Classifier response was malformed JSON.');
  assert.equal(result.record.attempt_trace.length, 1);
  assert.equal(result.proposal, null);
});

test('technical failure rejects missing event identity and blank errors', () => {
  assert.throws(
    () => prepareTechnicalFailure(eventFixture({phase5_event_record_id: null}), metadata(), new Error('Failure')),
    /event record identity/i,
  );
  assert.throws(
    () => prepareTechnicalFailure(eventFixture(), metadata(), new Error('   ')),
    /technical error/i,
  );
});
