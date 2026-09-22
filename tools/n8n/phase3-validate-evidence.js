const source = $('Prepare Phase 3 Source').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');

const base = {
  phase1_source_id: source.phase1_source_id,
  phase2_main_issue_id: source.phase2_main_issue_id,
  phase2_status: source.phase2_status,
  existing_phase3_result_id: source.existing_phase3_result_id ?? null,
  p3_submission_key: source.p3_submission_key,
  p3_model_name: source.p3_model_name,
  p3_detection_prompt_version: source.p3_detection_prompt_version,
  p3_safeguard_prompt_version: source.p3_safeguard_prompt_version,
  p3_detection_raw_output: raw || null,
  p3_safeguard_raw_output: null,
};

function canonicalCharacter(character) {
  if (/[\u200B-\u200F\u2060\uFEFF]/u.test(character)) return '';
  if (character === '*') return '';
  if (/\s/u.test(character)) return ' ';
  if (/[“”]/u.test(character)) return '"';
  if (/[‘’]/u.test(character)) return "'";
  if (/[–—]/u.test(character)) return '-';
  return character.toLocaleLowerCase('en');
}

function canonicalizeWithMap(value) {
  const text = String(value ?? '');
  let canonical = '';
  const sourceIndexes = [];
  for (let index = 0; index < text.length; index += 1) {
    const normalized = canonicalCharacter(text[index]);
    if (!normalized) continue;
    if (normalized === ' ') {
      let next = '';
      for (let lookahead = index + 1; lookahead < text.length; lookahead += 1) {
        next = canonicalCharacter(text[lookahead]);
        if (next && next !== ' ') break;
      }
      if (canonical === '' || canonical.endsWith(' ') || /["']$/u.test(canonical) || /["']/u.test(next)) continue;
    }
    canonical += normalized;
    sourceIndexes.push(index);
  }
  if (canonical.endsWith(' ')) {
    canonical = canonical.slice(0, -1);
    sourceIndexes.pop();
  }
  return {canonical, sourceIndexes};
}

function findExactSourceQuote(articleText, proposedQuote) {
  const article = String(articleText ?? '');
  const proposed = String(proposedQuote ?? '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .trim();
  if (!article || !proposed) return null;
  const exactStart = article.indexOf(proposed);
  if (exactStart >= 0) return article.slice(exactStart, exactStart + proposed.length);
  const sourceText = canonicalizeWithMap(article);
  const candidate = canonicalizeWithMap(proposed).canonical;
  if (!candidate) return null;
  const normalizedStart = sourceText.canonical.indexOf(candidate);
  if (normalizedStart < 0) return null;
  const originalStart = sourceText.sourceIndexes[normalizedStart];
  const originalEnd = sourceText.sourceIndexes[normalizedStart + candidate.length - 1] + 1;
  return article.slice(originalStart, originalEnd);
}

function result(values) {
  return [{json: {...base, ...values}}];
}

const text = raw.trim();
if (!text) {
  return result({
    p3_status: 'FAILED', p3_candidates: [], p3_candidate_count: 0,
    p3_detection_status: 'FAILED', p3_safeguard_status: 'NOT_RUN',
    p3_error_message: 'The Event Candidate detector response was empty.',
    p3_needs_safeguard: false,
  });
}

const fenced = text.match(/^(?:\`\`\`|~~~)(?:json)?\s*([\s\S]*?)\s*(?:\`\`\`|~~~)$/i);
let parsed;
const jsonText = fenced ? fenced[1].trim() : text;
try { parsed = JSON.parse(jsonText); }
catch {
  // Gemma occasionally emits the invalid escape \\u201n when it intends the
  // opening curly double quote \\u201c. Repair only that observed typo.
  const repairedUnicode = jsonText.replace(/\\u201n/g, '\\u201c');
  if (repairedUnicode !== jsonText) {
    try { parsed = JSON.parse(repairedUnicode); } catch { parsed = undefined; }
  }

  // LM Studio can occasionally add one stray quote between a completed
  // evidence_quote value and its closing object brace: ...\",\"}.
  // Repair only that tightly-scoped shape; all other malformed JSON fails.
  const repaired = repairedUnicode.replace(
    /(\"evidence_quote\"\s*:\s*\"(?:[^\"\\\\]|\\\\.)*\")\s*,\s*\"\s*}/g,
    '$1}',
  );
  if (!parsed && repaired !== repairedUnicode) {
    try { parsed = JSON.parse(repaired); } catch { parsed = undefined; }
  }

  // A quoted source sentence can also contain a raw double quote that the
  // model forgot to JSON-escape. Evidence is the final field in the strict
  // candidate shape, so escape only raw quotes before that field's closing
  // quote-and-brace boundary.
  if (!parsed) {
    const repairedEvidenceQuotes = repairedUnicode.replace(
      /("evidence_quote"\s*:\s*")([\s\S]*?)("}\s*(?=,|\]))/g,
      (_match, prefix, value, suffix) => prefix
        + value.replace(/(?<!\\)"/g, '\\"')
        + suffix,
    );
    if (repairedEvidenceQuotes !== repairedUnicode) {
      try { parsed = JSON.parse(repairedEvidenceQuotes); } catch { parsed = undefined; }
    }
  }
}
if (!parsed) {
  return result({
    p3_status: 'FAILED', p3_candidates: [], p3_candidate_count: 0,
    p3_detection_status: 'FAILED', p3_safeguard_status: 'NOT_RUN',
    p3_error_message: 'The Event Candidate detector response was not valid JSON.',
    p3_needs_safeguard: false,
  });
}

if (parsed?.decision === 'NO_EVENT_CANDIDATE'
    && Array.isArray(parsed.candidates) && parsed.candidates.length === 0
    && Object.keys(parsed).sort().join(',') === 'candidates,decision') {
  return result({
    p3_status: 'VALID', p3_candidates: [], p3_candidate_count: 0,
    p3_detection_status: 'NO_EVENT_CANDIDATE', p3_safeguard_status: 'NOT_RUN',
    p3_error_message: null, p3_needs_safeguard: false,
  });
}

if (parsed?.decision !== 'EVENT_CANDIDATES_FOUND' || !Array.isArray(parsed.candidates)) {
  return result({
    p3_status: 'FAILED', p3_candidates: [], p3_candidate_count: 0,
    p3_detection_status: 'FAILED', p3_safeguard_status: 'NOT_RUN',
    p3_error_message: 'The detector response used an unsupported Event Candidate JSON shape.',
    p3_needs_safeguard: false,
  });
}

const complete = [];
for (const [index, candidate] of parsed.candidates.entries()) {
  const title = String(candidate?.title ?? '').trim();
  const description = String(candidate?.description ?? '').trim();
  const proposedQuote = String(candidate?.evidence_quote ?? '').trim();
  if (!title || !description || !proposedQuote) continue;
  const exactQuote = findExactSourceQuote(source.cleaned_content_text, proposedQuote);
  const verified = exactQuote !== null;
  complete.push({
    candidate_id: 'c' + (index + 1),
    title,
    description,
    evidence_quote: exactQuote ?? proposedQuote,
    quote_validation_status: verified ? 'VERIFIED' : 'REJECTED',
    safeguard_status: 'NOT_RUN',
    status: verified ? 'VALID' : 'NEEDS_REVIEW',
    review_reason: verified ? null : 'The evidence quote was not found as one contiguous excerpt in the cleaned article.',
  });
}

if (complete.length === 0) {
  return result({
    p3_status: 'FAILED', p3_candidates: [], p3_candidate_count: 0,
    p3_detection_status: 'FAILED', p3_safeguard_status: 'NOT_RUN',
    p3_error_message: 'The detector found no complete Event Candidate object.',
    p3_needs_safeguard: false,
  });
}

const verifiedCount = complete.filter((candidate) => candidate.quote_validation_status === 'VERIFIED').length;
return result({
  p3_status: verifiedCount === complete.length ? null : 'NEEDS_REVIEW',
  p3_candidates: complete,
  p3_candidate_count: complete.length,
  p3_detection_status: 'EVENT_CANDIDATES_FOUND',
  p3_safeguard_status: 'NOT_RUN',
  p3_error_message: complete.length === verifiedCount
    ? null
    : 'One or more candidate quotes were not found as contiguous excerpts in the cleaned article.',
  p3_needs_safeguard: verifiedCount > 0,
});
