const DATE_PATTERNS = {
  exact: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

const RELATIONSHIPS = new Set(['REPRESENTED_COUNTRY', 'HEADQUARTERS', 'NATIONALITY']);

function normalizeLabel(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

function requireNonblank(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function isRealDate(value) {
  if (!DATE_PATTERNS.exact.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function validPublicationDate(value) {
  if (!isRealDate(String(value ?? ''))) throw new Error('A valid publication date is required');
  return value;
}

export function prepareTimeline({ eventDate, precision, publicationDate }) {
  if (!['exact', 'month', 'year', 'unknown'].includes(precision)) {
    throw new Error('Event date precision must be exact, month, year, or unknown');
  }

  if (precision === 'unknown') {
    if (eventDate !== null && eventDate !== undefined && eventDate !== '') {
      throw new Error('Unknown date precision requires a null event date');
    }
    const fallback = validPublicationDate(publicationDate);
    return {
      eventDate: null,
      precision,
      timelineSortDate: fallback,
      timelineReferenceDate: fallback,
      timelineReferenceBasis: 'SOURCE_PUBLICATION_DATE',
    };
  }

  const original = requireNonblank(eventDate, 'Event date');
  if (precision === 'exact' && !isRealDate(original)) throw new Error('Event date must be a valid exact date');
  if (precision === 'month' && (!DATE_PATTERNS.month.test(original) || Number(original.slice(5, 7)) < 1 || Number(original.slice(5, 7)) > 12)) {
    throw new Error('Event date must use a valid YYYY-MM month');
  }
  if (precision === 'year' && !DATE_PATTERNS.year.test(original)) throw new Error('Event date must use a valid YYYY year');

  const sortDate = precision === 'exact' ? original : precision === 'month' ? `${original}-01` : `${original}-01-01`;
  return {
    eventDate: original,
    precision,
    timelineSortDate: sortDate,
    timelineReferenceDate: sortDate,
    timelineReferenceBasis: 'EVENT_DATE',
  };
}

function isApprovedPlace(reference) {
  const latitude = Number(reference?.latitude);
  const longitude = Number(reference?.longitude);
  return reference
    && typeof reference.canonical_name === 'string'
    && Array.isArray(reference.aliases)
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180
    && reference.is_active !== false;
}

function buildAliasIndex(records, aliasField, typeLabel) {
  const index = new Map();
  for (const record of records ?? []) {
    if (!record || record.is_active === false || !Array.isArray(record[aliasField])) continue;
    const aliases = new Set([...(record[aliasField] ?? []), record.canonical_name, record.canonical_actor_name].map(normalizeLabel).filter(Boolean));
    for (const alias of aliases) {
      const existing = index.get(alias);
      if (existing && existing.id !== record.id) throw new Error(`${typeLabel} alias collision for ${alias}`);
      index.set(alias, record);
    }
  }
  return index;
}

function suggestionIndex(suggestions, kind) {
  const index = new Map();
  for (const suggestion of suggestions ?? []) {
    if (suggestion?.suggestion_kind !== kind) continue;
    const key = normalizeLabel(suggestion.normalized_input ?? suggestion.display_input);
    if (key && !index.has(key)) index.set(key, suggestion);
  }
  return index;
}

function unresolvedSuggestion(kind, subject) {
  const normalized = normalizeLabel(subject.name);
  return {
    suggestion_kind: kind,
    normalized_input: normalized,
    display_input: String(subject.name).trim(),
    proposed_canonical_name: null,
    proposed_relationship_type: null,
    proposed_geographic_reference_id: null,
    proposed_actor_reference_id: null,
    suggestion_source: 'SYSTEM_UNRESOLVED',
    model_name: null,
    prompt_version: null,
    suggestion_reason: `No approved ${kind.toLowerCase()} reference matched the normalized input.`,
    supporting_occurrences: [{
      role: subject.role ?? null,
      level: subject.level ?? null,
      evidence_quote: String(subject.evidence_quote ?? '').slice(0, 500),
    }],
    raw_output: null,
    review_status: 'PENDING_REVIEW',
  };
}

function geographyStatus(total, resolved) {
  if (total === 0) return 'NO_LOCATION_STATED';
  if (resolved === total) return 'RESOLVED';
  if (resolved > 0) return 'PARTIAL';
  return 'AWAITING_REFERENCE_REVIEW';
}

function actorStatus(total, resolved) {
  if (total === 0) return 'NO_ACTORS_STATED';
  if (resolved === total) return 'RESOLVED';
  if (resolved > 0) return 'PARTIAL';
  return 'AWAITING_REFERENCE_REVIEW';
}

export function resolveEventGeographies(locations = [], approvedPlaces = [], suggestions = []) {
  const placeIndex = buildAliasIndex((approvedPlaces ?? []).filter(isApprovedPlace), 'aliases', 'Geographic reference');
  const existingSuggestions = suggestionIndex(suggestions, 'LOCATION');
  const geographies = [];
  const unresolved = [];
  const newSuggestions = [];
  const resolvedIds = new Set();
  const newSuggestionKeys = new Set();
  const uniqueInputs = new Set();
  let resolvedInputs = 0;

  for (const location of locations ?? []) {
    const name = requireNonblank(location?.name, 'Location name');
    const normalized = normalizeLabel(name);
    if (uniqueInputs.has(normalized)) continue;
    uniqueInputs.add(normalized);
    const reference = placeIndex.get(normalized);
    if (reference) {
      resolvedInputs += 1;
      if (resolvedIds.has(reference.id)) continue;
      resolvedIds.add(reference.id);
      geographies.push({
        original_name: name,
        level: location.level ?? null,
        evidence_quote: location.evidence_quote ?? null,
        geographic_reference_id: reference.id,
        canonical_name: reference.canonical_name,
        country_iso3: reference.country_iso3 ?? null,
        latitude: Number(reference.latitude),
        longitude: Number(reference.longitude),
        coordinate_precision: reference.coordinate_precision,
        source_name: reference.source_name,
        source_version: reference.source_version,
      });
      continue;
    }

    const existing = existingSuggestions.get(normalized);
    const item = {
      original_name: name,
      level: location.level ?? null,
      evidence_quote: location.evidence_quote ?? null,
      reason: 'NO_APPROVED_GEOGRAPHIC_REFERENCE',
      suggestion_id: existing?.id ?? null,
    };
    unresolved.push(item);
    if (!existing && !newSuggestionKeys.has(normalized)) {
      newSuggestionKeys.add(normalized);
      newSuggestions.push(unresolvedSuggestion('LOCATION', location));
    }
  }

  return {
    status: geographyStatus(uniqueInputs.size, resolvedInputs),
    geographies,
    unresolved,
    newSuggestions,
  };
}

export function resolveActorGeographies(actors = [], approvedActors = [], approvedPlaces = [], suggestions = []) {
  const actorIndex = buildAliasIndex(approvedActors ?? [], 'aliases', 'Actor reference');
  const placesById = new Map((approvedPlaces ?? []).filter(isApprovedPlace).map((reference) => [reference.id, reference]));
  const existingSuggestions = suggestionIndex(suggestions, 'ACTOR');
  const geographies = [];
  const unresolved = [];
  const newSuggestions = [];
  const newSuggestionKeys = new Set();
  let considered = 0;

  for (const actor of actors ?? []) {
    const name = requireNonblank(actor?.name, 'Actor name');
    const normalized = normalizeLabel(name);
    considered += 1;
    const reference = actorIndex.get(normalized);
    const placeReference = reference ? placesById.get(reference.geographic_reference_id) : null;
    let reason = null;
    if (!reference) reason = 'NO_APPROVED_ACTOR_REFERENCE';
    else if (!RELATIONSHIPS.has(reference.relationship_type)) reason = 'INVALID_ACTOR_RELATIONSHIP';
    else if (!placeReference) reason = 'NO_APPROVED_GEOGRAPHIC_REFERENCE';
    else if (placeReference.is_private_home === true) reason = 'PRIVATE_HOME_EXCLUDED';

    if (!reason) {
      geographies.push({
        original_name: name,
        role: actor.role ?? null,
        evidence_quote: actor.evidence_quote ?? null,
        actor_reference_id: reference.id,
        canonical_actor_name: reference.canonical_actor_name,
        actor_kind: reference.actor_kind,
        relationship_type: reference.relationship_type,
        geographic_reference_id: placeReference.id,
        canonical_geography_name: placeReference.canonical_name,
        country_iso3: placeReference.country_iso3 ?? null,
        latitude: Number(placeReference.latitude),
        longitude: Number(placeReference.longitude),
        coordinate_precision: placeReference.coordinate_precision,
        source_name: reference.source_name,
        source_version: reference.source_version,
      });
      continue;
    }

    const existing = existingSuggestions.get(normalized);
    unresolved.push({
      original_name: name,
      role: actor.role ?? null,
      evidence_quote: actor.evidence_quote ?? null,
      reason,
      suggestion_id: existing?.id ?? null,
    });
    if (!existing && !newSuggestionKeys.has(normalized)) {
      newSuggestionKeys.add(normalized);
      newSuggestions.push(unresolvedSuggestion('ACTOR', actor));
    }
  }

  return {
    status: actorStatus(considered, geographies.length),
    geographies,
    unresolved,
    newSuggestions,
  };
}

export function buildSuggestionPrompt(subject) {
  return JSON.stringify({
    name: String(subject?.name ?? '').trim(),
    kind: subject?.kind ?? null,
    role: subject?.role ?? null,
    level: subject?.level ?? null,
    evidence_quote: String(subject?.evidence_quote ?? '').slice(0, 500),
  });
}

export function parseSuggestionOutput(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if ('latitude' in parsed || 'longitude' in parsed || 'coordinates' in parsed) return null;
    const proposedCanonicalName = requireNonblank(parsed.proposed_canonical_name, 'Proposed canonical name');
    const reason = requireNonblank(parsed.reason, 'Suggestion reason');
    const proposedRelationshipType = parsed.proposed_relationship_type ?? null;
    if (proposedRelationshipType !== null && !RELATIONSHIPS.has(proposedRelationshipType)) return null;
    return { proposedCanonicalName, proposedRelationshipType, reason };
  } catch {
    return null;
  }
}

function stableUuid(value) {
  const input = String(value);
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  let c = 0x85ebca6b;
  let d = 0xc2b2ae35;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x27d4eb2d) >>> 0;
    c = Math.imul(c ^ code, 0x165667b1) >>> 0;
    d = Math.imul(d ^ code, 0x9e3779b1) >>> 0;
  }
  const hex = [a, b, c, d].map((number) => number.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function deduplicateSuggestions(suggestions) {
  const seen = new Set();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.suggestion_kind}:${suggestion.normalized_input}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function latestPayload(input, timeline, eventResult, actorResult, status, errorMessage = null) {
  const limitations = [];
  if (eventResult.status !== 'RESOLVED') limitations.push(`EVENT_GEOGRAPHY_${eventResult.status}`);
  if (actorResult.status !== 'RESOLVED') limitations.push(actorResult.status === 'NO_ACTORS_STATED' ? 'NO_ACTORS_STATED' : `ACTOR_GEOGRAPHY_${actorResult.status}`);
  return {
    phase5_event_record_id: input.phase5_event_record_id,
    phase5b_classification_id: input.phase5b_classification_id,
    event_date: timeline.eventDate,
    event_date_precision: timeline.precision,
    timeline_sort_date: timeline.timelineSortDate,
    timeline_reference_date: timeline.timelineReferenceDate,
    timeline_reference_basis: timeline.timelineReferenceBasis,
    event_geographies: [
      ...eventResult.geographies.map((item) => ({ ...item, resolution_status: 'RESOLVED' })),
      ...eventResult.unresolved.map((item) => ({ ...item, resolution_status: 'UNRESOLVED' })),
    ],
    actor_geographies: [
      ...actorResult.geographies.map((item) => ({ ...item, resolution_status: 'RESOLVED' })),
      ...actorResult.unresolved.map((item) => ({ ...item, resolution_status: 'UNRESOLVED' })),
    ],
    event_geography_status: eventResult.status,
    actor_geography_status: actorResult.status,
    phase5c_status: status,
    limitation_reasons: limitations,
    error_message: errorMessage,
    processed_at: input.processed_at ?? new Date().toISOString(),
  };
}

export function buildPhase5cResult(input) {
  const snapshot = structuredClone(input);
  const identity = `${snapshot.phase5_event_record_id}|${snapshot.phase5b_classification_id}`;
  try {
    requireNonblank(snapshot.phase5_event_record_id, 'Phase 5 event record ID');
    requireNonblank(snapshot.phase5b_classification_id, 'Phase 5B classification ID');
    const timeline = prepareTimeline({
      eventDate: snapshot.facts?.event_date ?? null,
      precision: snapshot.facts?.event_date_precision,
      publicationDate: snapshot.source_publication_date,
    });
    const eventResult = resolveEventGeographies(
      snapshot.facts?.locations ?? [],
      snapshot.approved_geographic_references ?? [],
      snapshot.open_reference_suggestions ?? [],
    );
    const actorResult = resolveActorGeographies(
      snapshot.facts?.actors ?? [],
      snapshot.approved_actor_geographic_references ?? [],
      snapshot.approved_geographic_references ?? [],
      snapshot.open_reference_suggestions ?? [],
    );
    const latest = latestPayload(snapshot, timeline, eventResult, actorResult, 'PREPARED');
    const submissionKey = stableUuid(`${identity}|${JSON.stringify({ ...latest, processed_at: null })}`);
    return {
      latest,
      history: { submission_key: submissionKey, ...latest },
      newSuggestions: deduplicateSuggestions([...eventResult.newSuggestions, ...actorResult.newSuggestions]),
    };
  } catch (error) {
    const timeline = prepareTimeline({ eventDate: null, precision: 'unknown', publicationDate: snapshot.source_publication_date });
    const emptyEvent = { status: 'NO_LOCATION_STATED', geographies: [], unresolved: [], newSuggestions: [] };
    const emptyActors = { status: 'NO_ACTORS_STATED', geographies: [], unresolved: [], newSuggestions: [] };
    const latest = latestPayload(snapshot, timeline, emptyEvent, emptyActors, 'FAILED', String(error?.message ?? error));
    const submissionKey = stableUuid(`${identity}|FAILED|${latest.error_message}`);
    return { latest, history: { submission_key: submissionKey, ...latest }, newSuggestions: [] };
  }
}
