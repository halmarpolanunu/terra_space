import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function runValidator({ article, candidates, raw }) {
  const code = fs.readFileSync(new URL('../n8n/phase3-validate-evidence.js', import.meta.url), 'utf8');
  const source = {
    phase1_source_id: 'source-1',
    phase2_main_issue_id: 'issue-1',
    phase2_status: 'VALID',
    p3_submission_key: 'submission-1',
    p3_model_name: 'test-model',
    p3_detection_prompt_version: 'test-detection',
    p3_safeguard_prompt_version: 'test-safeguard',
    cleaned_content_text: article,
  };
  const response = {
    choices: [{
      message: {
        content: raw ?? JSON.stringify({ decision: 'EVENT_CANDIDATES_FOUND', candidates }),
      },
    }],
  };
  const lookup = () => ({ item: { json: source } });
  return new Function('$', '$json', code)(lookup, response)[0].json;
}

test('restores verified Phase 3 evidence to the exact source slice', () => {
  const article = 'The minister called the plan “necessary”.\nIt passed on Monday.';
  const result = runValidator({
    article,
    candidates: [{
      title: 'Plan passed',
      description: 'The plan passed on Monday.',
      evidence_quote: 'The minister called the plan "necessary". It passed on Monday.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('repairs a stray quote after an evidence_quote field', () => {
  const raw = '{"decision":"EVENT_CANDIDATES_FOUND","candidates":[{"title":"Attack","description":"An attack occurred.","evidence_quote":"An attack occurred.","}]}';
  const result = runValidator({ article: 'An attack occurred.', raw });

  assert.equal(result.p3_detection_status, 'EVENT_CANDIDATES_FOUND');
  assert.equal(result.p3_candidates[0].evidence_quote, 'An attack occurred.');
  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
});

test('repairs an unescaped spoken quote inside an evidence_quote field', () => {
  const article = 'The German government therefore concludes that Russia is responsible for the hybrid attack in Leipzig on 4 August," he said.';
  const raw = '{"decision":"EVENT_CANDIDATES_FOUND","candidates":[{"title":"Germany attributes attack to Russia","description":"Germany attributed the attack to Russia.","evidence_quote":"The German government therefore concludes that Russia is responsible for the hybrid attack in Leipzig on 4 August," he said."}]}';
  const result = runValidator({ article, raw });

  assert.equal(result.p3_detection_status, 'EVENT_CANDIDATES_FOUND');
  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('restores evidence across Markdown emphasis markers', () => {
  const article = 'The military **carried out large strikes** in **Iran** overnight.';
  const result = runValidator({
    article,
    candidates: [{
      title: 'Military strikes Iran',
      description: 'The military carried out large strikes in Iran.',
      evidence_quote: 'The military carried out large strikes in Iran overnight.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('restores evidence when only the first letter capitalization differs', () => {
  const article = 'The latest developments were announced Tuesday.';
  const result = runValidator({
    article,
    candidates: [{
      title: 'Developments announced',
      description: 'The latest developments were announced Tuesday.',
      evidence_quote: 'the latest developments were announced Tuesday.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('restores evidence when source typography pads text inside quotation marks', () => {
  const article = 'The minister announced a plan to “ dismantle ” the program.';
  const result = runValidator({
    article,
    candidates: [{
      title: 'Plan announced',
      description: 'The minister announced a plan.',
      evidence_quote: 'The minister announced a plan to “dismantle ” the program.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('rejects Phase 3 evidence containing words absent from the source', () => {
  const result = runValidator({
    article: 'The plan passed on Monday.',
    candidates: [{
      title: 'Plan passed unanimously',
      description: 'The plan passed unanimously.',
      evidence_quote: 'The plan passed unanimously on Monday.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'REJECTED');
  assert.equal(result.p3_candidates[0].status, 'NEEDS_REVIEW');
});

test('restores evidence when the model returns literal escaped paragraph breaks', () => {
  const article = 'The group reported the strike.\n\nThe group reported 67 people were hurt.';
  const result = runValidator({
    article,
    candidates: [{
      title: 'Group reports casualties',
      description: 'The group reported the strike and 67 injuries.',
      evidence_quote: 'The group reported the strike.\\n\\nThe group reported 67 people were hurt.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
  assert.equal(result.p3_candidates[0].evidence_quote, article);
});

test('does not accept model ellipses as a substitute for omitted source text', () => {
  const result = runValidator({
    article: 'The first fact. A separate paragraph adds context. The final fact.',
    candidates: [{
      title: 'Two facts combined',
      description: 'The first and final facts occurred.',
      evidence_quote: 'The first fact. ... The final fact.',
    }],
  });

  assert.equal(result.p3_candidates[0].quote_validation_status, 'REJECTED');
});

test('repairs the model malformed opening-curly-quote Unicode escape', () => {
  const raw = String.raw`{"decision":"EVENT_CANDIDATES_FOUND","candidates":[{"title":"Refinery described","description":"The refinery is important.","evidence_quote":"The refinery is \u201nan important enterprise."}]}`;
  const result = runValidator({article: 'The refinery is “an important enterprise.”', raw});

  assert.equal(result.p3_detection_status, 'EVENT_CANDIDATES_FOUND');
  assert.equal(result.p3_candidates[0].quote_validation_status, 'VERIFIED');
});
