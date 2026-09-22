const source = $('Prepare Phase 2 Source').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');
const base = {
  phase1_source_id: source.id,
  p2_source_title: source.title,
  p2_source_lead: String(source.cleaned_content_text ?? '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join('\n\n')
    .slice(0, 5000),
  p2_submission_key: source.p2_submission_key,
  p2_model_name: source.p2_model_name,
  p2_detection_prompt_version: source.p2_detection_prompt_version,
  p2_safeguard_prompt_version: source.p2_safeguard_prompt_version,
  p2_detection_raw_output: raw,
  p2_safeguard_raw_output: null,
  p2_repair_attempts: 0,
  p2_repair_reason: null,
};

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

function needsReview(message, quoteStatus, candidate = {}, repairable = false) {
  const paragraphs = String(source.cleaned_content_text ?? '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return {json: {
    ...base,
    p2_status: 'NEEDS_REVIEW',
    p2_issue_title: String(candidate.title ?? source.title ?? 'Main Issue requires review').trim(),
    p2_issue_description: String(candidate.description ?? 'Automatic Main Issue extraction requires review; use the article headline and quoted article text.').trim(),
    p2_evidence_quote: String(candidate.quote ?? paragraphs[0] ?? source.title ?? 'Article text requires review.').trim(),
    p2_quote_validation_status: quoteStatus,
    p2_safeguard_status: 'NOT_RUN',
    p2_error_message: message,
    p2_repair_reason: repairable ? message : null,
    p2_needs_safeguard: false,
  }};
}

function parseDetectorResponse(value) {
  const text = String(value ?? '').trim();
  if (!text) return {error: 'The detector response was empty.'};
  const fenced = text.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  const jsonText = fenced ? fenced[1].trim() : text;
  let parsed;
  try { parsed = JSON.parse(jsonText); } catch { return {error: 'The detector response was not valid JSON.'}; }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {error: 'The detector response did not have the required JSON shape.'};
  const topKeys = Object.keys(parsed).sort();
  if (parsed.decision === 'NO_MAIN_ISSUE' && typeof parsed.reason === 'string' && parsed.reason.trim()) {
    return {withheldReason: 'No clear Main Issue was found: ' + parsed.reason.trim().slice(0, 3500)};
  }
  let candidate = null;
  if (parsed.decision === 'MAIN_ISSUE_FOUND') {
    candidate = parsed;
  } else if (topKeys.length === 1 && parsed.MAIN_ISSUE_FOUND && typeof parsed.MAIN_ISSUE_FOUND === 'object' && !Array.isArray(parsed.MAIN_ISSUE_FOUND)) {
    candidate = parsed.MAIN_ISSUE_FOUND;
  } else if (topKeys.length === 1 && parsed.NO_MAIN_ISSUE && typeof parsed.NO_MAIN_ISSUE === 'object' && typeof parsed.NO_MAIN_ISSUE.reason === 'string' && parsed.NO_MAIN_ISSUE.reason.trim()) {
    return {withheldReason: 'No clear Main Issue was found: ' + parsed.NO_MAIN_ISSUE.reason.trim().slice(0, 3500)};
  }
  if (!candidate) return {error: 'The detector response used an unsupported JSON shape.'};
  const title = String(candidate.issue_title ?? candidate.title ?? '').trim();
  const description = String(candidate.issue_description ?? candidate.description ?? '').trim();
  const quote = String(candidate.evidence_quote ?? '').trim();
  if (!title || !description || !quote) return {error: 'The proposed Main Issue was missing a required non-empty field.'};
  return {title, description, quote};
}

const result = parseDetectorResponse(raw);
if (result.withheldReason) return [needsReview(result.withheldReason, 'NOT_RUN')];
if (result.error) return [needsReview(result.error, 'REJECTED')];
const exactQuote = findExactSourceQuote(source.cleaned_content_text, result.quote);
if (!exactQuote) {
  return [needsReview('The proposed evidence quote was not one exact contiguous excerpt from the cleaned article.', 'REJECTED', result, true)];
}

return [{json: {
  ...base,
  p2_status: null,
  p2_issue_title: result.title,
  p2_issue_description: result.description,
  p2_evidence_quote: exactQuote,
  p2_quote_validation_status: 'VERIFIED',
  p2_safeguard_status: 'NOT_RUN',
  p2_error_message: null,
  p2_needs_safeguard: true,
}}];
