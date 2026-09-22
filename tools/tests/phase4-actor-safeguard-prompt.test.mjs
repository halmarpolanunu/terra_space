import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('actor safeguard prompt states the exact decision count and complete index range', () => {
  const code = fs.readFileSync(new URL('../n8n/phase4-build-actor-safeguard-prompt.js', import.meta.url), 'utf8');
  const actors = Array.from({length: 9}, (_, index) => ({name: `Actor ${index}`}));
  const input = {
    candidate_title: 'Test event',
    candidate_evidence_quote: 'Test evidence.',
    cleaned_content_text: 'Test article.',
    p4_actor_candidates: actors,
  };
  const result = new Function('$json', code)(input)[0].json;

  assert.match(result.p4_actor_safeguard_prompt, /Return exactly 9 decisions/);
  assert.match(result.p4_actor_safeguard_prompt, /indexes 0 through 8/);
  assert.match(result.p4_actor_safeguard_prompt, /Do not omit the final index 8/);
});
