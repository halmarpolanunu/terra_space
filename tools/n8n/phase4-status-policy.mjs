export function classifyPhase4Result(input) {
  const reasons = [...new Set((input.reasons || []).filter(Boolean))];
  const requiresReview = input.phase3CandidateStatus === 'NEEDS_REVIEW'
    || reasons.some((reason) => /(?:request failed|response was not valid json|safeguard.*(?:failed|unusable)|missing safeguard|stable grounded date was retained for review)/iu.test(reason));
  const harmlessOmission = (reason) => /location was acting as an actor or metonym/iu.test(reason);
  const actorOmission = reasons.some((reason) => /proposed actor.*omitted/iu.test(reason));
  const onlyOmittedSources = (input.proposedActors || []).length > 0
    && input.proposedActors.every((actor) => actor?.role === 'source');
  const incomplete = reasons.some((reason) => !harmlessOmission(reason)
      && /(?:date evidence.*omitted|exact date came only from a vague|event date was invalid or unsupported|epistemic-status evidence.*omitted|epistemic-status quote was unsupported|(?:actor|location) safeguard rejected)/iu.test(reason))
    || (actorOmission && (input.finalActors || []).length === 0 && !onlyOmittedSources);
  const status = requiresReview ? 'NEEDS_REVIEW' : incomplete ? 'INCOMPLETE' : 'VALID';
  return {
    status,
    reason: status === 'VALID' ? null : reasons.join(' | ') || null,
  };
}
