import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPhase5cResult,
  buildSuggestionPrompt,
  parseSuggestionOutput,
  prepareTimeline,
  resolveActorGeographies,
  resolveEventGeographies,
} from '../n8n/phase5c-timeline-geography.mjs';

const place = {
  id: '10000000-0000-4000-8000-000000000001',
  canonical_name: 'Ankara',
  aliases: ['ankara'],
  reference_kind: 'city_regency',
  country_iso3: 'TUR',
  admin1: null,
  city_regency: 'Ankara',
  latitude: 39.91987,
  longitude: 32.85427,
  coordinate_precision: 'city_regency',
  source_name: 'GeoNames offline gazetteer',
  source_version: '2026-07-14',
  is_active: true,
};

const countryPlace = {
  ...place,
  id: '10000000-0000-4000-8000-000000000002',
  canonical_name: 'United States',
  aliases: ['united states', 'us'],
  reference_kind: 'country',
  country_iso3: 'USA',
  city_regency: null,
  latitude: 38.89511,
  longitude: -77.03637,
  coordinate_precision: 'country',
};

const actorReference = {
  id: '20000000-0000-4000-8000-000000000001',
  canonical_actor_name: 'United States',
  aliases: ['us', 'the united states'],
  actor_kind: 'country',
  relationship_type: 'REPRESENTED_COUNTRY',
  geographic_reference_id: countryPlace.id,
  source_name: 'Phase 4 retained actor evidence',
  source_version: 'baseline-109-2026-09-18',
  is_active: true,
};

test('prepareTimeline preserves an exact event date', () => {
  assert.deepEqual(
    prepareTimeline({ eventDate: '2026-08-24', precision: 'exact', publicationDate: '2026-08-25' }),
    {
      eventDate: '2026-08-24',
      precision: 'exact',
      timelineSortDate: '2026-08-24',
      timelineReferenceDate: '2026-08-24',
      timelineReferenceBasis: 'EVENT_DATE',
    },
  );
});

test('prepareTimeline uses technical first-day sorting without rewriting month or year values', () => {
  assert.equal(prepareTimeline({ eventDate: '2026-08', precision: 'month', publicationDate: '2026-09-01' }).timelineSortDate, '2026-08-01');
  const yearly = prepareTimeline({ eventDate: '2026', precision: 'year', publicationDate: '2026-09-01' });
  assert.equal(yearly.eventDate, '2026');
  assert.equal(yearly.precision, 'year');
  assert.equal(yearly.timelineSortDate, '2026-01-01');
});

test('prepareTimeline falls back to publication date only for an unknown event date', () => {
  assert.deepEqual(
    prepareTimeline({ eventDate: null, precision: 'unknown', publicationDate: '2026-09-01' }),
    {
      eventDate: null,
      precision: 'unknown',
      timelineSortDate: '2026-09-01',
      timelineReferenceDate: '2026-09-01',
      timelineReferenceBasis: 'SOURCE_PUBLICATION_DATE',
    },
  );
});

test('prepareTimeline rejects invalid or mismatched date formats', () => {
  assert.throws(() => prepareTimeline({ eventDate: '2026-02-30', precision: 'exact', publicationDate: '2026-09-01' }), /valid exact date/i);
  assert.throws(() => prepareTimeline({ eventDate: '2026-08-01', precision: 'month', publicationDate: '2026-09-01' }), /month/i);
  assert.throws(() => prepareTimeline({ eventDate: null, precision: 'unknown', publicationDate: 'not-a-date' }), /publication/i);
});

test('resolveEventGeographies retains distinct exact matches with approved provenance', () => {
  const result = resolveEventGeographies([
    { name: 'Ankara', level: 'city_regency', evidence_quote: 'The action occurred in Ankara.' },
    { name: 'ANKARA', level: 'city_regency', evidence_quote: 'The action occurred in Ankara.' },
  ], [place], []);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.geographies.length, 1);
  assert.deepEqual(result.geographies[0], {
    original_name: 'Ankara',
    level: 'city_regency',
    evidence_quote: 'The action occurred in Ankara.',
    geographic_reference_id: place.id,
    canonical_name: 'Ankara',
    country_iso3: 'TUR',
    latitude: 39.91987,
    longitude: 32.85427,
    coordinate_precision: 'city_regency',
    source_name: 'GeoNames offline gazetteer',
    source_version: '2026-07-14',
  });
  assert.deepEqual(result.newSuggestions, []);
});

test('resolveEventGeographies keeps unresolved and missing locations visible', () => {
  const missing = resolveEventGeographies([], [place], []);
  assert.deepEqual(missing, { status: 'NO_LOCATION_STATED', geographies: [], unresolved: [], newSuggestions: [] });

  const unresolved = resolveEventGeographies([
    { name: 'Unknown coast', level: 'unknown', evidence_quote: 'Near an unknown coast.' },
  ], [place], []);
  assert.equal(unresolved.status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(unresolved.unresolved[0].reason, 'NO_APPROVED_GEOGRAPHIC_REFERENCE');
  assert.equal(unresolved.newSuggestions.length, 1);
  assert.equal('latitude' in unresolved.newSuggestions[0], false);
});

test('resolveEventGeographies reuses an existing suggestion and rejects alias collisions', () => {
  const existing = { id: '30000000-0000-4000-8000-000000000001', suggestion_kind: 'LOCATION', normalized_input: 'unknown coast', review_status: 'PENDING_REVIEW' };
  const reused = resolveEventGeographies([{ name: 'Unknown coast', level: 'unknown', evidence_quote: 'Evidence.' }], [], [existing]);
  assert.equal(reused.unresolved[0].suggestion_id, existing.id);
  assert.deepEqual(reused.newSuggestions, []);

  const collision = { ...place, id: '10000000-0000-4000-8000-000000000099', canonical_name: 'Other Ankara' };
  assert.throws(() => resolveEventGeographies([{ name: 'Ankara', level: 'city_regency', evidence_quote: 'Evidence.' }], [place, collision], []), /alias collision/i);
});

test('resolveEventGeographies stays resolved when two input aliases identify the same place', () => {
  const aliasedPlace = { ...place, aliases: ['ankara', 'city of ankara'] };
  const result = resolveEventGeographies([
    { name: 'Ankara', level: 'city_regency', evidence_quote: 'Ankara evidence.' },
    { name: 'City of Ankara', level: 'city_regency', evidence_quote: 'City of Ankara evidence.' },
  ], [aliasedPlace], []);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.geographies.length, 1);
  assert.equal(result.unresolved.length, 0);
});

test('resolveEventGeographies never accepts actor references or invented coordinates', () => {
  const actorShaped = { ...actorReference, aliases: ['nowhere'] };
  const result = resolveEventGeographies([{ name: 'Nowhere', level: 'unknown', evidence_quote: 'Evidence.' }], [actorShaped], []);
  assert.equal(result.status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(result.geographies.length, 0);
});

test('resolveEventGeographies refuses an out-of-range approved coordinate', () => {
  const invalidPlace = { ...place, latitude: 91 };
  const result = resolveEventGeographies([
    { name: 'Ankara', level: 'city_regency', evidence_quote: 'Evidence.' },
  ], [invalidPlace], []);
  assert.equal(result.status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(result.geographies.length, 0);
  assert.equal(result.unresolved[0].reason, 'NO_APPROVED_GEOGRAPHIC_REFERENCE');
});

test('resolveActorGeographies resolves source, participant, and recipient roles', () => {
  const actors = ['source', 'participant', 'recipient'].map((role) => ({ name: 'US', role, evidence_quote: `US ${role}` }));
  const result = resolveActorGeographies(actors, [actorReference], [countryPlace], []);
  assert.equal(result.status, 'RESOLVED');
  assert.deepEqual(result.geographies.map((item) => item.role), ['source', 'participant', 'recipient']);
  assert.ok(result.geographies.every((item) => item.relationship_type === 'REPRESENTED_COUNTRY'));
  assert.ok(result.geographies.every((item) => item.canonical_geography_name === 'United States'));
});

test('resolveActorGeographies supports headquarters and excludes private-home references', () => {
  const headquartersActor = { ...actorReference, id: '20000000-0000-4000-8000-000000000002', canonical_actor_name: 'Example Org', aliases: ['example org'], actor_kind: 'organization', relationship_type: 'HEADQUARTERS', geographic_reference_id: place.id };
  const resolved = resolveActorGeographies([{ name: 'Example Org', role: 'participant', evidence_quote: 'Example Org acted.' }], [headquartersActor], [place], []);
  assert.equal(resolved.geographies[0].relationship_type, 'HEADQUARTERS');

  const privatePlace = { ...place, is_private_home: true };
  const excluded = resolveActorGeographies([{ name: 'Example Org', role: 'participant', evidence_quote: 'Example Org acted.' }], [headquartersActor], [privatePlace], []);
  assert.equal(excluded.status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(excluded.unresolved[0].reason, 'PRIVATE_HOME_EXCLUDED');
});

test('resolveActorGeographies keeps unknown actors visible and rejects alias collisions', () => {
  const unknown = resolveActorGeographies([{ name: 'Unknown body', role: 'recipient', evidence_quote: 'Unknown body received it.' }], [], [countryPlace], []);
  assert.equal(unknown.status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(unknown.newSuggestions[0].suggestion_kind, 'ACTOR');

  const collision = { ...actorReference, id: '20000000-0000-4000-8000-000000000099', canonical_actor_name: 'Other US' };
  assert.throws(() => resolveActorGeographies([{ name: 'US', role: 'participant', evidence_quote: 'Evidence.' }], [actorReference, collision], [countryPlace], []), /alias collision/i);
});

test('buildSuggestionPrompt exposes only bounded allowed evidence fields', () => {
  const prompt = JSON.parse(buildSuggestionPrompt({
    name: 'Unknown body', kind: 'ACTOR', role: 'recipient', level: null,
    evidence_quote: 'x'.repeat(900), latitude: 12, secret: 'do-not-copy',
  }));
  assert.deepEqual(Object.keys(prompt).sort(), ['evidence_quote', 'kind', 'level', 'name', 'role']);
  assert.equal(prompt.evidence_quote.length, 500);
  assert.equal(JSON.stringify(prompt).includes('latitude'), false);
  assert.equal(JSON.stringify(prompt).includes('do-not-copy'), false);
});

test('parseSuggestionOutput accepts only non-authoritative proposals and never coordinates', () => {
  assert.deepEqual(parseSuggestionOutput(JSON.stringify({
    proposed_canonical_name: 'Example Org',
    proposed_relationship_type: 'HEADQUARTERS',
    reason: 'Possible reviewed match.',
  })), {
    proposedCanonicalName: 'Example Org',
    proposedRelationshipType: 'HEADQUARTERS',
    reason: 'Possible reviewed match.',
  });
  assert.equal(parseSuggestionOutput('{bad json'), null);
  assert.equal(parseSuggestionOutput(JSON.stringify({ proposed_canonical_name: 'Bad', latitude: 1, longitude: 2, reason: 'No.' })), null);
  assert.equal(parseSuggestionOutput(null), null);
});

test('buildPhase5cResult prepares unresolved geography without failing and does not mutate input', () => {
  const input = {
    phase5_event_record_id: '40000000-0000-4000-8000-000000000001',
    phase5b_classification_id: '50000000-0000-4000-8000-000000000001',
    source_publication_date: '2026-09-01',
    facts: {
      event_date: null,
      event_date_precision: 'unknown',
      locations: [{ name: 'Unknown coast', level: 'unknown', evidence_quote: 'Near an unknown coast.' }],
      actors: [],
    },
    approved_geographic_references: [place],
    approved_actor_geographic_references: [],
    open_reference_suggestions: [],
  };
  const before = structuredClone(input);
  const first = buildPhase5cResult(input);
  const second = buildPhase5cResult(input);
  assert.deepEqual(input, before);
  assert.equal(first.latest.phase5c_status, 'PREPARED');
  assert.equal(first.latest.event_geography_status, 'AWAITING_REFERENCE_REVIEW');
  assert.equal(first.latest.actor_geography_status, 'NO_ACTORS_STATED');
  assert.deepEqual(first.latest.limitation_reasons, ['EVENT_GEOGRAPHY_AWAITING_REFERENCE_REVIEW', 'NO_ACTORS_STATED']);
  assert.equal(first.latest.phase5_event_record_id, input.phase5_event_record_id);
  assert.equal(first.latest.phase5b_classification_id, input.phase5b_classification_id);
  assert.equal(first.history.submission_key, second.history.submission_key);
  assert.equal(first.newSuggestions[0].suggestion_source, 'SYSTEM_UNRESOLVED');
});

test('buildPhase5cResult reports technical validation failures with a deterministic safe payload', () => {
  const input = {
    phase5_event_record_id: '40000000-0000-4000-8000-000000000002',
    phase5b_classification_id: '50000000-0000-4000-8000-000000000002',
    source_publication_date: '2026-09-01',
    facts: { event_date: 'not-a-date', event_date_precision: 'exact', locations: [], actors: [] },
    approved_geographic_references: [],
    approved_actor_geographic_references: [],
    open_reference_suggestions: [],
  };
  const result = buildPhase5cResult(input);
  assert.equal(result.latest.phase5c_status, 'FAILED');
  assert.match(result.latest.error_message, /valid exact date/i);
  assert.equal(result.latest.event_date, null);
  assert.equal(result.latest.event_date_precision, 'unknown');
  assert.equal(result.latest.timeline_reference_basis, 'SOURCE_PUBLICATION_DATE');
  assert.equal(result.history.submission_key.length, 36);
});
