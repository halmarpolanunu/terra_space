import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyPhase4Result} from '../n8n/phase4-status-policy.mjs';

test('marks an inherited Phase 3 evidence problem as needs review', () => {
  const result = classifyPhase4Result({
    reasons: ['The Phase 3 candidate requires review, so the Phase 4 result cannot be marked valid automatically.'],
    phase3CandidateStatus: 'NEEDS_REVIEW',
  });
  assert.equal(result.status, 'NEEDS_REVIEW');
});

test('marks a missing safely grounded date as incomplete', () => {
  const result = classifyPhase4Result({
    reasons: ['The proposed date evidence was outside the candidate event boundary and was omitted.'],
    phase3CandidateStatus: 'VALID',
  });
  assert.equal(result.status, 'INCOMPLETE');
});

test('keeps a usable result valid when an actor metonym is rejected as a location', () => {
  const result = classifyPhase4Result({
    reasons: ['A proposed location was acting as an actor or metonym rather than identifying where the event occurred and was omitted.'],
    phase3CandidateStatus: 'VALID',
  });
  assert.equal(result.status, 'VALID');
  assert.equal(result.reason, null);
});

test('marks a technical extractor problem as needs review', () => {
  const result = classifyPhase4Result({
    reasons: ['The actor response was not valid JSON with an actors array.'],
    phase3CandidateStatus: 'VALID',
  });
  assert.equal(result.status, 'NEEDS_REVIEW');
});

test('keeps a usable result valid when only an outside source actor was omitted', () => {
  const result = classifyPhase4Result({
    reasons: ['A proposed actor used evidence outside the candidate event boundary and was omitted.'],
    phase3CandidateStatus: 'VALID',
    finalActors: [],
    proposedActors: [{name: '50Hertz', role: 'source'}],
  });
  assert.equal(result.status, 'VALID');
});

test('marks a result incomplete when an unsupported participant leaves no actors', () => {
  const result = classifyPhase4Result({
    reasons: ['A proposed actor name was not explicit in its own evidence and was omitted.'],
    phase3CandidateStatus: 'VALID',
    finalActors: [],
    proposedActors: [{name: 'Russia', role: 'participant'}],
  });
  assert.equal(result.status, 'INCOMPLETE');
});

test('marks a usable partial result incomplete after an optional actor is safely rejected', () => {
  const result = classifyPhase4Result({
    reasons: ['The actor safeguard rejected an actor: the named firm only reported the event.'],
    phase3CandidateStatus: 'VALID',
    finalActors: [{name: 'Coast Guard', role: 'participant'}],
    proposedActors: [{name: 'Coast Guard', role: 'participant'}, {name: 'Law firm', role: 'participant'}],
  });
  assert.equal(result.status, 'INCOMPLETE');
});
