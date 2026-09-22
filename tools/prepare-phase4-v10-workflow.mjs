import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, '.n8n-backups', 'p4-before-second-batch-repair.json');
const outputPath = path.join(root, '.n8n-backups', 'p4-v10-classification-import.json');
const workflows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const workflow = workflows[0];

function node(name) {
  const found = workflow.nodes.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Missing workflow node ${name}`);
  return found;
}

node('Validate Actors').parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-validate-actors.js'), 'utf8',
);
node('Validate Locations').parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-validate-locations.js'), 'utf8',
);

const prepare = node('Prepare Phase 4 Candidate');
prepare.parameters.jsCode = prepare.parameters.jsCode.replace(
  'phase4-narrow-extraction-v9-statement-date',
  'phase4-narrow-extraction-v10-classification',
);

const combine = node('Combine Phase 4 Result');
const oldLogic = "const incomplete=dateOrEpistemicOmission||(actorOmission&&actors.length===0&&!onlyOmittedSources);const resultStatus=inherited||technical||safe==='REJECT'||safe==='FAILED'?'NEEDS_REVIEW':incomplete?'INCOMPLETE':'VALID';";
const newLogic = "const safeguardOmission=why.some(r=>/(?:actor|location) safeguard rejected/i.test(r));const incomplete=dateOrEpistemicOmission||safeguardOmission||(actorOmission&&actors.length===0&&!onlyOmittedSources);const resultStatus=inherited||technical||safe==='FAILED'?'NEEDS_REVIEW':incomplete?'INCOMPLETE':'VALID';";
if (!combine.parameters.jsCode.includes(oldLogic)) {
  throw new Error('Combine Phase 4 Result does not match the expected v9 status logic');
}
combine.parameters.jsCode = combine.parameters.jsCode.replace(oldLogic, newLogic);

workflow.active = false;
fs.writeFileSync(outputPath, `${JSON.stringify(workflows, null, 2)}\n`);
console.log(outputPath);
