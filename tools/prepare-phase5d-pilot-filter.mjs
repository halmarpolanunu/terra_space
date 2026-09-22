import fs from 'node:fs';

const workflowPath = new URL('../.n8n-backups/20260910/terra-space-phase5-generate-and-qualify-events.json', import.meta.url);
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
const node = workflow.nodes.find((item) => item.id === 'p5d_prepare');
if (!node || workflow.active !== false) throw new Error('Expected inactive Phase 5D workflow backup.');

const original = "return preparePhase5DItems(\n  $('Get Phase 5D Event Records').all().map(item => item.json),";
if (!node.parameters.jsCode.includes(original) || node.parameters.jsCode.includes('phase5dPilotIds')) {
  throw new Error('Phase 5D pilot insertion point is missing or the filter already exists.');
}

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
node.parameters.jsCode = node.parameters.jsCode.replace(
  original,
  `const phase5dPilotIds = new Set(${JSON.stringify(pilotIds)});\nreturn preparePhase5DItems(\n  $('Get Phase 5D Event Records').all().map(item => item.json).filter(row => phase5dPilotIds.has(row.id)),`,
);
node.notes = `${node.notes} Temporary owner-approved eight-event pilot filter; remove only after separate full-run approval.`;

fs.writeFileSync(workflowPath, `${JSON.stringify(Array.isArray(parsed) ? [workflow] : workflow, null, 2)}\n`);
