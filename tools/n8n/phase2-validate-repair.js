const source = $('Prepare Phase 2 Source').item.json;
const previous = $('Build Main Issue Repair Prompt').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');
const attempts = Number(previous.p2_repair_attempts ?? 0) + 1;
const combinedRaw = String(previous.p2_detection_raw_output ?? '')
  + '\n\n--- MAIN ISSUE REPAIR ' + attempts + ' ---\n' + raw;

function canonicalCharacter(character) {
  if (/[\u200B-\u200F\u2060\uFEFF]/u.test(character)) return '';
  if (/\s/u.test(character)) return ' ';
  if (/[“”]/u.test(character)) return '"';
  if (/[‘’]/u.test(character)) return "'";
  if (/[–—]/u.test(character)) return '-';
  return character;
}

function canonicalizeWithMap(value) {
  const text = String(value ?? '');
  let canonical = '';
  const sourceIndexes = [];
  for (let index = 0; index < text.length; index += 1) {
    const normalized = canonicalCharacter(text[index]);
    if (!normalized) continue;
    if (normalized === ' ' && (canonical === '' || canonical.endsWith(' '))) continue;
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
  const proposed = String(proposedQuote ?? '').trim();
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

function failed(message, candidate = {}) {
  return [{json: {
    ...previous,
    p2_status: 'NEEDS_REVIEW',
    p2_issue_title: String(candidate.title ?? previous.p2_issue_title ?? source.title).trim(),
    p2_issue_description: String(candidate.description ?? previous.p2_issue_description ?? 'Main Issue repair requires review.').trim(),
    p2_evidence_quote: String(candidate.quote ?? previous.p2_evidence_quote ?? source.title).trim(),
    p2_quote_validation_status: 'REJECTED',
    p2_safeguard_status: 'NOT_RUN',
    p2_detection_raw_output: combinedRaw,
    p2_error_message: message,
    p2_repair_attempts: attempts,
    p2_repair_reason: message,
    p2_needs_safeguard: false,
  }}];
}

const text = raw.trim();
const fenced = text.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
let parsed;
try { parsed = JSON.parse(fenced ? fenced[1].trim() : text); } catch { return failed('The repair response was not valid JSON.'); }
const candidate = parsed?.decision === 'MAIN_ISSUE_FOUND' ? parsed : parsed?.MAIN_ISSUE_FOUND;
if (!candidate || Array.isArray(candidate) || typeof candidate !== 'object') return failed('The repair response used an unsupported JSON shape.');
const repaired = {
  title: String(candidate.issue_title ?? candidate.title ?? '').trim(),
  description: String(candidate.issue_description ?? candidate.description ?? '').trim(),
  quote: String(candidate.evidence_quote ?? '').trim(),
};
if (!repaired.title || !repaired.description || !repaired.quote) return failed('The repaired Main Issue was missing a required field.', repaired);
const exactQuote = findExactSourceQuote(source.cleaned_content_text, repaired.quote);
if (!exactQuote) return failed('The repaired quote was not one exact source sentence.', repaired);

return [{json: {
  ...previous,
  p2_status: null,
  p2_issue_title: repaired.title,
  p2_issue_description: repaired.description,
  p2_evidence_quote: exactQuote,
  p2_quote_validation_status: 'VERIFIED',
  p2_safeguard_status: 'NOT_RUN',
  p2_safeguard_raw_output: null,
  p2_detection_raw_output: combinedRaw,
  p2_error_message: null,
  p2_repair_attempts: attempts,
  p2_repair_reason: null,
  p2_needs_safeguard: true,
}}];
