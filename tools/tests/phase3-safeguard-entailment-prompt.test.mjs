import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('safeguard accepts meaning-preserving grammatical paraphrases', () => {
  const path = new URL('../n8n/phase3-build-safeguard-prompt.js', import.meta.url);
  assert.equal(fs.existsSync(path), true, 'the production Phase 3 safeguard prompt builder must exist');

  const code = fs.readFileSync(path, 'utf8');
  const input = {
    p3_candidates: [{
      candidate_id: 'c1',
      title: 'European Defence conference',
      description: 'The EEAS will organize a conference where the initiative will be formally launched.',
      evidence_quote: 'The initiative will be formally launched at a conference organised by the EEAS.',
      quote_validation_status: 'VERIFIED',
    }],
  };
  const prompt = new Function('$json', code)(input)[0].json.p3_safeguard_prompt;

  assert.match(prompt, /accept meaning-preserving grammatical paraphrases/i);
  assert.match(prompt, /active and passive voice/i);
  assert.match(prompt, /must identify a concrete fact that is absent or contradicted/i);
});

test('safeguard accepts neutral reporting verbs when the attributed quote affirms the claim', () => {
  const path = new URL('../n8n/phase3-build-safeguard-prompt.js', import.meta.url);
  const code = fs.readFileSync(path, 'utf8');
  const input = {
    p3_candidates: [{
      candidate_id: 'c1',
      title: 'Position under review',
      description: 'Trump confirmed that he reviews every position, including the Falklands position.',
      evidence_quote: '“I always review every position. That is one of many,” Trump told reporters when asked about the Falklands position.',
      quote_validation_status: 'VERIFIED',
    }],
  };
  const prompt = new Function('$json', code)(input)[0].json.p3_safeguard_prompt;

  assert.match(prompt, /said, stated, confirmed, or explained/i);
  assert.match(prompt, /directly affirms the described claim/i);
});

test('safeguard verifies alleged missing details against the literal quote', () => {
  const code = fs.readFileSync(new URL('../n8n/phase3-build-safeguard-prompt.js', import.meta.url), 'utf8');
  const prompt = new Function('$json', code)({
    p3_candidates: [{
      candidate_id: 'c1', title: 'Legislators approve measure 468-88',
      description: 'Legislators voted 468-88 for the measure.',
      evidence_quote: 'Legislators voted 468-88 in favor of the measure.',
      quote_validation_status: 'VERIFIED',
    }],
  })[0].json.p3_safeguard_prompt;

  assert.match(prompt, /re-read the literal quote/i);
  assert.match(prompt, /numbers, names, and verbs/i);
  assert.match(prompt, /do not invent a missing context requirement/i);
});
