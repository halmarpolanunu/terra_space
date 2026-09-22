import test from "node:test";
import assert from "node:assert/strict";

import { findExactSourceQuote } from "../n8n/phase2-evidence-quote.mjs";


test("returns the original article slice when the proposed quote is already exact", () => {
  const article = "The president signed a memorandum directing the programme.";
  const proposed = "The president signed a memorandum directing the programme.";

  assert.equal(findExactSourceQuote(article, proposed), proposed);
});


test("restores invisible source characters instead of rejecting a visible-text match", () => {
  const article = "The president \u2060signed a national security memorandum.";
  const proposed = "The president signed a national security memorandum.";

  assert.equal(
    findExactSourceQuote(article, proposed),
    "The president \u2060signed a national security memorandum.",
  );
});


test("restores source typography and whitespace while returning an exact source slice", () => {
  const article = "The military said, “The threat was neutralised.”\nFurther checks followed.";
  const proposed = 'The military said, "The threat was neutralised." Further checks followed.';

  assert.equal(
    findExactSourceQuote(article, proposed),
    "The military said, “The threat was neutralised.”\nFurther checks followed.",
  );
});


test("accepts a longer contiguous excerpt that supports details across consecutive sentences", () => {
  const article = "A drone entered Latvian airspace. An Italian Eurofighter neutralised it over an unpopulated area.";
  const proposed = "A drone entered Latvian airspace. An Italian Eurofighter neutralised it over an unpopulated area.";

  assert.equal(findExactSourceQuote(article, proposed), article);
});


test("rejects a proposed quote that adds words not present in the article", () => {
  const article = "The UAE suspended trade in light of regional escalations.";
  const proposed = "The UAE suspended trade after two Iranian ballistic missiles were launched.";

  assert.equal(findExactSourceQuote(article, proposed), null);
});


test("rejects an empty proposed quote", () => {
  assert.equal(findExactSourceQuote("Article text", "   "), null);
});
