import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function runCapture({publicationDate, candidateQuote, article = candidateQuote, response, candidateStatus = 'VALID', candidateTitle = candidateQuote, candidateDescription = candidateQuote}) {
  const code = fs.readFileSync(new URL('../n8n/phase4-capture-date-response.js', import.meta.url), 'utf8');
  const source = {
    publication_date: publicationDate,
    candidate_evidence_quote: candidateQuote,
    cleaned_content_text: article,
    phase3_candidate_status: candidateStatus,
    candidate_title: candidateTitle,
    candidate_description: candidateDescription,
  };
  const lookup = () => ({item: {json: source}});
  const apiResponse = {choices: [{message: {content: JSON.stringify(response)}}]};
  return new Function('$', '$json', code)(lookup, apiResponse)[0].json;
}

function validated(result) {
  return JSON.parse(result.p4_date_validated_output);
}

test('corrects an on-Monday date to the publication-day Monday', () => {
  const quote = 'Turkey’s parliament on Monday approved the legislation.';
  const result = runCapture({
    publicationDate: '2026-08-10',
    candidateQuote: quote,
    response: {
      event_date: '2026-08-09',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, '2026-08-10');
  assert.equal(result.p4_date_policy_reason, null);
});

test('preserves a matching next-day weekday proposed after publication', () => {
  const quote = 'The heads of the European Commission and NATO are set to hold talks on Wednesday.';
  const result = runCapture({
    publicationDate: '2026-09-01',
    candidateQuote: quote,
    response: {
      event_date: '2026-09-02',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'planned',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, '2026-09-02');
  assert.equal(result.p4_date_policy_reason, null);
});

test('normalizes a grounded month name using the publication year', () => {
  const quote = 'A framework deal was signed in June through mediation.';
  const result = runCapture({
    publicationDate: '2026-09-01',
    candidateQuote: quote,
    response: {
      event_date: 'June',
      event_date_precision: 'month',
      event_date_evidence_quote: quote,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, '2026-06');
  assert.equal(validated(result).event_date_precision, 'month');
});

test('normalizes model day precision to an exact grounded date', () => {
  const quote = 'A strike was attempted on 23 August.';
  const result = runCapture({
    publicationDate: '2026-09-01',
    candidateQuote: quote,
    response: {
      event_date: '23 August',
      event_date_precision: 'day',
      event_date_evidence_quote: quote,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, '2026-08-23');
  assert.equal(validated(result).event_date_precision, 'exact');
});

test('omits a future-program date taken from outside the candidate evidence boundary', () => {
  const candidateQuote = 'The consortium signed an implementation agreement for IRIS².';
  const result = runCapture({
    publicationDate: '2026-08-10',
    candidateQuote,
    response: {
      event_date: '2029',
      event_date_precision: 'year',
      event_date_evidence_quote: 'The programme’s first launches are expected to begin in 2029.',
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: 'The programme’s first launches are expected to begin in 2029.',
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.equal(validated(result).event_date_precision, 'unknown');
  assert.match(result.p4_date_policy_reason, /candidate event boundary/i);
});

test('omits a neighboring event date quote from the same article', () => {
  const result = runCapture({
    publicationDate: '2026-08-11',
    candidateQuote: 'The court also sentenced Maher al-Assad to death in absentia.',
    response: {
      event_date: '2026-08-11',
      event_date_precision: 'exact',
      event_date_evidence_quote: 'The court in Damascus on Tuesday sentenced Bashar al-Assad to death.',
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: 'The court also sentenced Maher al-Assad to death in absentia.',
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.match(result.p4_date_policy_reason, /candidate event boundary/i);
});

test('omits epistemic evidence taken from outside the candidate boundary', () => {
  const candidateQuote = 'The agreement adds another 66 satellites to the programme.';
  const result = runCapture({
    publicationDate: '2026-08-10',
    candidateQuote,
    response: {
      event_date: null,
      event_date_precision: 'unknown',
      event_date_evidence_quote: null,
      epistemic_status: 'planned',
      epistemic_status_evidence_quote: 'The programme’s first launches are expected to begin in 2029.',
    },
  });

  assert.equal(validated(result).epistemic_status, 'unknown');
  assert.equal(validated(result).epistemic_status_evidence_quote, null);
  assert.match(result.p4_epistemic_policy_reason, /candidate event boundary/i);
});

test('omits an ambiguous statement weekday when the event occurred in another stated period', () => {
  const quote = 'US Central Command said on Monday that it redirected vessels since reinstating the blockade in July.';
  const result = runCapture({
    publicationDate: '2026-08-11',
    candidateQuote: quote,
    candidateTitle: 'Redirection of vessels after blockade',
    candidateDescription: 'US Central Command redirected vessels after reinstating a blockade in July.',
    response: {
      event_date: '2026-08-10',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.equal(validated(result).event_date_precision, 'unknown');
  assert.match(result.p4_date_policy_reason, /multiple time references/i);
});

test('uses a statement weekday when an older agreement month is only background', () => {
  const quote = "Iran's President Masoud Pezeshkian said Tuesday his country is ready to return to the ceasefire deal reached with the US in June if Washington does the same";
  const result = runCapture({
    publicationDate: '2026-09-01',
    candidateQuote: quote,
    candidateTitle: "Iran's offer to return to ceasefire deal",
    candidateDescription: 'President Pezeshkian stated that Iran is willing to return if the United States does the same.',
    response: {
      event_date: '2026-08-26',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: 'Iranian state media reported',
    },
  });

  assert.equal(validated(result).event_date, '2026-09-01');
  assert.equal(validated(result).event_date_precision, 'exact');
  assert.equal(validated(result).epistemic_status, 'reported');
  assert.equal(validated(result).epistemic_status_evidence_quote, quote);
});

test('sets epistemic status to unknown when its quote is not exact source text', () => {
  const candidateQuote = 'The official said “the explosion killed five people”.';
  const result = runCapture({
    publicationDate: '2026-08-13',
    candidateQuote,
    response: {
      event_date: null,
      event_date_precision: 'unknown',
      event_date_evidence_quote: null,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: 'The official said "the explosion killed five people".',
    },
  });

  assert.equal(validated(result).epistemic_status, 'unknown');
  assert.equal(validated(result).epistemic_status_evidence_quote, null);
  assert.match(result.p4_epistemic_policy_reason, /exact source text/i);
});

test('carries a Phase 3 candidate review status into Phase 4', () => {
  const quote = 'A man was killed in an overnight strike in Deir al-Balah.';
  const result = runCapture({
    publicationDate: '2026-08-25',
    candidateQuote: quote,
    candidateStatus: 'NEEDS_REVIEW',
    response: {
      event_date: null,
      event_date_precision: 'unknown',
      event_date_evidence_quote: null,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.match(result.p4_upstream_policy_reason, /phase 3 candidate requires review/i);
});

test('does not convert last week into an invented exact day', () => {
  const quote = 'A drone exploded close to a pipeline in Bulgaria last week.';
  const result = runCapture({
    publicationDate: '2026-08-14',
    candidateQuote: quote,
    response: {
      event_date: '2026-08-07',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.match(result.p4_date_policy_reason, /vague relative period/i);
});

test('omits a date when the candidate quote contains competing time references', () => {
  const quote = 'Turkey mediates talks later this month after calling for a moratorium on Aug. 9.';
  const result = runCapture({
    publicationDate: '2026-08-11',
    candidateQuote: quote,
    response: {
      event_date: '2026-08-09',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.match(result.p4_date_policy_reason, /multiple time references/i);
});

test('rejects a date quote narrower than a multi-clause candidate boundary', () => {
  const candidateQuote = 'The exercise was adjusted at the US request.\n\nThe drill will conclude on 21 August.';
  const result = runCapture({
    publicationDate: '2026-08-19',
    candidateQuote,
    candidateTitle: 'Adjustment of Ulchi Freedom Shield exercise',
    candidateDescription: 'South Korea and the United States adjusted the exercise period and scale.',
    response: {
      event_date: '2026-08-21',
      event_date_precision: 'exact',
      event_date_evidence_quote: 'The drill will conclude on 21 August.',
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: 'The exercise was adjusted at the US request.',
    },
  });

  assert.equal(validated(result).event_date, null);
  assert.match(result.p4_date_policy_reason, /complete candidate boundary/i);
});

test('restores exact article Markdown around a grounded date quote', () => {
  const quote = 'On 7 August, Ukrainian drone attacks struck Volna Kupol Garant.';
  const article = 'On 7 August, Ukrainian drone attacks struck **Volna Kupol Garant**.';
  const result = runCapture({
    candidateQuote: quote,
    article,
    publicationDate: '2026-08-12',
    response: {
      event_date: '2026-08-07',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'confirmed',
      epistemic_status_evidence_quote: quote,
    },
  });
  const parsed = JSON.parse(result.p4_date_validated_output);

  assert.equal(parsed.event_date_evidence_quote, article);
  assert.equal(parsed.epistemic_status_evidence_quote, article);
});

test('normalizes a grounded month-day date using the publication year', () => {
  const quote = 'On 7 August, Ukrainian drone attacks struck the equipment.';
  const result = runCapture({
    publicationDate: '2026-08-12',
    candidateQuote: quote,
    response: {
      event_date: 'August 7',
      event_date_precision: 'exact',
      event_date_evidence_quote: quote,
      epistemic_status: 'reported',
      epistemic_status_evidence_quote: quote,
    },
  });

  assert.equal(validated(result).event_date, '2026-08-07');
});
