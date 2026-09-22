import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const sql = `
select coalesce(json_agg(row_to_json(input)), '[]'::json)::text
from (
  select
    f.id,
    f.status as existing_status,
    f.candidate_id,
    s.sequence_id,
    s.publication_date,
    s.cleaned_content_text,
    c.value ->> 'title' as candidate_title,
    c.value ->> 'description' as candidate_description,
    c.value ->> 'status' as candidate_status,
    c.value ->> 'evidence_quote' as candidate_evidence_quote,
    f.facts ->> 'event_date' as existing_event_date,
    f.facts ->> 'event_date_precision' as existing_event_date_precision,
    f.facts ->> 'epistemic_status' as existing_epistemic_status,
    f.facts ->> 'epistemic_status_evidence_quote' as existing_epistemic_quote,
    coalesce(f.facts -> 'actors', '[]'::jsonb) as existing_actors,
    coalesce(f.facts -> 'locations', '[]'::jsonb) as existing_locations,
    f.extraction_raw_output::jsonb ->> 'date_epistemic' as date_raw_output
  from public.terra_space_phase4_event_facts f
  join public.terra_space_phase1_sources s on s.id = f.phase1_source_id
  join public.terra_space_phase3_event_candidates p3 on p3.id = f.phase3_event_candidate_result_id
  cross join lateral jsonb_array_elements(p3.candidates) c(value)
  where c.value ->> 'candidate_id' = f.candidate_id
  order by s.sequence_id, f.candidate_id
) input;
`;

const output = execFileSync('docker', [
  'exec', 'supabase_db_local-supabase', 'psql', '-U', 'postgres', '-d', 'postgres',
  '-t', '-A', '-c', sql,
], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024});
const rows = JSON.parse(output.trim());
const dateCode = fs.readFileSync(new URL('./n8n/phase4-capture-date-response.js', import.meta.url), 'utf8');
const actorCode = fs.readFileSync(new URL('./n8n/phase4-validate-actors.js', import.meta.url), 'utf8');
const locationCode = fs.readFileSync(new URL('./n8n/phase4-validate-locations.js', import.meta.url), 'utf8');
const affected = [];

for (const row of rows) {
  const source = {
    publication_date: row.publication_date,
    candidate_evidence_quote: row.candidate_evidence_quote,
    candidate_title: row.candidate_title,
    candidate_description: row.candidate_description,
    cleaned_content_text: row.cleaned_content_text,
    p4_review_reasons: [],
  };
  const dateLookup = () => ({item: {json: source}});
  const dateResponse = {choices: [{message: {content: row.date_raw_output ?? ''}}]};
  const dateResult = new Function('$', '$json', dateCode)(dateLookup, dateResponse)[0].json;
  let validated = null;
  try { validated = JSON.parse(dateResult.p4_date_validated_output); } catch { /* unchanged */ }

  const allowedPrecision = ['exact', 'month', 'year', 'unknown'];
  let nextPrecision = allowedPrecision.includes(validated?.event_date_precision)
    ? validated.event_date_precision
    : 'unknown';
  let nextDate = typeof validated?.event_date === 'string' ? validated.event_date.trim() : null;
  const dateQuote = typeof validated?.event_date_evidence_quote === 'string'
    ? validated.event_date_evidence_quote.trim()
    : null;
  const patterns = {exact: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/, year: /^\d{4}$/};
  if (nextPrecision === 'unknown'
      || !nextDate
      || !patterns[nextPrecision]?.test(nextDate)
      || !dateQuote
      || !row.cleaned_content_text.includes(dateQuote)) {
    nextDate = null;
    nextPrecision = 'unknown';
  }
  const dateChanged = nextDate !== row.existing_event_date
    || nextPrecision !== row.existing_event_date_precision;

  const nextEpistemicStatus = validated?.epistemic_status ?? 'unknown';
  const nextEpistemicQuote = validated?.epistemic_status_evidence_quote ?? null;
  const epistemicChanged = nextEpistemicStatus !== row.existing_epistemic_status
    || nextEpistemicQuote !== row.existing_epistemic_quote;

  const actorSource = {...source};
  const actorLookup = () => ({item: {json: actorSource}});
  const actorResponse = {
    choices: [{message: {content: JSON.stringify({actors: row.existing_actors})}}],
  };
  const actorResult = new Function('$', '$json', actorCode)(actorLookup, actorResponse)[0].json;
  const actorsChanged = JSON.stringify(actorResult.p4_actor_candidates)
    !== JSON.stringify(row.existing_actors);

  const locationSource = {...source, p4_review_reasons: [], p4_actors: actorResult.p4_actor_candidates};
  const locationLookup = () => ({item: {json: locationSource}});
  const locationResponse = {
    choices: [{message: {content: JSON.stringify({locations: row.existing_locations})}}],
  };
  const locationResult = new Function('$', '$json', locationCode)(locationLookup, locationResponse)[0].json;
  const locationsChanged = JSON.stringify(locationResult.p4_location_candidates)
    !== JSON.stringify(row.existing_locations);
  const statusChanged = row.existing_status === 'VALID' && row.candidate_status === 'NEEDS_REVIEW';

  if (dateChanged || epistemicChanged || actorsChanged || locationsChanged || statusChanged) {
    affected.push({
      id: row.id,
      sequence_id: row.sequence_id,
      candidate_id: row.candidate_id,
      candidate_title: row.candidate_title,
      date_changed: dateChanged,
      epistemic_changed: epistemicChanged,
      actors_changed: actorsChanged,
      locations_changed: locationsChanged,
      status_changed: statusChanged,
    });
  }
}

console.log(JSON.stringify({rows_checked: rows.length, affected_count: affected.length, affected}, null, 2));
