const source = $('Prepare Phase 4 Candidate').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');

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

function isInsideCandidateBoundary(candidateQuote, evidenceQuote) {
  const candidate = canonical(candidateQuote);
  const evidence = canonical(evidenceQuote);
  return Boolean(candidate && evidence && (candidate.includes(evidence) || evidence.includes(candidate)));
}

function coversCompleteCandidateBoundary(candidateQuote, evidenceQuote) {
  const candidate = canonical(candidateQuote);
  const evidence = canonical(evidenceQuote);
  return Boolean(candidate && evidence && evidence.includes(candidate));
}

function hasCandidateActionOverlap(evidenceQuote) {
  const stopwords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with']);
  const tokens = (value) => canonical(value).match(/[a-z0-9]+/gu) || [];
  const evidence = new Set(tokens(evidenceQuote));
  const identity = [...new Set([
    ...tokens(source.candidate_title),
    ...tokens(source.candidate_description),
  ].filter((token) => token.length > 2 && !stopwords.has(token)))];
  const overlap = identity.filter((token) => evidence.has(token)).length;
  return identity.length > 0 && overlap >= Math.min(2, identity.length);
}

function isExactArticleQuote(evidenceQuote) {
  const quote = String(evidenceQuote ?? '').trim();
  return Boolean(quote
    && !/\.\.\.|…/u.test(quote)
    && String(source.cleaned_content_text ?? '').includes(quote));
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

function resolveRelativeWeekday(evidenceQuote, publicationDate, proposedDate) {
  const match = String(evidenceQuote ?? '').match(/\b(last\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/iu);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(String(publicationDate ?? ''))) return null;
  const publication = new Date(String(publicationDate) + 'T00:00:00Z');
  if (Number.isNaN(publication.getTime())) return null;
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const target = weekdays.indexOf(match[2].toLocaleLowerCase('en'));
  if (!match[1] && /^\d{4}-\d{2}-\d{2}$/.test(String(proposedDate ?? ''))) {
    const proposed = new Date(String(proposedDate) + 'T00:00:00Z');
    const distanceDays = (proposed.getTime() - publication.getTime()) / 86400000;
    if (!Number.isNaN(proposed.getTime())
        && proposed.getUTCDay() === target
        && Math.abs(distanceDays) <= 6) {
      return proposed.toISOString().slice(0, 10);
    }
  }
  let daysBack = (publication.getUTCDay() - target + 7) % 7;
  if (match[1] && daysBack === 0) daysBack = 7;
  publication.setUTCDate(publication.getUTCDate() - daysBack);
  return publication.toISOString().slice(0, 10);
}

function normalizeGroundedMonthDay(value, precision, evidenceQuote, publicationDate) {
  if (precision !== 'exact' || /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return value;
  const year = String(publicationDate ?? '').match(/^(\d{4})-/u)?.[1];
  if (!year) return value;
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const proposed = canonical(value).match(/^([a-z]+)\s+(\d{1,2})$/u)
    || canonical(value).match(/^(\d{1,2})\s+([a-z]+)$/u);
  if (!proposed) return value;
  const monthName = /^\d/u.test(proposed[1]) ? proposed[2] : proposed[1];
  const dayText = /^\d/u.test(proposed[1]) ? proposed[1] : proposed[2];
  const month = months[monthName];
  const day = Number(dayText);
  const evidence = canonical(evidenceQuote);
  if (!month || day < 1 || day > 31
      || !evidence.includes(monthName)
      || !new RegExp(`\\b${day}\\b`, 'u').test(evidence)) return value;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeGroundedMonth(value, precision, evidenceQuote, publicationDate) {
  if (precision !== 'month' || /^\d{4}-\d{2}$/.test(String(value ?? ''))) return value;
  const year = String(publicationDate ?? '').match(/^(\d{4})-/u)?.[1];
  if (!year) return value;
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const monthName = canonical(value);
  const month = months[monthName];
  if (!month || !new RegExp(`\\b${monthName}\\b`, 'u').test(canonical(evidenceQuote))) return value;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function timeReferenceCount(evidenceQuote) {
  const text = canonical(evidenceQuote);
  const patterns = [
    /\b(?:last\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gu,
    /\b(?:last|this|next|earlier|later)\s+(?:week|month|year|summer|winter|spring|autumn|fall)\b/gu,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b/gu,
    /\b(?:in|during)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gu,
    /\b\d{4}-\d{2}-\d{2}\b/gu,
    /\b(?:in|during)\s+\d{4}\b/gu,
  ];
  return patterns.reduce((count, pattern) => count + [...text.matchAll(pattern)].length, 0);
}

function weekdayAnchorsCandidateStatement(evidenceQuote) {
  const identity = canonical(`${source.candidate_title ?? ''} ${source.candidate_description ?? ''}`);
  const evidence = canonical(evidenceQuote);
  const statementCandidate = /\b(?:offer|offers|offered|statement|remarks?|rebuke|rebukes|warn|warns|warned|urge|urges|urged|announce|announces|announced|say|says|said|state|states|stated)\b/u.test(identity);
  const weekdayStatement = /\b(?:said|stated|announced|reported|warned|urged)\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/u.test(evidence);
  return statementCandidate && weekdayStatement;
}

function candidateSupportsEpistemicStatus(status) {
  const candidate = String(source.candidate_evidence_quote ?? '').trim();
  if (!candidate || !isExactArticleQuote(candidate)) return null;
  const text = canonical(candidate);
  if (status === 'reported' && /\b(?:said|stated|reported|told|announced|according to)\b/u.test(text)) return candidate;
  return null;
}

function isVagueExactDate(evidenceQuote, precision) {
  if (precision !== 'exact') return false;
  const text = canonical(evidenceQuote);
  const vague = /\b(?:last|this|next|earlier|later)\s+(?:week|month|year|summer|winter|spring|autumn|fall)\b/u.test(text);
  const exactAnchor = /\b(?:last\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/u.test(text)
    || /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}\b/u.test(text)
    || /\b\d{4}-\d{2}-\d{2}\b/u.test(text);
  return vague && !exactAnchor;
}

let parsed = null;
try {
  parsed = JSON.parse(unwrap(raw).replace(
    /("epistemic_status"\s*:\s*)(confirmed|reported|alleged|planned|denied|unknown)(?=\s*[,}])/g,
    '$1"$2"',
  ));
} catch {
  parsed = null;
}

let policyReason = null;
let epistemicPolicyReason = null;
if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
  if (parsed.event_date_precision === 'day') parsed.event_date_precision = 'exact';
  const hasDate = typeof parsed.event_date === 'string' && parsed.event_date.trim();
  const dateQuote = typeof parsed.event_date_evidence_quote === 'string'
    ? parsed.event_date_evidence_quote.trim()
    : '';
  const restoredDateQuote = restoreExactArticleQuote(dateQuote);
  if (hasDate && restoredDateQuote) parsed.event_date_evidence_quote = restoredDateQuote;
  if (hasDate && !isInsideCandidateBoundary(source.candidate_evidence_quote, dateQuote)) {
    parsed.event_date = null;
    parsed.event_date_precision = 'unknown';
    parsed.event_date_evidence_quote = null;
    policyReason = 'The proposed date evidence was outside the candidate event boundary and was omitted.';
  } else if (hasDate
      && !coversCompleteCandidateBoundary(source.candidate_evidence_quote, dateQuote)
      && !hasCandidateActionOverlap(dateQuote)) {
    parsed.event_date = null;
    parsed.event_date_precision = 'unknown';
    parsed.event_date_evidence_quote = null;
    policyReason = 'The proposed date evidence did not cover the complete candidate boundary and was omitted.';
  } else if (hasDate && timeReferenceCount(dateQuote) > 1 && !weekdayAnchorsCandidateStatement(dateQuote)) {
    parsed.event_date = null;
    parsed.event_date_precision = 'unknown';
    parsed.event_date_evidence_quote = null;
    policyReason = 'The proposed date evidence contained multiple time references and could not safely identify the candidate event date.';
  } else if (hasDate && isVagueExactDate(dateQuote, parsed.event_date_precision)) {
    parsed.event_date = null;
    parsed.event_date_precision = 'unknown';
    parsed.event_date_evidence_quote = null;
    policyReason = 'The proposed exact date came only from a vague relative period and was omitted.';
  } else if (hasDate) {
    parsed.event_date = normalizeGroundedMonthDay(
      parsed.event_date,
      parsed.event_date_precision,
      dateQuote,
      source.publication_date,
    );
    parsed.event_date = normalizeGroundedMonth(
      parsed.event_date,
      parsed.event_date_precision,
      dateQuote,
      source.publication_date,
    );
    const resolved = resolveRelativeWeekday(dateQuote, source.publication_date, parsed.event_date);
    if (resolved) {
      parsed.event_date = resolved;
      parsed.event_date_precision = 'exact';
    }
  }

  const epistemicQuote = typeof parsed.epistemic_status_evidence_quote === 'string'
    ? parsed.epistemic_status_evidence_quote.trim()
    : '';
  const restoredEpistemicQuote = restoreExactArticleQuote(epistemicQuote);
  if (parsed.epistemic_status !== 'unknown' && restoredEpistemicQuote) {
    parsed.epistemic_status_evidence_quote = restoredEpistemicQuote;
  }
  if (parsed.epistemic_status !== 'unknown'
      && !isInsideCandidateBoundary(source.candidate_evidence_quote, epistemicQuote)) {
    const candidateQuote = candidateSupportsEpistemicStatus(parsed.epistemic_status);
    if (candidateQuote) {
      parsed.epistemic_status_evidence_quote = candidateQuote;
    } else {
      parsed.epistemic_status = 'unknown';
      parsed.epistemic_status_evidence_quote = null;
      epistemicPolicyReason = 'The proposed epistemic-status evidence was outside the candidate event boundary and was omitted.';
    }
  } else if (parsed.epistemic_status !== 'unknown' && !isExactArticleQuote(restoredEpistemicQuote)) {
    parsed.epistemic_status = 'unknown';
    parsed.epistemic_status_evidence_quote = null;
    epistemicPolicyReason = 'The proposed epistemic-status evidence was not exact source text and was omitted.';
  }
}

return [{json: {
  ...source,
  p4_date_raw_output: raw || null,
  p4_date_validated_output: parsed ? JSON.stringify(parsed) : raw || null,
  p4_date_policy_reason: policyReason,
  p4_epistemic_policy_reason: epistemicPolicyReason,
  p4_upstream_policy_reason: source.phase3_candidate_status === 'NEEDS_REVIEW'
    ? 'The Phase 3 candidate requires review, so the Phase 4 result cannot be marked valid automatically.'
    : null,
}}];
