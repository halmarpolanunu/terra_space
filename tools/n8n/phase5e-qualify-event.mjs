function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonblankString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function result(source, status, reasonCodes) {
  return {
    ...JSON.parse(JSON.stringify(source)),
    phase5e_status: status,
    qualification_reason_codes: reasonCodes,
  };
}

function activeAssignedType(classification) {
  if (!isPlainObject(classification)) return false;
  return nonblankString(classification.event_type_id) !== null
    && classification.event_type_is_active === true;
}

/**
 * Applies Phase 5E's deterministic Final rule without changing any source data.
 * The caller supplies the preserved Phase 5A record plus its Phase 3, 5B, and 5C
 * snapshots. A malformed or incomplete snapshot is visible but never Final.
 */
export function qualifyEvent(input) {
  const source = isPlainObject(input) ? input : {};
  const phase5a = source.phase5a;
  if (!isPlainObject(phase5a) || phase5a.phase5a_status !== 'PREPARED') {
    return result(source, 'NOT_FINAL', ['PHASE5A_NOT_PREPARED']);
  }

  const candidateId = nonblankString(phase5a.candidate_id);
  if (!candidateId) {
    return result(source, 'NOT_FINAL', ['CANDIDATE_ID_MISSING']);
  }

  if (nonblankString(phase5a.phase3_event_candidate_result_id) === null
    || nonblankString(source.phase3?.id) === null
    || source.phase3.id !== phase5a.phase3_event_candidate_result_id) {
    return result(source, 'NOT_FINAL', ['PHASE3_RESULT_ID_MISMATCH']);
  }

  const candidates = source.phase3?.candidates;
  if (!Array.isArray(candidates)) {
    return result(source, 'NOT_FINAL', ['PHASE3_CANDIDATES_MISSING']);
  }
  const matches = candidates.filter((candidate) => isPlainObject(candidate)
    && candidate.candidate_id === candidateId);
  if (matches.length !== 1) {
    return result(source, 'NOT_FINAL', [matches.length === 0 ? 'CANDIDATE_ID_NOT_FOUND' : 'CANDIDATE_ID_NOT_UNIQUE']);
  }

  const candidate = matches[0];
  if (candidate.status !== 'VALID') {
    return result(source, 'NOT_FINAL', ['CANDIDATE_STATUS_NOT_VALID']);
  }
  if (candidate.quote_validation_status !== 'VERIFIED') {
    return result(source, 'NOT_FINAL', ['CANDIDATE_QUOTE_NOT_VERIFIED']);
  }
  if (candidate.safeguard_status !== 'ACCEPT') {
    return result(source, 'NOT_FINAL', ['CANDIDATE_SAFEGUARD_NOT_ACCEPTED']);
  }

  const phase5b = source.phase5b;
  if (!isPlainObject(phase5b)) {
    return result(source, 'NOT_FINAL', ['PHASE5B_RESULT_MISSING']);
  }
  if (phase5b.classification_status === 'FAILED') {
    return result(source, 'NOT_FINAL', ['PHASE5B_TECHNICAL_FAILURE']);
  }
  if (!['CLASSIFIED', 'UNCLASSIFIED'].includes(phase5b.classification_status)) {
    return result(source, 'NOT_FINAL', ['PHASE5B_STATUS_NOT_QUALIFYING']);
  }
  if (phase5b.safeguard_status !== 'ACCEPT') {
    return result(source, 'NOT_FINAL', ['PHASE5B_SAFEGUARD_NOT_ACCEPTED']);
  }
  if (phase5b.classification_status === 'CLASSIFIED') {
    if (nonblankString(phase5b.event_type_id) === null) {
      return result(source, 'NOT_FINAL', ['CLASSIFIED_TYPE_ID_MISSING']);
    }
    if (!activeAssignedType(phase5b)) {
      return result(source, 'NOT_FINAL', ['CLASSIFIED_TYPE_NOT_ACTIVE']);
    }
  }

  const phase5c = source.phase5c;
  if (!isPlainObject(phase5c) || phase5c.phase5c_status !== 'PREPARED') {
    return result(source, 'NOT_FINAL', ['PHASE5C_NOT_PREPARED']);
  }

  return result(source, 'FINAL', ['FINAL_CANDIDATE_GROUNDED']);
}
