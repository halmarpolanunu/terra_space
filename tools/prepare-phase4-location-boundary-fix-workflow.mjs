import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, '.n8n-backups', 'phase4-before-boundary-fix.json');
const outputPath = path.join(root, '.n8n-backups', 'phase4-location-boundary-fix-import.json');
const workflows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const workflow = workflows[0];

if (workflow.id !== 'EqBqTU8NoWmGuCsp') throw new Error(`Unexpected Phase 4 workflow id: ${workflow.id}`);

const validator = workflow.nodes.find((node) => node.name === 'Validate Locations');
if (!validator) throw new Error('Missing Validate Locations node');
validator.parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-validate-locations.js'),
  'utf8',
);

const prepare = workflow.nodes.find((node) => node.name === 'Prepare Phase 4 Candidate');
if (!prepare) throw new Error('Missing Prepare Phase 4 Candidate node');
prepare.parameters.jsCode = prepare.parameters.jsCode.replace(
  'phase4-narrow-extraction-v10-classification',
  'phase4-narrow-extraction-v11-location-boundary',
);

workflow.active = false;
fs.writeFileSync(outputPath, `${JSON.stringify(workflows, null, 2)}\n`);
console.log(outputPath);
