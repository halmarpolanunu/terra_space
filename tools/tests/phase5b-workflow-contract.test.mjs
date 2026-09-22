import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const backupPath = new URL(
  '.././n8n/terra-space-phase5-workflow.json',
  import.meta.url,
);

async function loadWorkflow() {
  return JSON.parse(await readFile(backupPath, 'utf8'));
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  assert.ok(node, `Missing workflow node: ${name}`);
  return node;
}

function destinations(workflow, source, output = 0) {
  return (workflow.connections[source]?.main?.[output] ?? []).map(({node}) => node);
}

test('Phase 5B stays in the one inactive owner-started workflow', async () => {
  const workflow = await loadWorkflow();
  assert.equal(workflow.name, 'Terra Space - Phase 5 - Generate and Qualify Events');
  assert.equal(workflow.active, false);
  assert.equal(
    workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.manualTrigger').length,
    1,
  );
  assert.equal(workflow.nodes.some((node) => node.credentials), false);

  const mcpTrigger = nodeByName(workflow, 'MCP Run Trigger');
  assert.equal(mcpTrigger.type, 'n8n-nodes-base.webhook');
  assert.equal(
    mcpTrigger.parameters.responseMode,
    'lastNode',
    'The MCP trigger must wait for the run to finish before the workflow is deactivated',
  );

  const group = workflow.nodeGroups.find((candidate) => candidate.name === 'Phase 5B — Event Type Classification');
  assert.ok(group);
  assert.equal(group.nodeIds.length, 20);
});

test('Phase 5A completion enters one-at-a-time Phase 5B processing without a parallel trigger', async () => {
  const workflow = await loadWorkflow();
  assert.deepEqual(destinations(workflow, 'Process One Record at a Time', 0), [
    'Phase 5A Complete',
  ]);
  assert.deepEqual(destinations(workflow, 'Phase 5A Complete'), [
    'Get Pending Phase 5B Events',
  ]);
  assert.deepEqual(destinations(workflow, 'Get Pending Phase 5B Events'), [
    'Any Pending Phase 5B Events?',
  ]);
  assert.deepEqual(destinations(workflow, 'Any Pending Phase 5B Events?', 0), ['Get Active Event Types']);
  assert.deepEqual(destinations(workflow, 'Any Pending Phase 5B Events?', 1), ['Phase 5B Complete']);
  assert.deepEqual(destinations(workflow, 'Get Active Event Types'), [
    'Process One Phase 5B Event at a Time',
  ]);
  assert.equal(
    nodeByName(workflow, 'Process One Phase 5B Event at a Time').parameters.options?.batchSize ?? 1,
    1,
  );
});

test('an empty Phase 5B queue safely hands off to Phase 5C', async () => {
  const workflow = await loadWorkflow();
  assert.equal(nodeByName(workflow, 'Get Pending Phase 5B Events').alwaysOutputData, true);
  assert.deepEqual(destinations(workflow, 'Process One Phase 5B Event at a Time', 0), ['Phase 5B Complete']);
  assert.deepEqual(destinations(workflow, 'Phase 5B Complete'), ['Get Pending Phase 5C Events']);
});

test('an empty Phase 5A queue still emits the control item needed to start Phase 5B', async () => {
  const workflow = await loadWorkflow();
  const pendingPhase5A = nodeByName(workflow, 'Get Pending Phase 5A Records');

  assert.equal(
    pendingPhase5A.alwaysOutputData,
    true,
    'The Phase 5A read must emit one empty control item when no Phase 5A rows are pending',
  );
});

test('the empty Phase 5A control item bypasses Phase 5A writes and starts Phase 5B', async () => {
  const workflow = await loadWorkflow();
  const gateName = 'Any Pending Phase 5A Records?';
  const gate = nodeByName(workflow, gateName);

  assert.equal(gate.type, 'n8n-nodes-base.if');
  assert.deepEqual(destinations(workflow, 'Get Pending Phase 5A Records'), [gateName]);
  assert.deepEqual(destinations(workflow, gateName, 0), ['Process One Record at a Time']);
  assert.deepEqual(destinations(workflow, gateName, 1), ['Phase 5A Complete']);

  const phase5AGroup = workflow.nodeGroups.find(
    (candidate) => candidate.name === 'Phase 5A — Prepare Event Records',
  );
  assert.ok(phase5AGroup);
  assert.ok(phase5AGroup.nodeIds.includes(gate.id));
  assert.ok(phase5AGroup.nodeIds.includes(nodeByName(workflow, 'Phase 5A Complete').id));
});

test('both Phase 5B model calls are local, bounded, JSON-only, and transport-retryable', async () => {
  const workflow = await loadWorkflow();
  for (const name of ['Classify Event Type (LM Studio)', 'Safeguard Event Type (LM Studio)']) {
    const node = nodeByName(workflow, name);
    const classifier = name === 'Classify Event Type (LM Studio)';
    const formatField = classifier ? 'classifier_response_format' : 'safeguard_response_format';
    const builderName = classifier ? 'Build Classifier Prompt' : 'Build Safeguard Prompt';
    const builder = nodeByName(workflow, builderName);
    assert.equal(node.type, 'n8n-nodes-base.httpRequest');
    assert.equal(node.parameters.url, 'http://host.docker.internal:1234/v1/chat/completions');
    assert.equal(node.parameters.method, 'POST');
    assert.equal(node.parameters.sendBody, true);
    assert.equal(node.parameters.specifyBody, 'json');
    assert.match(node.parameters.jsonBody, /google\/gemma-4-12b-qat/);
    assert.match(node.parameters.jsonBody, /temperature:\s*0\.1/);
    assert.match(node.parameters.jsonBody, /reasoning_effort:\s*'none'/);
    assert.match(
      node.parameters.jsonBody,
      new RegExp(`response_format:\\s*\\$json\\.${formatField}`),
      `${name} must reference the schema prepared as normal workflow data`,
    );
    assert.match(builder.parameters.jsCode, new RegExp(formatField));
    assert.match(builder.parameters.jsCode, /json_schema/);
    if (classifier) {
      for (const field of ['selected_event_type', 'classification_reason', 'new_type_proposal']) {
        assert.match(builder.parameters.jsCode, new RegExp(field));
      }
      assert.match(builder.parameters.jsCode, /do not copy an evidence quote/i);
      assert.match(builder.parameters.jsCode, /workflow attaches.*evidence.*deterministically/i);
      assert.match(builder.parameters.jsCode, /remains Unclassified/i);
    } else {
      for (const field of ['decision', 'reason']) {
        assert.match(builder.parameters.jsCode, new RegExp(field));
      }
      assert.match(builder.parameters.jsCode, /valid_review_modes/);
      assert.match(builder.parameters.jsCode, /proposal is optional and permitted/i);
      assert.match(builder.parameters.jsCode, /must not be rejected merely because no active type was selected/i);
    }
    assert.equal(node.parameters.options.timeout, 180000);
    assert.equal(node.retryOnFail, true);
    assert.equal(node.maxTries, 2);
    assert.equal(node.onError, 'continueErrorOutput');
  }
});

test('Phase 5B records the repaired classifier and safeguard prompt versions', async () => {
  const workflow = await loadWorkflow();
  const preparer = nodeByName(workflow, 'Prepare Classification Attempt');

  assert.match(preparer.parameters.jsCode, /phase5b-event-type-classifier-v2/);
  assert.match(preparer.parameters.jsCode, /phase5b-event-type-safeguard-v2/);
});

test('workflow Code nodes use only clone operations available in the n8n task-runner sandbox', async () => {
  const workflow = await loadWorkflow();
  const codeNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code');

  for (const node of codeNodes) {
    assert.doesNotMatch(
      node.parameters.jsCode,
      /\bstructuredClone\s*\(/,
      `${node.name} uses structuredClone, which is unavailable in the n8n task-runner sandbox`,
    );
  }
});

test('classification, safeguard, retry, persistence, proposal, and loop paths are connected', async () => {
  const workflow = await loadWorkflow();
  const expected = [
    ['Prepare Classification Attempt', 'Build Classifier Prompt'],
    ['Build Classifier Prompt', 'Classify Event Type (LM Studio)'],
    ['Classify Event Type (LM Studio)', 'Parse Classifier Output'],
    ['Parse Classifier Output', 'Classification Parsed?'],
    ['Build Safeguard Prompt', 'Safeguard Event Type (LM Studio)'],
    ['Safeguard Event Type (LM Studio)', 'Apply Safeguard Decision'],
    ['Apply Safeguard Decision', 'Retry Classification?'],
    ['Update Failed Phase 5B Classification', 'Append Phase 5B Classification Run'],
    ['Create Phase 5B Classification', 'Append Phase 5B Classification Run'],
    ['Append Phase 5B Classification Run', 'Has Event Type Proposal?'],
    ['Create Phase 5B Event Type Proposal', 'Process One Phase 5B Event at a Time'],
  ];
  for (const [source, target] of expected) {
    assert.ok(destinations(workflow, source).includes(target), `${source} must connect to ${target}`);
  }

  assert.deepEqual(destinations(workflow, 'Retry Classification?', 0), ['Build Classifier Prompt']);
  assert.deepEqual(destinations(workflow, 'Retry Classification?', 1), ['Existing Failed Classification?']);
  assert.deepEqual(destinations(workflow, 'Classification Parsed?', 0), ['Build Safeguard Prompt']);
  assert.deepEqual(destinations(workflow, 'Classification Parsed?', 1), ['Existing Failed Classification?']);
  assert.deepEqual(destinations(workflow, 'Has Event Type Proposal?', 1), [
    'Process One Phase 5B Event at a Time',
  ]);
});

test('Phase 5B writes only its own latest, history, and proposal tables', async () => {
  const workflow = await loadWorkflow();
  const phase5bNodes = workflow.nodes.filter((node) => String(node.id).startsWith('p5b_'));
  const writeNodes = phase5bNodes.filter(
    (node) => node.type === 'n8n-nodes-base.supabase' && node.parameters.operation !== 'getAll',
  );
  assert.deepEqual(
    [...new Set(writeNodes.map((node) => String(node.parameters.tableId).replace(/^=/, '')))].sort(),
    [
      'terra_space_phase5_event_type_classification_runs',
      'terra_space_phase5_event_type_classifications',
      'terra_space_phase5_event_type_proposals',
    ],
  );
  assert.equal(
    phase5bNodes.some((node) => /phase\s*5[acde]|merge|publish|final event/i.test(node.name)),
    false,
  );
});

test('Phase 5B pending read is unrestricted after owner-approved pilot acceptance', async () => {
  const workflow = await loadWorkflow();
  const node = nodeByName(workflow, 'Get Pending Phase 5B Events');
  assert.equal(node.parameters.filterType, 'string');
  assert.equal(Object.hasOwn(node.parameters, 'filterString'), false);
});
