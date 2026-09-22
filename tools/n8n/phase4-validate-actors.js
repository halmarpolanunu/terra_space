const source = $('Build Actor Prompt').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');
const reasons = [];

function canonical(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/gu, '')
    .replace(/\*+/g, '')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function unwrap(value) {
  const text = String(value ?? '').trim();
  if ((text.startsWith('```') || text.startsWith('~~~'))
      && (text.endsWith('```') || text.endsWith('~~~'))) {
    const firstLine = text.indexOf('\n');
    const closing = Math.max(text.lastIndexOf('```'), text.lastIndexOf('~~~'));
    return text.slice(firstLine + 1, closing).trim();
  }
  return text;
}

function isExactArticleQuote(quote) {
  const text = String(quote ?? '').trim();
  return Boolean(text
    && !/\.\.\.|…/u.test(text)
    && String(source.cleaned_content_text ?? '').includes(text));
}

function restoreExactArticleQuote(quote) {
  const matchForm = (value) => String(value ?? '')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/gu, '')
    .replace(/\*+/g, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');
  const requested = matchForm(quote);
  const article = String(source.cleaned_content_text ?? '');
  if (!requested || /\.\.\.|…/u.test(String(quote ?? ''))) return null;
  if (article.includes(String(quote ?? '').trim())) return String(quote).trim();
  const mapped = [];
  let normalized = '';
  let pendingSpace = false;
  for (let index = 0; index < article.length; index += 1) {
    const original = article[index];
    if (/[*\u200B-\u200F\u2060\uFEFF]/u.test(original)) continue;
    const converted = original.toLocaleLowerCase('en');
    if (/\s/u.test(converted)) {
      if (normalized && !pendingSpace) {
        normalized += ' ';
        mapped.push(index);
        pendingSpace = true;
      }
      continue;
    }
    pendingSpace = false;
    normalized += converted;
    mapped.push(index);
  }
  const start = normalized.indexOf(requested);
  if (start < 0) return null;
  return article.slice(mapped[start], mapped[start + requested.length - 1] + 1).trim();
}

function correctedRole(role, name, evidenceQuote) {
  if (role !== 'source') return role;
  const actor = canonical(name).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const reportingSubject = new RegExp(`\\b${actor}\\b(?:\\s*,?\\s*(?:has|have|had|also|who|which)){0,3}\\s+(?:said|says|stated|reported|claimed|confirmed|denied|told)\\b`, 'u');
  return reportingSubject.test(canonical(evidenceQuote)) ? role : 'participant';
}

function isInsideCandidateBoundary(evidenceQuote) {
  const candidate = canonical(source.candidate_evidence_quote);
  const evidence = canonical(evidenceQuote);
  return Boolean(candidate && evidence && (candidate.includes(evidence) || evidence.includes(candidate)));
}

function isBareNationalityAdjective(name) {
  return new Set([
    'american', 'british', 'chinese', 'french', 'german', 'indian', 'iranian',
    'iraqi', 'israeli', 'japanese', 'korean', 'pakistani', 'palestinian',
    'polish', 'russian', 'saudi', 'syrian', 'turkish', 'ukrainian',
  ]).has(canonical(name));
}

function isUnresolvedReference(name) {
  return /^(?:the|this|that|an?)\s+(?:official|minister|spokesperson|source|representative|person|leader)$/u.test(canonical(name));
}

function appearsOnlyInNeighboringTemporalClause(name, evidenceQuote) {
  const evidence = canonical(evidenceQuote);
  const actor = canonical(name).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\b(?:(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+days?|a\\s+day|hours?|weeks?)\\s+(?:before|after)\\b[^.]*\\b${actor}\\b`, 'u')
    .test(evidence);
}

let parsed;
try { parsed = JSON.parse(unwrap(raw)); } catch { parsed = null; }

const actors = [];
if (!parsed || !Array.isArray(parsed.actors)) {
  reasons.push(raw
    ? 'The actor response was not valid JSON with an actors array.'
    : 'The actor request failed or returned no response.');
} else {
  for (const value of parsed.actors) {
    const name = String(value?.name ?? '').trim();
    const role = value?.role;
    const proposedEvidenceQuote = String(value?.evidence_quote ?? '').trim();
    const evidenceQuote = restoreExactArticleQuote(proposedEvidenceQuote);
    if (!name || !['source', 'recipient', 'participant'].includes(role)
        || !evidenceQuote || !isExactArticleQuote(evidenceQuote)) {
      reasons.push('A proposed actor was incomplete, truncated, or unsupported and was omitted.');
      continue;
    }
    if (!isInsideCandidateBoundary(evidenceQuote)) {
      reasons.push('A proposed actor used evidence outside the candidate event boundary and was omitted.');
      continue;
    }
    if (!canonical(evidenceQuote).includes(canonical(name))) {
      reasons.push('A proposed actor name was not explicit in its own evidence and was omitted.');
      continue;
    }
    if (isBareNationalityAdjective(name)) {
      reasons.push('A proposed actor was only a nationality adjective, not an explicit actor entity, and was omitted.');
      continue;
    }
    if (isUnresolvedReference(name)) {
      reasons.push('A proposed actor was an unresolved reference rather than an explicit actor entity and was omitted.');
      continue;
    }
    if (appearsOnlyInNeighboringTemporalClause(name, evidenceQuote)) {
      reasons.push('A proposed actor belonged to a neighboring event clause rather than the candidate event and was omitted.');
      continue;
    }
    const actor = {name, role: correctedRole(role, name, evidenceQuote), evidence_quote: evidenceQuote};
    if (!actors.some((existing) => JSON.stringify(existing) === JSON.stringify(actor))) {
      actors.push(actor);
    }
  }
}

return [{json: {
  ...source,
  p4_actor_candidates: actors,
  p4_actor_raw_output: raw || null,
  p4_review_reasons: reasons,
  p4_needs_safeguard: true,
}}];
