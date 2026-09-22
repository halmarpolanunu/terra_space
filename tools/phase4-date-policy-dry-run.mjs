import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const sql = `
select coalesce(json_agg(row_to_json(input)), '[]'::json)::text
from (
  select
    f.id,
    s.sequence_id,
    s.publication_date,
    s.cleaned_content_text,
    c.value ->> 'title' as candidate_title,
    c.value ->> 'description' as candidate_description,
    c.value ->> 'evidence_quote' as candidate_evidence_quote,
    f.facts ->> 'event_date' as existing_event_date,
    f.facts ->> 'event_date_precision' as existing_event_date_precision,
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
const code = fs.readFileSync(new URL('./n8n/phase4-capture-date-response.js', import.meta.url), 'utf8');
const changes = [];

for (const row of rows) {
  const source = {
    publication_date: row.publication_date,
    candidate_title: row.candidate_title,
    candidate_description: row.candidate_description,
    candidate_evidence_quote: row.candidate_evidence_quote,
  };
  const lookup = () => ({item: {json: source}});
  const response = {choices: [{message: {content: row.date_raw_output ?? ''}}]};
  const result = new Function('$', '$json', code)(lookup, response)[0].json;
  let validated = null;
  try { validated = JSON.parse(result.p4_date_validated_output); } catch { /* reported below */ }
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
  if (nextDate !== row.existing_event_date || nextPrecision !== row.existing_event_date_precision) {
    changes.push({
      sequence_id: row.sequence_id,
      candidate_title: row.candidate_title,
      existing_date: row.existing_event_date,
      proposed_date: nextDate,
      proposed_precision: nextPrecision,
      reason: result.p4_date_policy_reason,
    });
  }
}

console.log(JSON.stringify({rows_checked: rows.length, changes}, null, 2));
