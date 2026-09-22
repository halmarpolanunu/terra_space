import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, '.n8n-backups', 'p4-restored-verified.json');
const outputPath = path.join(root, '.n8n-backups', 'p4-v9-statement-date-import.json');
const workflows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const workflow = workflows[0];

function node(id) {
  const found = workflow.nodes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing workflow node ${id}`);
  return found;
}

node('p4_p4_build_detect').parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-build-date-prompt.js'), 'utf8',
);
node('p4_p4_validate_detect').parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-capture-date-response.js'), 'utf8',
);
node('p4_n_validate_actor').parameters.jsCode = fs.readFileSync(
  path.join(root, 'tools', 'n8n', 'phase4-validate-actors.js'), 'utf8',
);

const prepare = node('p4_p4_prepare_source');
prepare.parameters.jsCode = prepare.parameters.jsCode.replace(
  'phase4-narrow-extraction-v7-weekday-direction',
  'phase4-narrow-extraction-v9-statement-date',
);

const combine = node('p4_n_combine');
const oldTail = "const why=[...new Set(reasons)];return [{json:{phase3_event_candidate_result_id:s.phase3_event_candidate_result_id,phase1_source_id:s.phase1_source_id,candidate_id:s.candidate_id,phase3_candidate_status:s.phase3_candidate_status,existing_phase4_result_id:s.existing_phase4_result_id??null,p4_submission_key:s.p4_submission_key,p4_model_name:s.p4_model_name,p4_extraction_prompt_version:s.p4_extraction_prompt_version,p4_safeguard_prompt_version:s.p4_safeguard_prompt_version,p4_status:why.length?'NEEDS_REVIEW':'VALID',p4_extraction_status:has?'FACTS_FOUND':'NO_ADDITIONAL_FACTS',p4_safeguard_status:safe,p4_facts:facts,p4_extraction_raw_output:JSON.stringify({date_epistemic:s.p4_date_raw_output??null,actors:s.p4_actor_raw_output??null,locations:s.p4_location_raw_output??null}),p4_safeguard_raw_output:JSON.stringify({actors:s.p4_actor_safeguard_raw_output??null,locations:s.p4_location_safeguard_raw_output??null}),p4_review_reason:why.join(' | ')||null,p4_error_message:why.join(' | ')||null,p4_needs_safeguard:false}}];";
const newTail = "const why=[...new Set(reasons)];let proposedActors=[];try{const parsedActors=JSON.parse(unwrap(String(s.p4_actor_raw_output??'')));proposedActors=Array.isArray(parsedActors?.actors)?parsedActors.actors:[]}catch{}const onlyOmittedSources=proposedActors.length>0&&proposedActors.every(a=>a?.role==='source');const technical=why.some(r=>/(?:request failed|response was not valid json|safeguard.*(?:failed|unusable)|missing safeguard)/i.test(r));const inherited=s.phase3_candidate_status==='NEEDS_REVIEW';const actorOmission=why.some(r=>/proposed actor.*omitted/i.test(r));const dateOrEpistemicOmission=why.some(r=>/(?:date evidence.*omitted|exact date came only from a vague|event date was invalid or unsupported|epistemic-status evidence.*omitted|epistemic-status quote was unsupported)/i.test(r));const incomplete=dateOrEpistemicOmission||(actorOmission&&actors.length===0&&!onlyOmittedSources);const resultStatus=inherited||technical||safe==='REJECT'||safe==='FAILED'?'NEEDS_REVIEW':incomplete?'INCOMPLETE':'VALID';const resultReason=resultStatus==='VALID'?null:why.join(' | ')||null;return [{json:{phase3_event_candidate_result_id:s.phase3_event_candidate_result_id,phase1_source_id:s.phase1_source_id,candidate_id:s.candidate_id,phase3_candidate_status:s.phase3_candidate_status,existing_phase4_result_id:s.existing_phase4_result_id??null,p4_submission_key:s.p4_submission_key,p4_model_name:s.p4_model_name,p4_extraction_prompt_version:s.p4_extraction_prompt_version,p4_safeguard_prompt_version:s.p4_safeguard_prompt_version,p4_status:resultStatus,p4_extraction_status:has?'FACTS_FOUND':'NO_ADDITIONAL_FACTS',p4_safeguard_status:safe,p4_facts:facts,p4_extraction_raw_output:JSON.stringify({date_epistemic:s.p4_date_raw_output??null,actors:s.p4_actor_raw_output??null,locations:s.p4_location_raw_output??null}),p4_safeguard_raw_output:JSON.stringify({actors:s.p4_actor_safeguard_raw_output??null,locations:s.p4_location_safeguard_raw_output??null}),p4_review_reason:resultReason,p4_error_message:resultStatus==='NEEDS_REVIEW'?resultReason:null,p4_needs_safeguard:false}}];";
if (!combine.parameters.jsCode.includes(oldTail)) {
  throw new Error('Combine node no longer matches the verified v7 baseline');
}
combine.parameters.jsCode = combine.parameters.jsCode.replace(oldTail, newTail);

workflow.active = false;
fs.writeFileSync(outputPath, `${JSON.stringify(workflows, null, 2)}\n`);
console.log(outputPath);
