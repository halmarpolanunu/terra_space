import fs from 'node:fs';

const workflowPath = new URL('./n8n/terra-space-phase5-workflow.json', import.meta.url);
const qualifierPath = new URL('./n8n/phase5e-qualify-event.mjs', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
if (workflow.name !== 'Terra Space - Phase 5 - Generate and Qualify Events' || workflow.active !== false) throw new Error('Unexpected workflow identity or activation.');
workflow.nodes = workflow.nodes.filter((node) => !node.id.startsWith('p5e_'));
for (const name of Object.keys(workflow.connections)) {
  if (name.startsWith('Get Phase 5E') || name.startsWith('Continue After Phase 5E')
    || name.startsWith('Prepare Phase 5E') || name.startsWith('Has Existing Phase 5E')
    || name.startsWith('Update Phase 5E') || name.startsWith('Create Phase 5E')
    || name.startsWith('Append Phase 5E') || name === 'Phase 5E Complete') delete workflow.connections[name];
}
workflow.connections['Phase 5D Complete'] = { main: [[]] };
const credential = workflow.nodes.find((node) => node.id === 'p5a_get_pending')?.credentials;
const qualifier = fs.readFileSync(qualifierPath, 'utf8').replace('export function qualifyEvent', 'function qualifyEvent');
const prepareCode = `${qualifier}
function attemptId() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16); }); }
const rows = name => $(name).all().map(item => item.json).filter(row => row && !row.phase5e_control);
const by = (items, key) => new Map(items.filter(item => item?.[key]).map(item => [item[key], item]));
const phase3 = by(rows('Get Phase 5E Phase 3 Results'), 'id');
const classifications = by(rows('Get Phase 5E Classifications'), 'phase5_event_record_id');
const types = by(rows('Get Phase 5E Event Types'), 'id');
const timelines = by(rows('Get Phase 5E Timeline Results'), 'phase5_event_record_id');
const latest = by(rows('Get Existing Phase 5E Qualifications'), 'phase5_event_record_id');
return rows('Get Phase 5E Event Records').filter(event => event?.id).map(event => {
  const classification = classifications.get(event.id);
  const eventType = classification?.event_type_id ? types.get(classification.event_type_id) : null;
  const qualified = qualifyEvent({
    phase5a: event,
    phase3: phase3.get(event.phase3_event_candidate_result_id) ?? null,
    phase5b: classification ? { ...classification, event_type_is_active: eventType?.is_active === true } : null,
    phase5c: timelines.get(event.id) ?? null,
  });
  return { json: {
    phase5_event_record_id: event.id,
    qualification_status: qualified.phase5e_status,
    qualification_reason_codes: qualified.qualification_reason_codes,
    submission_key: attemptId(),
    existing_phase5e_id: latest.get(event.id)?.id ?? null,
  } };
});`;
const conn = node => ({ node, type: 'main', index: 0 });
const read = (id, name, tableId, x) => ({ id, name, type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [x, 480], credentials: credential, alwaysOutputData: true, parameters: { operation: 'getAll', tableId: `=${tableId}`, returnAll: true }, notes: 'Read-only Phase 5E qualification input. Empty reads emit one control item.' });
const control = (id, name, x) => ({ id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, 480], parameters: { jsCode: "return [{ json: { phase5e_control: true } }];" }, notes: 'One control item prevents repeated downstream reads.' });
const fields = ['phase5_event_record_id', 'qualification_status', 'qualification_reason_codes', 'submission_key'];
const write = (id, name, tableId, x, update = false) => ({ id, name, type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [x, 480], credentials: credential, parameters: { ...(update ? { operation: 'update', filterType: 'string', filterString: "={{ 'id=eq.' + $('Prepare Phase 5E Qualifications').item.json.existing_phase5e_id }}" } : {}), tableId: `=${tableId}`, fieldsUi: { fieldValues: fields.map(fieldId => ({ fieldId, fieldValue: `={{ $('Prepare Phase 5E Qualifications').item.json.${fieldId} }}` })) } }, notes: 'Writes only the Phase 5E qualification table.' });
const existing = { id: 'p5e_existing', name: 'Has Existing Phase 5E Qualification?', type: 'n8n-nodes-base.if', typeVersion: 2.3, position: [14224, 480], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ id: 'p5e-existing-condition', leftValue: '={{ Boolean($json.existing_phase5e_id) }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} } };
const nodes = [
  read('p5e_get_events', 'Get Phase 5E Event Records', 'terra_space_phase5_event_records', 11440), control('p5e_after_events', 'Continue After Phase 5E Event Read', 11664),
  read('p5e_get_phase3', 'Get Phase 5E Phase 3 Results', 'terra_space_phase3_event_candidates', 11888), control('p5e_after_phase3', 'Continue After Phase 5E Phase 3 Read', 12112),
  read('p5e_get_classifications', 'Get Phase 5E Classifications', 'terra_space_phase5_event_type_classifications', 12336), control('p5e_after_classifications', 'Continue After Phase 5E Classification Read', 12560),
  read('p5e_get_types', 'Get Phase 5E Event Types', 'terra_space_phase5_event_types', 12784), control('p5e_after_types', 'Continue After Phase 5E Type Read', 13008),
  read('p5e_get_timelines', 'Get Phase 5E Timeline Results', 'terra_space_phase5_timeline_geographies', 13232), control('p5e_after_timelines', 'Continue After Phase 5E Timeline Read', 13456),
  read('p5e_get_latest', 'Get Existing Phase 5E Qualifications', 'terra_space_phase5_event_qualifications', 13680), control('p5e_after_latest', 'Continue After Phase 5E Latest Read', 13904),
  read('p5e_get_history', 'Get Phase 5E Qualification History', 'terra_space_phase5_event_qualification_runs', 14128),
  { id: 'p5e_prepare', name: 'Prepare Phase 5E Qualifications', type: 'n8n-nodes-base.code', typeVersion: 2, position: [14000, 640], parameters: { jsCode: prepareCode }, notes: 'Deterministic qualification only. No model call, merge, publication, or source-data mutation.' },
  existing,
  write('p5e_update_latest', 'Update Phase 5E Qualification', 'terra_space_phase5_event_qualifications', 14448, true),
  write('p5e_create_latest', 'Create Phase 5E Qualification', 'terra_space_phase5_event_qualifications', 14448),
  write('p5e_append_run', 'Append Phase 5E Qualification Run', 'terra_space_phase5_event_qualification_runs', 14672),
  { id: 'p5e_complete', name: 'Phase 5E Complete', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [14896, 480], parameters: {}, notes: 'Review stop. Do not execute without a separately approved pilot.' },
];
workflow.nodes.push(...nodes);
workflow.connections['Phase 5D Complete'] = { main: [[conn('Get Phase 5E Event Records')]] };
const linear = ['Get Phase 5E Event Records', 'Continue After Phase 5E Event Read', 'Get Phase 5E Phase 3 Results', 'Continue After Phase 5E Phase 3 Read', 'Get Phase 5E Classifications', 'Continue After Phase 5E Classification Read', 'Get Phase 5E Event Types', 'Continue After Phase 5E Type Read', 'Get Phase 5E Timeline Results', 'Continue After Phase 5E Timeline Read', 'Get Existing Phase 5E Qualifications', 'Continue After Phase 5E Latest Read', 'Get Phase 5E Qualification History', 'Prepare Phase 5E Qualifications'];
for (let i = 0; i < linear.length - 1; i += 1) workflow.connections[linear[i]] = { main: [[conn(linear[i + 1])]] };
workflow.connections['Prepare Phase 5E Qualifications'] = { main: [[conn('Has Existing Phase 5E Qualification?')]] };
workflow.connections['Has Existing Phase 5E Qualification?'] = { main: [[conn('Update Phase 5E Qualification')], [conn('Create Phase 5E Qualification')]] };
workflow.connections['Update Phase 5E Qualification'] = { main: [[conn('Append Phase 5E Qualification Run')]] };
workflow.connections['Create Phase 5E Qualification'] = { main: [[conn('Append Phase 5E Qualification Run')]] };
workflow.connections['Append Phase 5E Qualification Run'] = { main: [[conn('Phase 5E Complete')]] };
workflow.connections['Phase 5E Complete'] = { main: [[]] };
fs.writeFileSync(workflowPath, `${JSON.stringify(Array.isArray(parsed) ? [workflow] : workflow, null, 2)}\n`);
