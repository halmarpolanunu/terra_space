import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('centrality safeguard receives the headline and opening article context', () => {
  const code = fs.readFileSync(new URL('../n8n/phase2-build-safeguard-prompt.js', import.meta.url), 'utf8');
  const input = {
    p2_source_title: 'Iran economy could collapse within months, Bessent warns',
    p2_source_lead: 'Bessent says sanctions are serious.\n\nHe believes the economy could collapse within weeks or months.',
    p2_issue_title: 'Iran response to sanctions',
    p2_issue_description: 'Iran is taking sanctions seriously.',
    p2_evidence_quote: 'Bessent says sanctions are serious.',
  };

  const result = new Function('$json', code)(input)[0].json.p2_safeguard_prompt;
  assert.match(result, /Article headline \(centrality context only\):\nIran economy could collapse within months, Bessent warns/);
  assert.match(result, /Opening article context \(centrality context only\):\nBessent says sanctions are serious\./);
  assert.match(result, /secondary detail rather than the central/i);
  assert.match(result, /causal claim/i);
  assert.match(result, /because|due to|as a result of/i);
  assert.match(result, /headline and opening context.*centrality only/i);
  assert.match(result, /every named person.*literally appear.*evidence quote/i);
  assert.match(result, /support evidence \(the only allowed grounding source\)/i);
});
