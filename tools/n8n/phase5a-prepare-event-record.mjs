import {randomUUID} from 'node:crypto';

export function preparePhase5ARecord(input) {
  if (!['VALID', 'INCOMPLETE', 'NEEDS_REVIEW'].includes(input.phase4_status)) {
    throw new Error(
      `Phase 4 status is not eligible for Phase 5A: ${input.phase4_status}`,
    );
  }

  const limited = input.phase4_status !== 'VALID';
  if (limited && !String(input.phase4_review_reason ?? '').trim()) {
    throw new Error('A limited record must preserve its Phase 4 reason.');
  }

  return {
    phase4_event_fact_id: input.phase4_event_fact_id,
    phase3_event_candidate_result_id: input.phase3_event_candidate_result_id,
    phase1_source_id: input.phase1_source_id,
    candidate_id: input.candidate_id,
    source_publication_date: input.source_publication_date ?? null,
    phase3_result_status: input.phase3_result_status,
    phase3_result_reason: input.phase3_result_reason ?? null,
    phase3_candidate_status: input.phase3_candidate_status,
    phase3_candidate_reason: input.phase3_candidate_reason ?? null,
    candidate_title: input.candidate_title,
    candidate_description: input.candidate_description,
    candidate_evidence_quote: input.candidate_evidence_quote,
    phase4_status: input.phase4_status,
    phase4_extraction_status: input.phase4_extraction_status,
    phase4_safeguard_status: input.phase4_safeguard_status,
    phase4_review_reason: input.phase4_review_reason ?? null,
    phase4_error_message: input.phase4_error_message ?? null,
    facts: structuredClone(input.facts),
    event_path: limited ? 'LIMITED' : 'NORMAL',
    phase5a_status: 'PREPARED',
    error_message: null,
    submission_key: randomUUID(),
  };
}
