const CLASSIFIER_KEYS = [
  'selected_event_type',
  'classification_reason',
  'new_type_proposal',
];

const PROPOSAL_KEYS = [
  'name',
  'description',
  'reason',
  'possible_overlap',
];

const SAFEGUARD_KEYS = ['decision', 'reason'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must contain exactly: ${expectedKeys.join(', ')}.`);
  }
}

function requireNonBlank(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a nonblank string.`);
  }
  return value.trim();
}

function normalizeName(value) {
  return value.trim().toLocaleLowerCase('en-US');
}

function cloneActiveTypes(activeTypes) {
  if (!Array.isArray(activeTypes) || activeTypes.length === 0) {
    throw new Error('Active Event Type definitions must be a nonempty array.');
  }

  const normalizedNames = new Set();
  for (const type of activeTypes) {
    if (!isPlainObject(type)) {
      throw new Error('Every active Event Type definition must be an object.');
    }
    for (const field of ['id', 'name', 'description', 'domain', 'category', 'subcategory', 'path']) {
      requireNonBlank(type[field], `Active Event Type ${field}`);
    }
    const normalized = normalizeName(type.name);
    if (normalizedNames.has(normalized)) {
      throw new Error('Active Event Type names must be unique after normalization.');
    }
    normalizedNames.add(normalized);
  }

  return structuredClone(activeTypes);
}

function boundedPreparedEvent(event) {
  if (!isPlainObject(event)) {
    throw new Error('Prepared event must be an object.');
  }

  return {
    title: requireNonBlank(event.candidate_title, 'Prepared event title'),
    description: requireNonBlank(event.candidate_description, 'Prepared event description'),
    evidence: requireNonBlank(event.candidate_evidence_quote, 'Prepared event evidence'),
    extracted_facts: structuredClone(event.facts ?? {}),
    source_publication_date: event.source_publication_date ?? null,
    statuses: {
      event_path: event.event_path,
      phase5a_status: event.phase5a_status,
      phase3_result_status: event.phase3_result_status,
      phase3_candidate_status: event.phase3_candidate_status,
      phase4_status: event.phase4_status,
      phase4_extraction_status: event.phase4_extraction_status,
      phase4_safeguard_status: event.phase4_safeguard_status,
    },
    reasons: {
      phase3_result_reason: event.phase3_result_reason ?? null,
      phase3_candidate_reason: event.phase3_candidate_reason ?? null,
      phase4_review_reason: event.phase4_review_reason ?? null,
      phase4_error_message: event.phase4_error_message ?? null,
    },
  };
}

function parseJsonObject(raw, label) {
  if (typeof raw !== 'string') {
    throw new Error(`${label} must be a JSON string.`);
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function normalizedMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    throw new Error('Phase 5B processing metadata must be an object.');
  }
  return {
    classifier_model: requireNonBlank(metadata.classifier_model, 'Classifier model'),
    classifier_prompt_version: requireNonBlank(
      metadata.classifier_prompt_version,
      'Classifier prompt version',
    ),
    safeguard_model: requireNonBlank(metadata.safeguard_model, 'Safeguard model'),
    safeguard_prompt_version: requireNonBlank(
      metadata.safeguard_prompt_version,
      'Safeguard prompt version',
    ),
  };
}

function requireEventIdentity(event) {
  return requireNonBlank(event?.phase5_event_record_id, 'Phase 5 event record identity');
}

function requireRetryCount(value) {
  if (!Number.isInteger(value) || value < 0 || value > 2) {
    throw new Error('Corrective retry count must be 0, 1, or 2.');
  }
  return value;
}

function traceAttempt(state, decision) {
  const trace = Array.isArray(state.attempt_trace)
    ? structuredClone(state.attempt_trace)
    : [];
  trace.push({
    attempt: state.retry_count + 1,
    classification: structuredClone(state.classification),
    safeguard: structuredClone(decision),
  });
  return trace;
}

function baseRecord(event, metadata, retryCount, attemptTrace) {
  return {
    phase5_event_record_id: requireEventIdentity(event),
    ...normalizedMetadata(metadata),
    corrective_retry_count: retryCount,
    attempt_trace: attemptTrace,
  };
}

export function buildClassifierPrompt(event, activeTypes, feedback = null) {
  let safeguardFeedback = null;
  if (feedback !== null && feedback !== undefined) {
    safeguardFeedback = requireNonBlank(feedback, 'Safeguard feedback');
  }

  return JSON.stringify({
    task: 'Classify one bounded prepared event against the active Event Types.',
    rules: [
      'Use only the prepared event below. Do not use outside knowledge.',
      'Select exactly one approved type or null. Do not force a closest match.',
      'Do not infer missing facts. Preserve uncertainty and LIMITED status context.',
      'Return only the required JSON object with no extra fields.',
      'A new type proposal is optional and is allowed only when selected_event_type is null.',
      'Do not copy an evidence quote into a new type proposal; the workflow attaches the complete bounded prepared-event evidence deterministically.',
      'If the prepared event does not support a new type proposal, return no proposal by setting new_type_proposal to null; keep selected_event_type null so the event remains Unclassified.',
    ],
    prepared_event: boundedPreparedEvent(event),
    active_event_types: cloneActiveTypes(activeTypes),
    safeguard_feedback: safeguardFeedback,
    required_output: {
      selected_event_type: 'Exact active Event Type name, or null',
      classification_reason: 'Short evidence-grounded reason',
      new_type_proposal: 'Exact proposal object, or null',
    },
  });
}

export function parseClassifierOutput(raw, activeTypes, event) {
  const value = parseJsonObject(raw, 'Classifier output');
  assertExactKeys(value, CLASSIFIER_KEYS, 'Classifier output');

  const officialTypes = cloneActiveTypes(activeTypes);
  const reason = requireNonBlank(value.classification_reason, 'Classification reason');
  let selectedType = null;

  if (value.selected_event_type !== null) {
    if (typeof value.selected_event_type !== 'string' || !value.selected_event_type.trim()) {
      throw new Error('Selected Event Type must be null or a nonblank string.');
    }
    const normalizedSelection = normalizeName(value.selected_event_type);
    selectedType = officialTypes.find((type) => normalizeName(type.name) === normalizedSelection);
    if (!selectedType) {
      throw new Error('Selected value is not an active Event Type.');
    }
  }

  let parsedProposal = null;
  if (value.new_type_proposal !== null) {
    if (selectedType) {
      throw new Error('A new type proposal is allowed only when selected_event_type is null.');
    }
    assertExactKeys(value.new_type_proposal, PROPOSAL_KEYS, 'New type proposal');

    parsedProposal = {
      name: requireNonBlank(value.new_type_proposal.name, 'Proposal name'),
      description: requireNonBlank(value.new_type_proposal.description, 'Proposal description'),
      reason: requireNonBlank(value.new_type_proposal.reason, 'Proposal reason'),
      possible_overlap: requireNonBlank(
        value.new_type_proposal.possible_overlap,
        'Proposal possible overlap',
      ),
    };

    if (officialTypes.some((type) => normalizeName(type.name) === normalizeName(parsedProposal.name))) {
      throw new Error('Proposal name must not match an active Event Type.');
    }

    parsedProposal.supporting_evidence = requireNonBlank(
      event?.candidate_evidence_quote,
      'Prepared event evidence',
    );
  }

  return {
    selected_event_type: selectedType?.name ?? null,
    selected_event_type_id: selectedType?.id ?? null,
    classification_reason: reason,
    new_type_proposal: parsedProposal,
  };
}

export function buildSafeguardPrompt(event, activeTypes, classification) {
  if (!isPlainObject(classification)) {
    throw new Error('Proposed classification must be an object.');
  }

  return JSON.stringify({
    task: 'Independently verify one proposed Phase 5B classification.',
    rules: [
      'Independently check the result using only the prepared event and active definitions below.',
      'Reject unsupported inference, a forced closest match, or an invalid proposal.',
      'Both review modes below are valid. Do not reject an Unclassified result merely because no active Event Type was selected.',
      'A new-type proposal is optional and permitted only in the Unclassified mode; verify that its name, description, reason, and possible overlap are grounded in the prepared event.',
      'Return only ACCEPT with a null reason, or REJECT with one concrete nonblank reason.',
      'Do not return, replace, or suggest an Event Type in the safeguard output.',
    ],
    prepared_event: boundedPreparedEvent(event),
    active_event_types: cloneActiveTypes(activeTypes),
    proposed_classification: structuredClone(classification),
    valid_review_modes: {
      approved_type_match:
        'Verify that the selected name and ID identify one active type and that its definition is supported by the prepared event.',
      unclassified:
        'Verify that no active type is sufficiently supported; a grounded new-type proposal is optional and permitted, and must not be rejected merely because no active type was selected.',
    },
    required_output: {
      decision: 'ACCEPT or REJECT',
      reason: 'null for ACCEPT; concrete reason for REJECT',
    },
  });
}

export function parseSafeguardOutput(raw) {
  const value = parseJsonObject(raw, 'Safeguard output');
  assertExactKeys(value, SAFEGUARD_KEYS, 'Safeguard output');

  if (value.decision === 'ACCEPT' && value.reason === null) {
    return {decision: 'ACCEPT', reason: null};
  }
  if (value.decision === 'REJECT') {
    return {
      decision: 'REJECT',
      reason: requireNonBlank(value.reason, 'Safeguard output reason'),
    };
  }
  throw new Error('Safeguard output must be ACCEPT with null reason or REJECT with a reason.');
}

export function applySafeguardDecision(state, decision) {
  if (!isPlainObject(state) || !isPlainObject(state.classification)) {
    throw new Error('Phase 5B safeguard state is invalid.');
  }
  const retryCount = requireRetryCount(state.retry_count);
  if (!Array.isArray(state.attempt_trace) || state.attempt_trace.length !== retryCount) {
    throw new Error('Audit trace length must match the corrective retry count.');
  }
  const parsedDecision = parseSafeguardOutput(JSON.stringify(decision));
  const attemptTrace = traceAttempt(state, parsedDecision);

  if (parsedDecision.decision === 'REJECT' && retryCount < 2) {
    return {
      action: 'RETRY',
      retry_count: retryCount + 1,
      feedback: parsedDecision.reason,
      attempt_trace: attemptTrace,
      proposal: null,
    };
  }

  const common = baseRecord(state.event, state.metadata, retryCount, attemptTrace);
  if (parsedDecision.decision === 'REJECT') {
    return {
      action: 'FINALIZE',
      record: {
        ...common,
        event_type_id: null,
        event_type_name: null,
        classification_status: 'UNCLASSIFIED',
        assignment_source: null,
        classification_reason:
          'No approved Event Type passed the independent safeguard after three attempts.',
        safeguard_status: 'REJECT',
        safeguard_reason: parsedDecision.reason,
        error_message: null,
      },
      proposal: null,
    };
  }

  const classification = state.classification;
  if (classification.selected_event_type_id) {
    return {
      action: 'FINALIZE',
      record: {
        ...common,
        event_type_id: classification.selected_event_type_id,
        event_type_name: classification.selected_event_type,
        classification_status: 'CLASSIFIED',
        assignment_source: 'AI_ASSIGNED',
        classification_reason: classification.classification_reason,
        safeguard_status: 'ACCEPT',
        safeguard_reason: null,
        error_message: null,
      },
      proposal: null,
    };
  }

  const acceptedProposal = classification.new_type_proposal
    ? {
        phase5_event_record_id: requireEventIdentity(state.event),
        proposed_name: classification.new_type_proposal.name,
        proposed_description: classification.new_type_proposal.description,
        proposal_reason: classification.new_type_proposal.reason,
        possible_overlap: classification.new_type_proposal.possible_overlap,
        supporting_evidence: classification.new_type_proposal.supporting_evidence,
        review_status: 'PENDING_REVIEW',
      }
    : null;

  return {
    action: 'FINALIZE',
    record: {
      ...common,
      event_type_id: null,
      event_type_name: null,
      classification_status: 'UNCLASSIFIED',
      assignment_source: null,
      classification_reason: classification.classification_reason,
      safeguard_status: 'ACCEPT',
      safeguard_reason: null,
      error_message: null,
    },
    proposal: acceptedProposal,
  };
}

export function prepareTechnicalFailure(event, metadata, error) {
  const retryCount = requireRetryCount(metadata?.corrective_retry_count ?? 0);
  const errorMessage = requireNonBlank(
    error instanceof Error ? error.message : error,
    'Technical error',
  );
  const safeguardStatus = metadata?.safeguard_status ?? 'NOT_RUN';
  if (!['FAILED', 'NOT_RUN'].includes(safeguardStatus)) {
    throw new Error('Technical failure safeguard status must be FAILED or NOT_RUN.');
  }
  const attemptTrace = Array.isArray(metadata?.attempt_trace)
    ? structuredClone(metadata.attempt_trace)
    : [];

  return {
    action: 'FINALIZE',
    record: {
      ...baseRecord(event, metadata, retryCount, attemptTrace),
      event_type_id: null,
      event_type_name: null,
      classification_status: 'FAILED',
      assignment_source: null,
      classification_reason: null,
      safeguard_status: safeguardStatus,
      safeguard_reason: null,
      error_message: errorMessage,
    },
    proposal: null,
  };
}
