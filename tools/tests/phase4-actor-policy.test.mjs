import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function runValidator({candidateQuote, article, actors, candidateTitle = candidateQuote, candidateDescription = candidateQuote}) {
  const code = fs.readFileSync(new URL('../n8n/phase4-validate-actors.js', import.meta.url), 'utf8');
  const source = {
    candidate_evidence_quote: candidateQuote,
    cleaned_content_text: article,
    candidate_title: candidateTitle,
    candidate_description: candidateDescription,
  };
  const lookup = () => ({item: {json: source}});
  const response = {choices: [{message: {content: JSON.stringify({actors})}}]};
  return new Function('$', '$json', code)(lookup, response)[0].json;
}

test('rejects a bare nationality adjective as an actor', () => {
  const quote = 'Two Israeli strikes hit Nuseirat and al-Zawayda.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'Israeli', role: 'participant', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_actor_candidates, []);
  assert.match(result.p4_review_reasons[0], /nationality adjective/i);
});

test('rejects an actor that appears only in a neighboring temporal clause', () => {
  const quote = "A further strike was attempted against the Plesetsk Cosmodrome on 23 August, two days before Russia launched a satellite.";
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    candidateTitle: 'Attempted strike on Plesetsk Cosmodrome',
    candidateDescription: 'An attempted strike targeted Plesetsk Cosmodrome.',
    actors: [{name: 'Russia', role: 'recipient', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_actor_candidates, []);
  assert.match(result.p4_review_reasons[0], /neighboring event clause/i);
});

test('retains a named organization acting in the candidate event', () => {
  const quote = 'Ukraine’s Foreign Ministry said the election results would be invalid.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'Ukraine’s Foreign Ministry', role: 'source', evidence_quote: quote}],
  });

  assert.equal(result.p4_actor_candidates.length, 1);
});

test('restores exact article Markdown around an otherwise exact actor quote', () => {
  const candidate = 'The PKK announced last year that it is ending its armed campaign.';
  const article = 'The **PKK** announced last year that it is ending its armed campaign.';
  const result = runValidator({
    candidateQuote: candidate,
    article,
    actors: [{name: 'PKK', role: 'participant', evidence_quote: candidate}],
  });

  assert.equal(result.p4_actor_candidates.length, 1);
  assert.equal(result.p4_actor_candidates[0].evidence_quote, article);
});

test('corrects an acting parliament from source to participant', () => {
  const quote = 'Turkey’s parliament approved legislation providing a conditional pardon.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'Turkey’s parliament', role: 'source', evidence_quote: quote}],
  });

  assert.equal(result.p4_actor_candidates[0].role, 'participant');
});

test('rejects an unresolved actor reference', () => {
  const quote = 'The ongoing discussion has not reached parliamentary approval, the official added.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'the official', role: 'participant', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_actor_candidates, []);
  assert.match(result.p4_review_reasons[0], /unresolved reference/i);
});

test('does not mark an actor as source because a different actor said something', () => {
  const quote = 'Pacific leaders registered concern about China’s launch of a missile, but they said the statement was not unanimous.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'China', role: 'source', evidence_quote: quote}],
  });

  assert.equal(result.p4_actor_candidates[0].role, 'participant');
});
