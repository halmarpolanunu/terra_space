import fs from 'node:fs';

const workflowPath = new URL('./n8n/terra-space-phase5-workflow.json', import.meta.url);
const matcherPath = new URL('./n8n/phase5d-deterministic-duplicates.mjs', import.meta.url);
const adapterPath = new URL('./n8n/phase5d-workflow-prepare.mjs', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;

if (workflow.name !== 'Terra Space - Phase 5 - Generate and Qualify Events' || workflow.active !== false) {
  throw new Error('Unexpected Phase 5 workflow identity or activation state.');
}
workflow.nodes = workflow.nodes.filter((node) => !node.id.startsWith('p5d_')
  && !['p5c_has_pending_gate', 'p5c_complete'].includes(node.id));
const credential = workflow.nodes.find((node) => node.id === 'p5a_get_pending')?.credentials;
// The saved workflow backup is deliberately credential-free. The live edit reuses the existing credential.

const matcher = fs.readFileSync(matcherPath, 'utf8').replaceAll('export function ', 'function ');
const adapter = fs.readFileSync(adapterPath, 'utf8')
  .replace("import { evaluateDuplicates } from './phase5d-deterministic-duplicates.mjs';", '')
  .replaceAll('export function ', 'function ');
const prepareCode = `${matcher}\n${adapter}\nreturn preparePhase5DItems(
  $('Get Phase 5D Event Records').all().map(item => item.json),
  $('Get Phase 5D Timeline Results').all().map(item => item.json),
  $('Get Existing Phase 5D Recommendations').all().map(item => item.json),
  $('Get Phase 5D Recommendation History').all().map(item => item.json),
).map(json => ({ json }));`;

function connection(target) {
  return { node: target, type: 'main', index: 0 };
}
function supabaseRead(id, name, tableId, x) {
  return {
    id, name, type: 'n8n-nodes-base.supabase', typeVersion: 1,
    position: [x, 16], credentials: credential, alwaysOutputData: true,
    parameters: { operation: 'getAll', tableId: `=${tableId}`, returnAll: true },
    notes: 'Read-only Phase 5D input. Empty results emit one control item so the next stage can finish safely.',
  };
}
function control(id, name, x) {
  return {
    id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, 16],
    parameters: { jsCode: "return [{ json: { phase5d_control: true } }];" },
    notes: 'Collapses a multi-item read to one control item, preventing repeated downstream database reads.',
  };
}
function ifNode(id, name, condition, x) {
  return {
    id, name, type: 'n8n-nodes-base.if', typeVersion: 2.3, position: [x, 16],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
        conditions: [{ id: `${id}-condition`, leftValue: condition, rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
      options: {},
    },
  };
}
const fields = (names) => ({
  fieldValues: names.map((name) => ({
    fieldId: name,
    fieldValue: `={{ $('Prepare Phase 5D Recommendations').item.json.${name} }}`,
  })),
});
const recommendationFields = [
  'event_record_id_a', 'event_record_id_b', 'event_date', 'rule_version',
  'status', 'title_overlap_score', 'shared_title_tokens', 'shared_actor_names',
  'shared_geographic_reference_ids', 'reason_codes', 'submission_key',
];

const phase5dNodes = [
  supabaseRead('p5d_get_events', 'Get Phase 5D Event Records', 'terra_space_phase5_event_records', 8528),
  control('p5d_after_events', 'Continue After Phase 5D Event Read', 8752),
  supabaseRead('p5d_get_timelines', 'Get Phase 5D Timeline Results', 'terra_space_phase5_timeline_geographies', 8976),
  control('p5d_after_timelines', 'Continue After Phase 5D Timeline Read', 9200),
  supabaseRead('p5d_get_latest', 'Get Existing Phase 5D Recommendations', 'terra_space_phase5_duplicate_recommendations', 9424),
  control('p5d_after_latest', 'Continue After Phase 5D Latest Read', 9648),
  supabaseRead('p5d_get_history', 'Get Phase 5D Recommendation History', 'terra_space_phase5_duplicate_recommendation_runs', 9872),
  {
    id: 'p5d_prepare', name: 'Prepare Phase 5D Recommendations', type: 'n8n-nodes-base.code',
    typeVersion: 2, position: [10096, 16], parameters: { jsCode: prepareCode },
    notes: 'Strict deterministic comparison of actual exact dates, action-title overlap, and specific retained subjects. Emits a control item when no pair qualifies. No model or external call.',
  },
  ifNode('p5d_has_work', 'Any Phase 5D Writes?', "={{ $json.action !== 'none' }}", 10320),
  ifNode('p5d_is_create', 'New Phase 5D Pair?', "={{ $json.action === 'create' }}", 10544),
  {
    id: 'p5d_create_latest', name: 'Create Phase 5D Recommendation', type: 'n8n-nodes-base.supabase',
    typeVersion: 1, position: [10768, -64], credentials: credential,
    parameters: { tableId: '=terra_space_phase5_duplicate_recommendations', fieldsUi: fields(recommendationFields) },
    notes: 'Creates only a new latest possible-duplicate recommendation. Existing pairs are skipped or repaired without creating a second latest row.',
  },
  {
    id: 'p5d_append_run', name: 'Append Phase 5D Recommendation Run', type: 'n8n-nodes-base.supabase',
    typeVersion: 1, position: [10992, 16], credentials: credential,
    parameters: { tableId: '=terra_space_phase5_duplicate_recommendation_runs', fieldsUi: fields(recommendationFields) },
    notes: 'Appends immutable history for a new recommendation or repairs a missing history row with the saved submission key.',
  },
  { id: 'p5d_complete', name: 'Phase 5D Complete', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [11216, 16], parameters: {}, notes: 'Review stop. No merge, hiding, reclassification, publishing, or Phase 5E execution.' },
];

const phase5cPending = workflow.nodes.find((node) => node.id === 'p5c_get_pending');
if (!phase5cPending) throw new Error('Phase 5C pending-read node is missing.');
phase5cPending.alwaysOutputData = true;
workflow.nodes.push(
  ifNode('p5c_has_pending_gate', 'Any Pending Phase 5C Events?', "={{ Boolean($json.phase5_event_record_id) }}", 6496),
  {
    id: 'p5c_complete', name: 'Phase 5C Complete', type: 'n8n-nodes-base.code',
    typeVersion: 2, position: [8272, 16], parameters: { jsCode: "return [{ json: { phase5c_complete: true } }];" },
    notes: 'One control item after either an empty Phase 5C queue or the completed Phase 5C batch. Handoff to Phase 5D once.',
  },
  ...phase5dNodes,
);

workflow.connections['Get Pending Phase 5C Events'] = { main: [[connection('Any Pending Phase 5C Events?')]] };
workflow.connections['Any Pending Phase 5C Events?'] = { main: [[connection('Prepare Phase 5C Timeline and Geography')], [connection('Phase 5C Complete')]] };
workflow.connections['Append Phase 5C Timeline Geography Run'] = { main: [[connection('Phase 5C Complete')]] };
const linear = [
  'Phase 5C Complete', 'Get Phase 5D Event Records', 'Continue After Phase 5D Event Read',
  'Get Phase 5D Timeline Results', 'Continue After Phase 5D Timeline Read',
  'Get Existing Phase 5D Recommendations', 'Continue After Phase 5D Latest Read',
  'Get Phase 5D Recommendation History', 'Prepare Phase 5D Recommendations',
  'Any Phase 5D Writes?',
];
for (let i = 0; i < linear.length - 1; i += 1) {
  workflow.connections[linear[i]] = { main: [[connection(linear[i + 1])]] };
}
workflow.connections['Any Phase 5D Writes?'] = { main: [[connection('New Phase 5D Pair?')], [connection('Phase 5D Complete')]] };
workflow.connections['New Phase 5D Pair?'] = { main: [[connection('Create Phase 5D Recommendation')], [connection('Append Phase 5D Recommendation Run')]] };
workflow.connections['Create Phase 5D Recommendation'] = { main: [[connection('Append Phase 5D Recommendation Run')]] };
workflow.connections['Append Phase 5D Recommendation Run'] = { main: [[connection('Phase 5D Complete')]] };
workflow.connections['Phase 5D Complete'] = { main: [[]] };
workflow.active = false;

fs.writeFileSync(workflowPath, `${JSON.stringify(Array.isArray(parsed) ? [workflow] : workflow, null, 2)}\n`);
