import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('date prompt prioritizes the candidate action over an older referenced agreement', () => {
  const code = fs.readFileSync(new URL('../n8n/phase4-build-date-prompt.js', import.meta.url), 'utf8');
  const input = {
    publication_date: '2026-09-01',
    candidate_title: 'Iran offers to return to ceasefire deal',
    candidate_description: 'The president said Iran is ready to return if the US does the same.',
    candidate_evidence_quote: 'The president said Tuesday Iran is ready to return to the deal reached in June.',
    cleaned_content_text: 'The president said Tuesday Iran is ready to return to the deal reached in June.',
  };
  const prompt = new Function('$json', code)(input)[0].json.p4_date_prompt;
  assert.match(prompt, /date of the candidate action/i);
  assert.match(prompt, /referenced agreement/i);
  assert.match(prompt, /candidate evidence boundary/i);
});
