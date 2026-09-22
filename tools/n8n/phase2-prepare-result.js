function withSourceId(value) {
  const sourceId = value.p2_phase1_source_id ?? value.phase1_source_id ?? $('Prepare Phase 2 Source').item.json.id;
  return {...value, p2_phase1_source_id: sourceId};
}

const proposal = $json?.p2_submission_key
  ? $json
  : $('Build Main Issue Safeguard Prompt').item.json;
if (!proposal.p2_needs_safeguard) return [{json: withSourceId(proposal)}];

const raw = String($json?.choices?.[0]?.message?.content ?? '');
const text = raw.trim();
const fenced = text.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
const jsonText = fenced ? fenced[1].trim() : text;
let parsed;

if (!jsonText) {
  return [{json: withSourceId({...proposal, p2_status: 'NEEDS_REVIEW', p2_safeguard_status: 'FAILED', p2_safeguard_raw_output: raw, p2_error_message: 'The safeguard response was empty.', p2_repair_reason: null, p2_needs_safeguard: false})}];
}
try { parsed = JSON.parse(jsonText); } catch {
  return [{json: withSourceId({...proposal, p2_status: 'NEEDS_REVIEW', p2_safeguard_status: 'FAILED', p2_safeguard_raw_output: raw, p2_error_message: 'The safeguard response was not valid JSON.', p2_repair_reason: null, p2_needs_safeguard: false})}];
}

const keys = parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? Object.keys(parsed).sort() : [];
if (parsed?.decision === 'ACCEPT' && keys.length === 1 && keys[0] === 'decision') {
  const canonical = (value) => String(value ?? '')
    .replace(/[’']/gu, "'")
    .replace(/'s\b/giu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');
  const namedPhrases = [proposal.p2_issue_title, proposal.p2_issue_description]
    .flatMap((value) => String(value ?? '').match(/\p{Lu}[\p{L}'’.-]+(?:\s+(?:\p{Lu}[\p{L}'’.-]+|of|the|and)){1,3}/gu) || []);
  const evidence = canonical(proposal.p2_evidence_quote);
  const evidenceTokens = new Set(evidence.match(/[\p{L}\p{N}-]+/gu) || []);
  const connectors = new Set(['of', 'the', 'and']);
  const unsupportedName = namedPhrases.find((name) => {
    const tokens = (canonical(name).match(/[\p{L}\p{N}-]+/gu) || [])
      .filter((token) => !connectors.has(token));
    return tokens.length > 0 && !tokens.every((token) => evidenceTokens.has(token));
  });
  if (unsupportedName) {
    const reason = `The safeguard accepted a named detail that is absent from the evidence quote: ${unsupportedName}.`;
    return [{json: withSourceId({...proposal, p2_status: 'NEEDS_REVIEW', p2_safeguard_status: 'REJECT', p2_safeguard_raw_output: raw, p2_error_message: reason, p2_repair_reason: reason, p2_needs_safeguard: false})}];
  }
  return [{json: withSourceId({...proposal, p2_status: 'VALID', p2_safeguard_status: 'ACCEPT', p2_safeguard_raw_output: raw, p2_error_message: null, p2_repair_reason: null, p2_needs_safeguard: false})}];
}
if (parsed?.decision === 'REJECT' && keys.length === 2 && keys[0] === 'decision' && keys[1] === 'reason' && typeof parsed.reason === 'string' && parsed.reason.trim()) {
  const reason = 'The safeguard rejected the proposed Main Issue: ' + parsed.reason.trim().slice(0, 3500);
  return [{json: withSourceId({...proposal, p2_status: 'NEEDS_REVIEW', p2_safeguard_status: 'REJECT', p2_safeguard_raw_output: raw, p2_error_message: reason, p2_repair_reason: reason, p2_needs_safeguard: false})}];
}
return [{json: withSourceId({...proposal, p2_status: 'NEEDS_REVIEW', p2_safeguard_status: 'FAILED', p2_safeguard_raw_output: raw, p2_error_message: 'The safeguard response used an unexpected JSON shape.', p2_repair_reason: null, p2_needs_safeguard: false})}];
