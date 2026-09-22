import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const code = fs.readFileSync(new URL('../n8n/phase2-prepare-result.js', import.meta.url), 'utf8');

function applyAcceptedSafeguard(proposal) {
  const getNode = () => ({item: {json: proposal}});
  return new Function('$json', '$', code)(
    {choices: [{message: {content: '{"decision":"ACCEPT"}'}}]},
    getNode,
  )[0].json;
}

test('rejects an accepted proposal when a multi-word person name is absent from its evidence', () => {
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-111',
    p2_phase1_source_id: 'source-111',
    p2_needs_safeguard: true,
    p2_issue_title: "Itamar Ben-Gvir's plan for forced expulsion",
    p2_issue_description: 'The national security minister set out a plan.',
    p2_evidence_quote: 'Israel’s far-right national security minister has set out a plan.',
  });

  assert.equal(result.p2_status, 'NEEDS_REVIEW');
  assert.equal(result.p2_safeguard_status, 'REJECT');
  assert.match(result.p2_error_message, /Itamar Ben-Gvir/i);
});

test('accepts a proposal when its multi-word person name appears in the evidence', () => {
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-115',
    p2_phase1_source_id: 'source-115',
    p2_needs_safeguard: true,
    p2_issue_title: 'Massad Boulos declines to name countries',
    p2_issue_description: 'Massad Boulos declined to name the countries.',
    p2_evidence_quote: 'Massad Boulos declined to name the countries involved.',
  });

  assert.equal(result.p2_status, 'VALID');
  assert.equal(result.p2_safeguard_status, 'ACCEPT');
  assert.equal(result.p2_error_message, null);
});

test('does not combine the end of the title with the start of the description as a name', () => {
  const evidence = 'Israel’s far-right national security minister has set out a plan for the illegal forced expulsion of all Palestinians from the Gaza Strip.';
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-boundary',
    p2_phase1_source_id: 'source-boundary',
    p2_needs_safeguard: true,
    p2_issue_title: 'Plan for the illegal forced expulsion of all Palestinians from the Gaza Strip',
    p2_issue_description: evidence,
    p2_evidence_quote: evidence,
  });

  assert.equal(result.p2_status, 'VALID');
});

test('accepts an acronym when the evidence contains its full name and acronym', () => {
  const evidence = 'The heads of the European Commission and the North Atlantic Treaty Organisation (NATO) are set to hold talks.';
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-98',
    p2_phase1_source_id: 'source-98',
    p2_needs_safeguard: true,
    p2_issue_title: 'European Commission and NATO heads to hold talks',
    p2_issue_description: evidence,
    p2_evidence_quote: evidence,
  });

  assert.equal(result.p2_status, 'VALID');
});

test('accepts supported possessive and programme names when wording is not contiguous', () => {
  const evidence = 'None of the satellites Russia launched as part of its Rassvet programme have reached their planned orbit.';
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-101',
    p2_phase1_source_id: 'source-101',
    p2_needs_safeguard: true,
    p2_issue_title: "Russia's Rassvet satellites fail to reach planned orbit",
    p2_issue_description: evidence,
    p2_evidence_quote: evidence,
  });

  assert.equal(result.p2_status, 'VALID');
});

test('does not reject a proposal because a capitalized phrase ends with a connector', () => {
  const evidence = 'The US Embassy in Israel warned Americans in the Middle East of possible flight cancellations.';
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-105',
    p2_phase1_source_id: 'source-105',
    p2_needs_safeguard: true,
    p2_issue_title: 'US Embassy in Israel warns Americans of travel disruptions',
    p2_issue_description: evidence,
    p2_evidence_quote: evidence,
  });

  assert.equal(result.p2_status, 'VALID');
});

test('ignores terminal punctuation when checking a supported named place', () => {
  const evidence = 'South Korea has not reached a final decision on any deployment of forces to the Strait of Hormuz, an official said.';
  const result = applyAcceptedSafeguard({
    p2_submission_key: 'test-114',
    p2_phase1_source_id: 'source-114',
    p2_needs_safeguard: true,
    p2_issue_title: 'South Korea has not reached a final decision on deployment to the Strait of Hormuz',
    p2_issue_description: 'A presidential official clarified that South Korea has not reached a final decision on deployment to the Strait of Hormuz.',
    p2_evidence_quote: evidence,
  });

  assert.equal(result.p2_status, 'VALID');
});
