const candidates = $json.p3_candidates
  .filter((candidate) => candidate.quote_validation_status === 'VERIFIED')
  .map(({candidate_id, title, description, evidence_quote}) => ({
    candidate_id, title, description, evidence_quote,
  }));

const rules = [
  'You are an independent safeguard for Event Candidates.',
  'Use only each candidate title, description, and exact evidence quote.',
  'Do not use the article, world knowledge, or unstated facts.',
  'ACCEPT when the quote directly supports every factual detail in the title and description.',
  'Accept meaning-preserving grammatical paraphrases, including active and passive voice.',
  'Treat neutral reporting verbs such as said, stated, confirmed, or explained as equivalent when the attributed quote directly affirms the described claim.',
  'For example, "the initiative will launch at a conference organized by the EEAS" supports "the EEAS will organize a conference where the initiative launches".',
  'REJECT when the candidate adds, changes, overstates, or contradicts a factual detail.',
  'A REJECT reason must identify a concrete fact that is absent or contradicted; do not reject merely because equivalent wording or sentence structure differs.',
  'Before claiming a detail is absent, re-read the literal quote and explicitly check its numbers, names, and verbs.',
  'Do not invent a missing context requirement that the candidate itself does not claim.',
  'Return only {"reviews":[{"candidate_id":"c1","decision":"ACCEPT"}]}',
  'or {"reviews":[{"candidate_id":"c1","decision":"REJECT","reason":"brief reason"}]}.',
  'Return exactly one review for every supplied candidate_id.',
].join('\n');

return [{
  json: {
    ...$json,
    p3_safeguard_prompt: rules + '\n\nCandidates:\n' + JSON.stringify(candidates),
  },
}];
