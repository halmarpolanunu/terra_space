const RULE_VERSION = 'phase5d-strict-v1';
const STOPWORDS = new Set('a an and at by for from in into of on the to with'.split(' '));
const GENERIC_SUBJECTS = new Set(['authorities', 'government', 'officials', 'people', 'residents']);
const ACTION_CONTRASTS = [
  [new Set(['propose', 'proposes']), new Set(['approve', 'approves'])],
  [new Set(['plan', 'plans']), new Set(['implement', 'implements'])],
];

function normalizeWords(value) {
  return String(value ?? '').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) ?? [];
}

function titleTokens(title) {
  return new Set(normalizeWords(title).filter((word) => !STOPWORDS.has(word)));
}

function normalizedName(value) {
  return normalizeWords(value).join(' ');
}

function actualExactDate(timeline) {
  if (timeline?.event_date_precision !== 'exact') return null;
  const date = timeline.event_date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function sharedValues(a, b) {
  return [...a].filter((value) => b.has(value)).sort();
}

function actorNames(event) {
  return new Set((event.facts?.actors ?? [])
    .map((actor) => normalizedName(actor?.name))
    .filter((name) => name && !GENERIC_SUBJECTS.has(name)));
}

function specificPlaces(event) {
  return new Set((event.timeline?.event_geographies ?? [])
    .filter((place) => place?.resolution_status === 'RESOLVED'
      && ['admin1', 'city_regency'].includes(place.coordinate_precision)
      && typeof place.geographic_reference_id === 'string')
    .map((place) => place.geographic_reference_id));
}

function conflictingActions(a, b) {
  for (const [left, right] of ACTION_CONTRASTS) {
    const aLeft = [...left].some((word) => a.has(word));
    const aRight = [...right].some((word) => a.has(word));
    const bLeft = [...left].some((word) => b.has(word));
    const bRight = [...right].some((word) => b.has(word));
    if ((aLeft && bRight) || (aRight && bLeft)) return true;
  }
  return false;
}

export function evaluateDuplicates(events) {
  if (!Array.isArray(events)) throw new TypeError('Events must be an array');
  const ordered = [...events].sort((a, b) => String(a?.id).localeCompare(String(b?.id)));
  const recommendations = [];
  const summary = {
    events_considered: ordered.length,
    pairs_considered: 0,
    excluded_date: 0,
    excluded_title: 0,
    excluded_action: 0,
    excluded_subject: 0,
    recommended: 0,
  };

  for (let i = 0; i < ordered.length; i += 1) {
    const a = ordered[i];
    if (!a?.id) throw new Error('Each event needs an ID');
    if (i > 0 && a.id === ordered[i - 1].id) throw new Error(`Duplicate event ID: ${a.id}`);
  }

  for (let i = 0; i < ordered.length; i += 1) {
    const a = ordered[i];
    const date = actualExactDate(a.timeline);
    for (let j = i + 1; j < ordered.length; j += 1) {
      const b = ordered[j];
      summary.pairs_considered += 1;
      if (!date || actualExactDate(b.timeline) !== date) {
        summary.excluded_date += 1;
        continue;
      }

      const titleA = titleTokens(a.title);
      const titleB = titleTokens(b.title);
      const sharedTokens = sharedValues(titleA, titleB);
      if (sharedTokens.length < 3) {
        summary.excluded_title += 1;
        continue;
      }
      const score = sharedTokens.length / new Set([...titleA, ...titleB]).size;
      if (score < 0.75) {
        summary.excluded_title += 1;
        continue;
      }
      if (conflictingActions(titleA, titleB)) {
        summary.excluded_action += 1;
        continue;
      }

      const sharedActors = sharedValues(actorNames(a), actorNames(b));
      const sharedPlaces = sharedValues(specificPlaces(a), specificPlaces(b));
      if (sharedActors.length === 0 && sharedPlaces.length === 0) {
        summary.excluded_subject += 1;
        continue;
      }

      recommendations.push({
        event_record_id_a: a.id,
        event_record_id_b: b.id,
        event_date: date,
        status: 'POSSIBLE_DUPLICATE',
        rule_version: RULE_VERSION,
        title_overlap_score: score,
        shared_title_tokens: sharedTokens,
        shared_actor_names: sharedActors,
        shared_geographic_reference_ids: sharedPlaces,
        reason_codes: [
          'TITLE_OVERLAP',
          ...(sharedActors.length ? ['SHARED_ACTOR'] : []),
          ...(sharedPlaces.length ? ['SHARED_SPECIFIC_PLACE'] : []),
        ],
      });
      summary.recommended += 1;
    }
  }

  return { recommendations, summary };
}

export function recommendDuplicates(events) {
  return evaluateDuplicates(events).recommendations;
}
