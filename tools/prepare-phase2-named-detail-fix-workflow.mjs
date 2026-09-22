import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, '.n8n-backups', 'phase2-before-named-detail-fix.json');
const outputPath = path.join(root, '.n8n-backups', 'phase2-named-detail-fix-import.json');
const workflows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const workflow = workflows[0];

if (workflow.id !== 'AkdHAcebfzmnOSST') {
  throw new Error(`Unexpected Phase 2 workflow id: ${workflow.id}`);
}

const prepareResult = workflow.nodes.find((node) => node.id === 'p2_prepare_result');
if (!prepareResult) {
  throw new Error('Missing Prepare Phase 2 Result node');
}

prepareResult.parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase2-prepare-result.js'),
  'utf8',
);
workflow.active = false;

fs.writeFileSync(outputPath, `${JSON.stringify(workflows, null, 2)}\n`);
console.log(outputPath);
