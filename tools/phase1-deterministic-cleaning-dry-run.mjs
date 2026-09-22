import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const sql = `select coalesce(json_agg(row_to_json(x)), '[]'::json)::text from (
  select sequence_id, raw_content_text, cleaned_content_text
  from public.terra_space_phase1_sources
  where sequence_id between 98 and 107
  order by sequence_id
) x;`;
const output = execFileSync('docker', [
  'exec', 'supabase_db_local-supabase', 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c', sql,
], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024});
const rows = JSON.parse(output.trim());
const code = fs.readFileSync(new URL('./n8n/phase1-remove-obvious-non-article-text.js', import.meta.url), 'utf8');

const results = rows.map((row) => {
  const next = new Function('$input', code)({
    all: () => [{json: {p1_raw_content_text: row.raw_content_text}}],
  })[0].json.p1_preclean_content_text;
  return {
    sequence_id: row.sequence_id,
    current_length: row.cleaned_content_text.length,
    deterministic_length: next.length,
    changed: next !== row.cleaned_content_text,
    start: next.slice(0, 180).replace(/\s+/gu, ' '),
    end: next.slice(-180).replace(/\s+/gu, ' '),
  };
});

console.log(JSON.stringify(results, null, 2));
