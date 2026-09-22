import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, '.n8n-backups', 'phase3-audit.json');
const outputPath = path.join(root, '.n8n-backups', 'phase3-baseline-fix-import.json');
const workflows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const workflow = workflows[0];

if (workflow.id !== 'S5HKb5Sfag80cvkd') {
  throw new Error(`Unexpected Phase 3 workflow id: ${workflow.id}`);
}

const replacements = new Map([
  ['Prepare Phase 3 Source', 'phase3-prepare-source.js'],
  ['Build Event Candidate Prompt', 'phase3-build-detection-prompt.js'],
  ['Validate Event Candidate Evidence', 'phase3-validate-evidence.js'],
  ['Build Event Candidate Safeguard Prompt', 'phase3-build-safeguard-prompt.js'],
]);

for (const [nodeName, fileName] of replacements) {
  const node = workflow.nodes.find((candidate) => candidate.name === nodeName);
  if (!node) throw new Error(`Missing Phase 3 node: ${nodeName}`);
  node.parameters.jsCode = fs.readFileSync(path.join(root, 'tools', 'n8n', fileName), 'utf8');
}

workflow.active = false;
fs.writeFileSync(outputPath, `${JSON.stringify(workflows, null, 2)}\n`);
console.log(outputPath);
