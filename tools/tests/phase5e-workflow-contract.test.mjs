import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('.././n8n/terra-space-phase5-workflow.json', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
const byId = new Map(workflow.nodes.map((node) => [node.id, node]));
const destinations = (name, output = 0) => (workflow.connections[name]?.main?.[output] ?? []).map((edge) => edge.node);

test('Phase 5E stays in the existing inactive workflow without a model, merge, or publish path', () => {
  assert.equal(workflow.name, 'Terra Space - Phase 5 - Generate and Qualify Events');
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger').length, 1);
  assert.equal(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.webhook').length, 1);
  const phase5eNodes = workflow.nodes.filter((node) => node.id.startsWith('p5e_'));
  assert.ok(phase5eNodes.length > 0);
  assert.equal(phase5eNodes.some((node) => node.type === 'n8n-nodes-base.httpRequest'), false);
  assert.equal(phase5eNodes.some((node) => /merge|publish/i.test(node.name)), false);
});

test('Phase 5A through 5D remain present and Phase 5D hands off once to Phase 5E', () => {
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5a_')).length, 9);
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5b_')).length, 20);
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5c_')).length, 10);
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5d_')).length, 13);
  assert.deepEqual(destinations('Phase 5D Complete'), ['Get Phase 5E Event Records']);
});

test('Phase 5E reads only retained source snapshots and its own latest/history tables', () => {
  const expected = {
    p5e_get_events: '=terra_space_phase5_event_records',
    p5e_get_phase3: '=terra_space_phase3_event_candidates',
    p5e_get_classifications: '=terra_space_phase5_event_type_classifications',
    p5e_get_types: '=terra_space_phase5_event_types',
    p5e_get_timelines: '=terra_space_phase5_timeline_geographies',
    p5e_get_latest: '=terra_space_phase5_event_qualifications',
    p5e_get_history: '=terra_space_phase5_event_qualification_runs',
  };
  for (const [id, tableId] of Object.entries(expected)) {
    assert.equal(byId.get(id)?.parameters.tableId, tableId, id);
    assert.equal(byId.get(id)?.parameters.operation, 'getAll', id);
  }
});

test('Phase 5E deterministically qualifies then writes only its latest and append-only history tables', () => {
  const code = byId.get('p5e_prepare')?.parameters.jsCode ?? '';
  assert.match(code, /qualifyEvent/);
  assert.match(code, /phase3_event_candidate_result_id/);
  assert.match(code, /event_type_is_active/);
  assert.doesNotMatch(code, /fetch\s*\(|axios|lm.?studio|require\s*\(/i);
  assert.equal(byId.get('p5e_create_latest')?.parameters.tableId, '=terra_space_phase5_event_qualifications');
  assert.equal(byId.get('p5e_update_latest')?.parameters.tableId, '=terra_space_phase5_event_qualifications');
  assert.equal(byId.get('p5e_append_run')?.parameters.tableId, '=terra_space_phase5_event_qualification_runs');
  assert.deepEqual(destinations('Prepare Phase 5E Qualifications'), ['Has Existing Phase 5E Qualification?']);
  assert.deepEqual(destinations('Has Existing Phase 5E Qualification?', 0), ['Update Phase 5E Qualification']);
  assert.deepEqual(destinations('Has Existing Phase 5E Qualification?', 1), ['Create Phase 5E Qualification']);
  assert.deepEqual(destinations('Update Phase 5E Qualification'), ['Append Phase 5E Qualification Run']);
  assert.deepEqual(destinations('Create Phase 5E Qualification'), ['Append Phase 5E Qualification Run']);
  assert.deepEqual(destinations('Append Phase 5E Qualification Run'), ['Phase 5E Complete']);
});
