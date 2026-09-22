export type PhaseNumber = 1 | 2 | 3;

export const pipelineStats = {
  cleanedArticles: 29,
  mainIssues: 29,
  phase3Results: 29,
  eventCandidates: 109,
  valid: 12,
  needsReview: 17,
} as const;

export const phases = [
  {
    number: 1 as const,
    eyebrow: 'PHASE 01',
    title: 'Clean articles',
    input: 'Raw article',
    process: 'Conservative cleaning',
    checks: ['Non-empty', 'Fidelity'],
    output: 'Cleaned article',
  },
  {
    number: 2 as const,
    eyebrow: 'PHASE 02',
    title: 'Detect main issue',
    input: 'Cleaned article',
    process: 'Main Issue detection',
    checks: ['Evidence quote', 'Safeguard'],
    output: 'Main Issue',
  },
  {
    number: 3 as const,
    eyebrow: 'PHASE 03',
    title: 'Detect event candidates',
    input: 'Complete Main Issue',
    process: 'Candidate detection',
    checks: ['Evidence quote', 'Safeguard'],
    output: 'Event Candidates',
  },
] as const;
