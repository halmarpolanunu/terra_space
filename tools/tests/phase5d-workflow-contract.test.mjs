import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('.././n8n/terra-space-phase5-workflow.json', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
const byId = new Map(workflow.nodes.map((node) => [node.id, node]));
const destinations = (name, output = 0) => (workflow.connections[name]?.main?.[output] ?? []).map((edge) => edge.node);

test('Phase 5D stays in the existing inactive one-trigger-pair workflow', () => {
  assert.equal(workflow.name, 'Terra Space - Phase 5 - Generate and Qualify Events');
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger').length, 1);
  assert.equal(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.webhook').length, 1);
  assert.ok(workflow.nodes.some((node) => node.id.startsWith('p5e_')));
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5d_') && node.type === 'n8n-nodes-base.httpRequest').length, 0);
});

test('an empty Phase 5C queue and a completed Phase 5C batch each hand off once', () => {
  assert.equal(byId.get('p5c_get_pending')?.alwaysOutputData, true);
  assert.deepEqual(destinations('Get Pending Phase 5C Events'), ['Any Pending Phase 5C Events?']);
  assert.deepEqual(destinations('Any Pending Phase 5C Events?', 0), ['Prepare Phase 5C Timeline and Geography']);
  assert.deepEqual(destinations('Any Pending Phase 5C Events?', 1), ['Phase 5C Complete']);
  assert.deepEqual(destinations('Append Phase 5C Timeline Geography Run'), ['Phase 5C Complete']);
  assert.deepEqual(destinations('Phase 5C Complete'), ['Get Phase 5D Event Records']);
});

test('Phase 5D reads existing Phase 5A and 5C results and its own history exactly once', () => {
  assert.equal(byId.get('p5d_get_events')?.parameters.tableId, '=terra_space_phase5_event_records');
  assert.equal(byId.get('p5d_get_timelines')?.parameters.tableId, '=terra_space_phase5_timeline_geographies');
  assert.equal(byId.get('p5d_get_latest')?.parameters.tableId, '=terra_space_phase5_duplicate_recommendations');
  assert.equal(byId.get('p5d_get_history')?.parameters.tableId, '=terra_space_phase5_duplicate_recommendation_runs');
  assert.deepEqual(destinations('Get Phase 5D Event Records'), ['Continue After Phase 5D Event Read']);
  assert.deepEqual(destinations('Continue After Phase 5D Event Read'), ['Get Phase 5D Timeline Results']);
  assert.deepEqual(destinations('Get Phase 5D Timeline Results'), ['Continue After Phase 5D Timeline Read']);
  assert.deepEqual(destinations('Continue After Phase 5D Timeline Read'), ['Get Existing Phase 5D Recommendations']);
  assert.deepEqual(destinations('Get Existing Phase 5D Recommendations'), ['Continue After Phase 5D Latest Read']);
  assert.deepEqual(destinations('Continue After Phase 5D Latest Read'), ['Get Phase 5D Recommendation History']);
  assert.deepEqual(destinations('Get Phase 5D Recommendation History'), ['Prepare Phase 5D Recommendations']);
});

test('only new possible duplicates write latest and history; empty output skips writes', () => {
  assert.deepEqual(destinations('Prepare Phase 5D Recommendations'), ['Any Phase 5D Writes?']);
  assert.deepEqual(destinations('Any Phase 5D Writes?', 0), ['New Phase 5D Pair?']);
  assert.deepEqual(destinations('Any Phase 5D Writes?', 1), ['Phase 5D Complete']);
  assert.deepEqual(destinations('New Phase 5D Pair?', 0), ['Create Phase 5D Recommendation']);
  assert.deepEqual(destinations('New Phase 5D Pair?', 1), ['Append Phase 5D Recommendation Run']);
  assert.deepEqual(destinations('Create Phase 5D Recommendation'), ['Append Phase 5D Recommendation Run']);
  assert.equal(byId.get('p5d_create_latest')?.parameters.tableId, '=terra_space_phase5_duplicate_recommendations');
  assert.equal(byId.get('p5d_append_run')?.parameters.tableId, '=terra_space_phase5_duplicate_recommendation_runs');
  assert.equal(workflow.nodes.filter((node) => node.id.startsWith('p5d_') && node.type === 'n8n-nodes-base.supabase').some((node) => node.parameters.operation === 'delete'), false);
});

test('embedded matcher uses exact dates and emits a safe control item for zero matches', () => {
  const jsCode = byId.get('p5d_prepare')?.parameters.jsCode ?? '';
  assert.match(jsCode, /event_date_precision !== 'exact'/);
  assert.match(jsCode, /evaluateDuplicates/);
  assert.match(jsCode, /return \[\{ action: 'none'/);
  assert.doesNotMatch(jsCode, /require\s*\(|fetch\s*\(|axios|lm.?studio/i);
});

test('the actual embedded Code node runs with n8n-style inputs', () => {
  const jsCode = byId.get('p5d_prepare').parameters.jsCode;
  const eventRows = [
    { id: '9741ac49-b6bf-420a-a74e-7c623a87075e', candidate_title: 'Explosives found near German power plant', facts: { actors: [{ name: 'German police', role: 'source' }] } },
    { id: '6fcb6ff4-f736-4abc-a001-42ea8eb07546', candidate_title: 'German power plant explosives found near', facts: { actors: [{ name: 'German police', role: 'source' }] } },
  ];
  const timelines = eventRows.map((row) => ({
    phase5_event_record_id: row.id, event_date: '2026-09-01', event_date_precision: 'exact',
    event_geographies: [], phase5c_status: 'PREPARED',
  }));
  const rows = new Map([
    ['Get Phase 5D Event Records', eventRows],
    ['Get Phase 5D Timeline Results', timelines],
    ['Get Existing Phase 5D Recommendations', [{}]],
    ['Get Phase 5D Recommendation History', [{}]],
  ]);
  const run = new Function('$', jsCode);
  const result = run((name) => ({ all: () => rows.get(name).map((json) => ({ json })) }));
  assert.equal(result.length, 1);
  assert.equal(result[0].json.action, 'create');
  assert.equal(result[0].json.event_record_id_a, '6fcb6ff4-f736-4abc-a001-42ea8eb07546');
  assert.equal(result[0].json.event_record_id_b, '9741ac49-b6bf-420a-a74e-7c623a87075e');
});

test('permanent Phase 5D code has no temporary pilot filter', () => {
  const jsCode = byId.get('p5d_prepare').parameters.jsCode;
  assert.doesNotMatch(jsCode, /phase5dPilotIds/);
  const pilotIds = [
    '6fcb6ff4-f736-4abc-a001-42ea8eb07546',
    '9741ac49-b6bf-420a-a74e-7c623a87075e',
    '5ae66332-1c91-4b65-8414-ddacdc6b4d95',
    'afa66841-aba1-4dd8-9c67-c018751e4182',
    'ec658562-9c04-4d14-9109-beb8784eb5de',
    '90f15f70-6e6a-4ca1-b20e-4d1c61fe5767',
    'a6ed9943-6494-4aef-841c-315ad8f4c2c8',
    '00213754-1301-4a9f-9676-b1c78d3b33d1',
  ];
  const rows = new Map([
    ['Get Phase 5D Event Records', [...pilotIds, 'ffffffff-ffff-4fff-8fff-ffffffffffff'].map((id) => ({ id, candidate_title: 'Unrelated event', facts: { actors: [] } }))],
    ['Get Phase 5D Timeline Results', [...pilotIds, 'ffffffff-ffff-4fff-8fff-ffffffffffff'].map((id) => ({ phase5_event_record_id: id, event_date: null, event_date_precision: 'unknown', event_geographies: [], phase5c_status: 'PREPARED' }))],
    ['Get Existing Phase 5D Recommendations', [{}]],
    ['Get Phase 5D Recommendation History', [{}]],
  ]);
  const output = new Function('$', jsCode)((name) => ({ all: () => rows.get(name).map((json) => ({ json })) }));
  assert.equal(output[0].json.action, 'none');
  assert.equal(output[0].json.summary.events_considered, 9);
});
