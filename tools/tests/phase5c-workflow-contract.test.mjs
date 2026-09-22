import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = new URL('.././n8n/terra-space-phase5-workflow.json', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
const byId = new Map(workflow.nodes.map((node) => [node.id, node]));

function destinations(name, output = 0) {
  return (workflow.connections[name]?.main?.[output] ?? []).map((connection) => connection.node);
}

test('Phase 5 remains one inactive owner-controlled workflow', () => {
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger').length, 1);
  const webhooks = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.webhook');
  assert.equal(webhooks.length, 1);
  assert.equal(webhooks[0].parameters.path, 'terra-space-phase5-mcp-run');
});

test('Phase 5C is connected after Phase 5B and hands off the pending batch once', () => {
  assert.deepEqual(destinations('Process One Phase 5B Event at a Time', 0), ['Phase 5B Complete']);
  assert.deepEqual(destinations('Phase 5B Complete'), ['Get Pending Phase 5C Events']);
  assert.deepEqual(destinations('Get Pending Phase 5C Events'), ['Any Pending Phase 5C Events?']);
  assert.deepEqual(destinations('Any Pending Phase 5C Events?', 0), ['Prepare Phase 5C Timeline and Geography']);
  assert.deepEqual(destinations('Append Phase 5C Timeline Geography Run'), ['Phase 5C Complete']);
  assert.equal(byId.has('p5c_loop'), false);
  assert.equal(byId.has('p5c_suggestion_loop'), false);
});

test('Phase 5C reads its pending view and preserves conservative unresolved suggestions', () => {
  assert.equal(byId.get('p5c_get_pending')?.parameters.tableId, '=terra_space_phase5_pending_timeline_geographies');
  const pilotFilter = byId.get('p5c_get_pending')?.parameters.filterString ?? '';
  assert.equal(pilotFilter, '');
  const transform = byId.get('p5c_prepare')?.parameters.jsCode ?? '';
  assert.match(transform, /prepareTimeline/);
  assert.match(transform, /resolveEventGeographies/);
  assert.match(transform, /resolveActorGeographies/);
  assert.match(transform, /SYSTEM_UNRESOLVED/);
  assert.match(transform, /NO_APPROVED_GEOGRAPHIC_REFERENCE/);
  assert.doesNotMatch(transform, /fetch\s*\(|axios|require\s*\(/i);
});

test('Phase 5C suggestion, latest, and history writes target only Phase 5C tables', () => {
  assert.equal(byId.get('p5c_create_suggestion')?.parameters.tableId, '=terra_space_phase5_reference_suggestions');
  assert.equal(byId.get('p5c_create_latest')?.parameters.tableId, '=terra_space_phase5_timeline_geographies');
  assert.equal(byId.get('p5c_update_latest')?.parameters.tableId, '=terra_space_phase5_timeline_geographies');
  assert.equal(byId.get('p5c_append_run')?.parameters.tableId, '=terra_space_phase5_timeline_geography_runs');
  const suggestionFields = byId.get('p5c_create_suggestion')?.parameters.fieldsUi.fieldValues ?? [];
  assert.ok(suggestionFields.every((field) => field.fieldValue.includes('$json.')));
});

test('Phase 5C batch-deduplicates and writes suggestions without a collapsing lookup', () => {
  assert.deepEqual(destinations('Prepare Phase 5C Timeline and Geography'), ['Has Existing Phase 5C Result?', 'Prepare Phase 5C Suggestions']);
  assert.deepEqual(destinations('Prepare Phase 5C Suggestions'), ['Create Phase 5C Reference Suggestion']);
  assert.deepEqual(destinations('Create Phase 5C Reference Suggestion'), []);
  assert.equal(byId.has('p5c_has_suggestion'), false);
  assert.equal(byId.has('p5c_find_suggestion'), false);
  assert.equal(byId.has('p5c_suggestion_exists'), false);
  const suggestionCode = byId.get('p5c_prepare_suggestions')?.parameters.jsCode ?? '';
  assert.match(suggestionCode, /new Set/);
  assert.match(suggestionCode, /suggestion_kind.*normalized_input/s);
  assert.deepEqual(destinations('Has Existing Phase 5C Result?', 0), ['Update Failed Phase 5C Result']);
  assert.deepEqual(destinations('Has Existing Phase 5C Result?', 1), ['Create Phase 5C Result']);
  assert.deepEqual(destinations('Update Failed Phase 5C Result'), ['Append Phase 5C Timeline Geography Run']);
  assert.deepEqual(destinations('Create Phase 5C Result'), ['Append Phase 5C Timeline Geography Run']);
});

test('Phase 5C has no model call and hands off to the separately bounded Phase 5E branch', () => {
  const phase5cNodes = workflow.nodes.filter((node) => node.id.startsWith('p5c_'));
  assert.equal(phase5cNodes.length, 10);
  assert.equal(phase5cNodes.some((node) => node.type === 'n8n-nodes-base.httpRequest'), false);
  assert.ok(workflow.nodes.some((node) => /^p5e_/.test(node.id)));
});

test('Phase 5A and Phase 5B nodes retain their established counts', () => {
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5a_')).length, 9);
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5b_')).length, 20);
});
