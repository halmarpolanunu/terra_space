import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('requires every Phase 3 candidate to be relevant to the supplied Main Issue', () => {
  const path = new URL('../n8n/phase3-build-detection-prompt.js', import.meta.url);
  assert.equal(fs.existsSync(path), true, 'the production Phase 3 prompt builder must exist');

  const code = fs.readFileSync(path, 'utf8');
  const input = {
    phase2_status: 'VALID',
    issue_title: 'Bessent warns Iran economy could collapse within months',
    issue_description: 'Bessent warned that Iran’s economy could collapse.',
    issue_evidence_quote: 'Bessent said the economy could collapse.',
    cleaned_content_text: 'Bessent discussed Iran. An unrelated official discussed interest rates.',
  };
  const prompt = new Function('$json', code)(input)[0].json.p3_detection_prompt;

  assert.match(prompt, /every candidate must be directly relevant to the supplied Phase 2 Main Issue/i);
  assert.match(prompt, /exclude unrelated events/i);
});

test('requires complete evidence and does not split one occurrence into duplicates', () => {
  const path = new URL('../n8n/phase3-build-detection-prompt.js', import.meta.url);
  const code = fs.readFileSync(path, 'utf8');
  const input = {
    phase2_status: 'VALID',
    issue_title: 'Policy announcement',
    issue_description: 'A policy was announced.',
    issue_evidence_quote: 'A policy was announced.',
    cleaned_content_text: 'The minister announced a policy. The policy starts Monday.',
  };
  const prompt = new Function('$json', code)(input)[0].json.p3_detection_prompt;

  assert.match(prompt, /every factual detail.*directly supported.*evidence_quote/is);
  assert.match(prompt, /include enough adjacent sentences.*speaker attribution/is);
  assert.match(prompt, /do not split one occurrence.*multiple candidates/is);
});

test('forbids shortened or stitched evidence excerpts', () => {
  const code = fs.readFileSync(new URL('../n8n/phase3-build-detection-prompt.js', import.meta.url), 'utf8');
  const prompt = new Function('$json', code)({
    phase2_status: 'VALID', issue_title: 'Issue', issue_description: 'Description',
    issue_evidence_quote: 'Evidence', cleaned_content_text: 'Article',
  })[0].json.p3_detection_prompt;

  assert.match(prompt, /never insert an ellipsis/i);
  assert.match(prompt, /never stitch together separated passages/i);
  assert.match(prompt, /one source paragraph only/i);
});
