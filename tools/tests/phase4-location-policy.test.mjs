import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function runValidator({candidateQuote, article, locations, actors = []}) {
  const code = fs.readFileSync(new URL('../n8n/phase4-validate-locations.js', import.meta.url), 'utf8');
  const source = {
    candidate_evidence_quote: candidateQuote,
    cleaned_content_text: article,
    p4_review_reasons: [],
    p4_actors: actors,
  };
  const lookup = () => ({item: {json: source}});
  const response = {choices: [{message: {content: JSON.stringify({locations})}}]};
  return new Function('$', '$json', code)(lookup, response)[0].json;
}

test('rejects location evidence borrowed from a neighboring event', () => {
  const result = runValidator({
    candidateQuote: 'The court also sentenced Maher al-Assad to death in absentia.',
    article: 'The court in Damascus sentenced Bashar. The court also sentenced Maher al-Assad to death in absentia.',
    locations: [{
      name: 'Damascus',
      level: 'city_regency',
      evidence_quote: 'The court in Damascus sentenced Bashar.',
    }],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /candidate event boundary/i);
});

test('rejects location evidence that extends beyond the complete candidate boundary', () => {
  const candidateQuote = 'The analysis estimates cumulative damage of €180 billion in 2026.';
  const result = runValidator({
    candidateQuote,
    article: candidateQuote + ' Against expected EU growth, the bloc would approach stagnation.',
    locations: [{
      name: 'EU',
      level: 'country',
      evidence_quote: candidateQuote + ' Against expected EU growth, the bloc would approach stagnation.',
    }],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /candidate event boundary/i);
});

test('rejects a political state label proposed as a country', () => {
  const quote = 'The PKK ended its campaign against the Turkish state.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [{name: 'Turkish state', level: 'country', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /not a supported country name/i);
});

test('retains a location grounded inside the candidate event boundary', () => {
  const quote = 'Turkey’s parliament approved the legislation in Turkey.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [{name: 'Turkey', level: 'country', evidence_quote: quote}],
  });

  assert.equal(result.p4_location_candidates.length, 1);
  assert.equal(result.p4_location_candidates[0].name, 'Turkey');
});

test('rejects a location name absent from its own evidence', () => {
  const quote = 'Ukraine said it struck a large oil refinery in the city overnight.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [{name: 'Orsk', level: 'city_regency', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /name was not explicit/i);
});

test('rejects an institution mislabeled as a city', () => {
  const quote = 'White House press secretary Karoline Leavitt will step down.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [{name: 'White House', level: 'city_regency', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /institution/i);
});

test('rejects a capital used as an actor rather than an event location', () => {
  const quote = 'Kyiv asked the EU for grants to support farmers.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    actors: [{name: 'Kyiv', role: 'source', evidence_quote: quote}],
    locations: [{name: 'Kyiv', level: 'city_regency', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /actor or metonym/i);
});

test('rejects countries that identify officials rather than where talks occurred', () => {
  const quote = 'Pakistan officials held talks with officials from Iran, Saudi Arabia and Kuwait on August 10.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [
      {name: 'Iran', level: 'country', evidence_quote: quote},
      {name: 'Saudi Arabia', level: 'country', evidence_quote: quote},
      {name: 'Kuwait', level: 'country', evidence_quote: quote},
    ],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /actor affiliation/i);
});

test('rejects a location belonging to a neighboring visit clause', () => {
  const quote = 'Officials held talks on August 10, and that Minister Naqvi is also visiting Tehran.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [{name: 'Tehran', level: 'city_regency', evidence_quote: quote}],
  });

  assert.deepEqual(result.p4_location_candidates, []);
  assert.match(result.p4_review_reasons[0], /neighboring event clause/i);
});

test('normalizes territorial and directional-region labels to unknown', () => {
  const quote = 'Operations occurred in the Gaza Strip, the Falklands and southern Iran.';
  const result = runValidator({
    candidateQuote: quote,
    article: quote,
    locations: [
      {name: 'Gaza Strip', level: 'city_regency', evidence_quote: quote},
      {name: 'Falklands', level: 'city_regency', evidence_quote: quote},
      {name: 'southern Iran', level: 'admin1', evidence_quote: quote},
    ],
  });

  assert.deepEqual(result.p4_location_candidates.map((location) => location.level), ['unknown', 'unknown', 'unknown']);
});
