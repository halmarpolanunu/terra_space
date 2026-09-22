import fs from 'node:fs';

const workflowPath = new URL('./n8n/terra-space-phase5-workflow.json', import.meta.url);
const transformerPath = new URL('./n8n/phase5c-timeline-geography.mjs', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;

if (workflow.id && workflow.id !== 'FAxBx6a9fnXjLfVO') throw new Error('Unexpected Phase 5 workflow identity.');
if (workflow.name !== 'Terra Space - Phase 5 - Generate and Qualify Events') throw new Error('Unexpected Phase 5 workflow name.');
const credential = workflow.nodes.find((node) => node.id === 'p5a_get_pending')?.credentials;
workflow.nodes = workflow.nodes.filter((node) => !node.id.startsWith('p5c_'));
workflow.nodes = workflow.nodes.filter((node) => !['p5b_has_pending_gate', 'p5b_complete'].includes(node.id));
const phase5bPending = workflow.nodes.find((node) => node.id === 'p5b_get_pending');
if (!phase5bPending) throw new Error('Phase 5B pending-read node is missing.');
phase5bPending.alwaysOutputData = true;
workflow.nodes.push(
  { id: 'p5b_has_pending_gate', name: 'Any Pending Phase 5B Events?', type: 'n8n-nodes-base.if', typeVersion: 2.3, position: [2352, 256], parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ id: 'p5b-pending-row-present', leftValue: '={{ $json.phase5_event_record_id }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } }], combinator: 'and' }, options: {} }, notes: 'Routes real pending Phase 5B rows to classification and an empty control item to the Phase 5C handoff.' },
  { id: 'p5b_complete', name: 'Phase 5B Complete', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [6048, 48], parameters: {}, notes: 'Single safe handoff into Phase 5C after completing Phase 5B rows or confirming the Phase 5B queue is empty.' },
);
for (const name of Object.keys(workflow.connections)) {
  if (name.includes('Phase 5C')) delete workflow.connections[name];
}
workflow.nodeGroups = (workflow.nodeGroups ?? []).filter((group) => group.name !== 'Phase 5C — Timeline and Geography');

let transformer = fs.readFileSync(transformerPath, 'utf8')
  .replaceAll('export function ', 'function ')
  .replace('const snapshot = structuredClone(input);', 'const snapshot = JSON.parse(JSON.stringify(input));');
transformer += `\n\nreturn $input.all().map(item => {\n  const result = buildPhase5cResult(item.json);\n  return { json: {\n    ...result,\n    existing_phase5c_result_id: item.json.existing_phase5c_result_id ?? null,\n    existing_phase5c_status: item.json.existing_phase5c_status ?? null,\n  }};\n});`;

const resultFields = [
  'phase5_event_record_id', 'phase5b_classification_id', 'event_date',
  'event_date_precision', 'timeline_sort_date', 'timeline_reference_date',
  'timeline_reference_basis', 'event_geographies', 'actor_geographies',
  'event_geography_status', 'actor_geography_status', 'phase5c_status',
  'limitation_reasons', 'error_message', 'processed_at',
];
const suggestionFields = [
  'suggestion_kind', 'normalized_input', 'display_input', 'proposed_canonical_name',
  'proposed_relationship_type', 'proposed_geographic_reference_id',
  'proposed_actor_reference_id', 'suggestion_source', 'model_name', 'prompt_version',
  'suggestion_reason', 'supporting_occurrences', 'raw_output', 'review_status',
];
const fields = (prefix, names) => ({
  fieldValues: names.map((name) => ({
    fieldId: name,
    fieldValue: `={{ $('Prepare Phase 5C Timeline and Geography').item.json.${prefix}.${name} }}`,
  })),
});
const boolIf = (id, expression) => ({
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
    conditions: [{
      id, leftValue: expression, rightValue: true,
      operator: { type: 'boolean', operation: 'true', singleValue: true },
    }],
    combinator: 'and',
  },
  options: {},
});

const phase5cNodes = [
  {
    id: 'p5c_get_pending', name: 'Get Pending Phase 5C Events', type: 'n8n-nodes-base.supabase',
    typeVersion: 1, position: [6272, 48], credentials: credential,
    parameters: { operation: 'getAll', tableId: '=terra_space_phase5_pending_timeline_geographies', returnAll: true, orderBy: 'sequence_id.asc,candidate_id.asc', filterType: 'string', filterString: '' },
    notes: 'Reads all eligible Phase 5C inputs, including approved references and existing unresolved suggestions. No upstream record is changed.',
  },
  { id: 'p5c_prepare', name: 'Prepare Phase 5C Timeline and Geography', type: 'n8n-nodes-base.code', typeVersion: 2, position: [6720, 160], parameters: { jsCode: transformer }, notes: 'Pure deterministic Phase 5C transformer. Uses only approved references; unresolved names stay visible and never receive invented coordinates.' },
  { id: 'p5c_prepare_suggestions', name: 'Prepare Phase 5C Suggestions', type: 'n8n-nodes-base.code', typeVersion: 2, position: [6944, 272], parameters: { jsCode: "const seen = new Set();\nreturn $input.all().flatMap(item => item.json.newSuggestions ?? []).filter(row => {\n  const key = `${row.suggestion_kind}:${row.normalized_input}`;\n  if (seen.has(key)) return false;\n  seen.add(key);\n  return true;\n}).map(row => ({ json: row }));" }, notes: 'Flattens and batch-deduplicates new SYSTEM_UNRESOLVED suggestions. The input snapshot already excludes existing open suggestions. No model call is used.' },
  { id: 'p5c_create_suggestion', name: 'Create Phase 5C Reference Suggestion', type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [7392, 304], credentials: credential, parameters: { tableId: '=terra_space_phase5_reference_suggestions', fieldsUi: { fieldValues: suggestionFields.map((name) => ({ fieldId: name, fieldValue: `={{ $json.${name} }}` })) } }, notes: 'Creates batch-deduplicated PENDING_REVIEW suggestions only. It never creates an approved reference or coordinate.' },
  { id: 'p5c_existing_failed', name: 'Has Existing Phase 5C Result?', type: 'n8n-nodes-base.if', typeVersion: 2.3, position: [7392, -16], parameters: boolIf('p5c-existing-failed', "={{ $('Prepare Phase 5C Timeline and Geography').item.json.existing_phase5c_result_id !== null }}"), notes: 'Only a retryable existing Phase 5C result is updated; first attempts create a row.' },
  { id: 'p5c_update_latest', name: 'Update Failed Phase 5C Result', type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [7616, -80], credentials: credential, parameters: { operation: 'update', tableId: '=terra_space_phase5_timeline_geographies', filterType: 'string', filterString: "={{ 'id=eq.' + $('Prepare Phase 5C Timeline and Geography').item.json.existing_phase5c_result_id }}", fieldsUi: fields('latest', resultFields) }, notes: 'Updates only the exact pending-view result identity. No delete or replacement of other rows.' },
  { id: 'p5c_create_latest', name: 'Create Phase 5C Result', type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [7616, 64], credentials: credential, parameters: { tableId: '=terra_space_phase5_timeline_geographies', fieldsUi: fields('latest', resultFields) }, notes: 'Creates one latest Phase 5C timeline/geography result.' },
  { id: 'p5c_append_run', name: 'Append Phase 5C Timeline Geography Run', type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [7840, -16], credentials: credential, parameters: { tableId: '=terra_space_phase5_timeline_geography_runs', fieldsUi: fields('history', ['submission_key', ...resultFields]) }, notes: 'Appends one immutable Phase 5C history snapshot for each prepared event.' },
];

workflow.nodes.push(...phase5cNodes);
workflow.connections['Get Pending Phase 5B Events'] = { main: [[{ node: 'Any Pending Phase 5B Events?', type: 'main', index: 0 }]] };
workflow.connections['Any Pending Phase 5B Events?'] = { main: [[{ node: 'Get Active Event Types', type: 'main', index: 0 }], [{ node: 'Phase 5B Complete', type: 'main', index: 0 }]] };
workflow.connections['Process One Phase 5B Event at a Time'].main[0] = [{ node: 'Phase 5B Complete', type: 'main', index: 0 }];
workflow.connections['Phase 5B Complete'] = { main: [[{ node: 'Get Pending Phase 5C Events', type: 'main', index: 0 }]] };
Object.assign(workflow.connections, {
  'Get Pending Phase 5C Events': { main: [[{ node: 'Prepare Phase 5C Timeline and Geography', type: 'main', index: 0 }]] },
  'Prepare Phase 5C Timeline and Geography': { main: [[{ node: 'Has Existing Phase 5C Result?', type: 'main', index: 0 }, { node: 'Prepare Phase 5C Suggestions', type: 'main', index: 0 }]] },
  'Prepare Phase 5C Suggestions': { main: [[{ node: 'Create Phase 5C Reference Suggestion', type: 'main', index: 0 }]] },
  'Has Existing Phase 5C Result?': { main: [[{ node: 'Update Failed Phase 5C Result', type: 'main', index: 0 }], [{ node: 'Create Phase 5C Result', type: 'main', index: 0 }]] },
  'Update Failed Phase 5C Result': { main: [[{ node: 'Append Phase 5C Timeline Geography Run', type: 'main', index: 0 }]] },
  'Create Phase 5C Result': { main: [[{ node: 'Append Phase 5C Timeline Geography Run', type: 'main', index: 0 }]] },
  'Append Phase 5C Timeline Geography Run': { main: [[]] },
});
workflow.nodeGroups = [...(workflow.nodeGroups ?? []), {
  id: 'da4ddc23-0703-4b1a-a03a-d1f1af402dcb',
  name: 'Phase 5C — Timeline and Geography',
  nodeIds: phase5cNodes.map((node) => node.id),
  description: 'Approved-reference-only timeline and geography preparation with visible unresolved cases and no publishing.',
}];
const phase5bGroup = workflow.nodeGroups.find((group) => group.name === 'Phase 5B — Event Type Classification');
if (phase5bGroup) {
  phase5bGroup.nodeIds = ['p5b_get_pending', 'p5b_has_pending_gate', 'p5b_get_types', 'p5b_loop', 'p5b_prepare_attempt', 'p5b_build_classifier', 'p5b_classify', 'p5b_parse_classifier', 'p5b_classification_parsed', 'p5b_build_safeguard', 'p5b_safeguard', 'p5b_apply_safeguard', 'p5b_retry', 'p5b_existing_failed', 'p5b_update_latest', 'p5b_create_latest', 'p5b_append_run', 'p5b_has_proposal', 'p5b_create_proposal', 'p5b_complete'];
  phase5bGroup.description = 'Bounded local classification with a safe empty-queue handoff, conservative Unclassified fallback, and no publishing.';
}
workflow.active = false;

fs.writeFileSync(workflowPath, `${JSON.stringify(Array.isArray(parsed) ? [workflow] : workflow, null, 2)}\n`);
