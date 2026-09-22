const source = $('Build Location Prompt').item.json;
const raw = String($json?.choices?.[0]?.message?.content ?? '');
const reasons = [...(source.p4_review_reasons || [])];

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
  return Boolean(candidate && evidence && candidate.includes(evidence));
}

function isSupportedCountryName(name) {
  const normalized = canonical(name);
  const allowedStateNames = new Set([
    'united states',
    'state of palestine',
    'vatican city state',
    'federated states of micronesia',
  ]);
  return !/\bstate$/u.test(normalized) || allowedStateNames.has(normalized);
}

function isNameExplicit(name, evidenceQuote) {
  return canonical(evidenceQuote).includes(canonical(name));
}

function correctedLevel(name, level) {
  const normalized = canonical(name);
  if (new Set(['gaza', 'gaza strip', 'falklands', 'falkland islands']).has(normalized)) return 'unknown';
  if (/^(?:northern|southern|eastern|western|central)\s+\p{Lu}/u.test(String(name ?? '').trim())) return 'unknown';
  return level;
}

function isInstitutionLabel(name) {
  return /\b(?:white house|parliament|ministry|government office|headquarters|court|council)\b/u.test(canonical(name));
}

function isActorOrMetonym(name) {
  const normalized = canonical(name);
  return (source.p4_actors || []).some((actor) => canonical(actor?.name) === normalized);
}

function isActorAffiliation(name, evidenceQuote) {
  const evidence = canonical(evidenceQuote);
  const affiliation = /\b(?:officials?|delegates?|representatives?)\s+from\s+([^.;]+?)(?=\s+(?:on|who|held|met|during)\b|,\s+and\b|[.;]|$)/gu;
  return [...evidence.matchAll(affiliation)]
    .some((match) => canonical(match[1]).includes(canonical(name)));
}

function isNeighboringVisitLocation(name, evidenceQuote) {
  const evidence = canonical(evidenceQuote);
  const location = canonical(name).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\band that\\b[^.]*\\bvisit(?:s|ed|ing)?\\b[^.]*\\b${location}\\b`, 'u').test(evidence);
}

function isExactArticleQuote(quote) {
  const text = String(quote ?? '').trim();
  return Boolean(text
    && !/\.\.\.|…/u.test(text)
    && String(source.cleaned_content_text ?? '').includes(text));
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

let parsed;
try { parsed = JSON.parse(unwrap(raw)); } catch { parsed = null; }

const locations = [];
if (!parsed || !Array.isArray(parsed.locations)) {
  reasons.push(raw
    ? 'The location response was not valid JSON with a locations array.'
    : 'The location request failed or returned no response.');
} else {
  for (const value of parsed.locations) {
    const name = String(value?.name ?? '').trim();
    const level = value?.level;
    const evidenceQuote = String(value?.evidence_quote ?? '').trim();
    if (!name || !['country', 'admin1', 'city_regency', 'unknown'].includes(level)
        || !isExactArticleQuote(evidenceQuote)) {
      reasons.push('A proposed location was incomplete, truncated, or unsupported and was omitted.');
      continue;
    }
    if (!isInsideCandidateBoundary(source.candidate_evidence_quote, evidenceQuote)) {
      reasons.push('A proposed location used evidence outside the candidate event boundary and was omitted.');
      continue;
    }
    if (!isNameExplicit(name, evidenceQuote)) {
      reasons.push('A proposed location name was not explicit in its own evidence and was omitted.');
      continue;
    }
    if (isInstitutionLabel(name)) {
      reasons.push('A proposed location was an institution rather than a supported geographic place and was omitted.');
      continue;
    }
    if (isActorOrMetonym(name)) {
      reasons.push('A proposed location was acting as an actor or metonym rather than identifying where the event occurred and was omitted.');
      continue;
    }
    if (isActorAffiliation(name, evidenceQuote)) {
      reasons.push('A proposed location described an actor affiliation rather than where the event occurred and was omitted.');
      continue;
    }
    if (isNeighboringVisitLocation(name, evidenceQuote)) {
      reasons.push('A proposed location belonged to a neighboring event clause rather than the candidate event and was omitted.');
      continue;
    }
    if (level === 'country' && !isSupportedCountryName(name)) {
      reasons.push('A proposed country was not a supported country name and was omitted.');
      continue;
    }
    const location = {name, level: correctedLevel(name, level), evidence_quote: evidenceQuote};
    if (!locations.some((existing) => JSON.stringify(existing) === JSON.stringify(location))) {
      locations.push(location);
    }
  }
}

return [{json: {
  ...source,
  p4_location_candidates: locations,
  p4_location_raw_output: raw || null,
  p4_review_reasons: reasons,
}}];
