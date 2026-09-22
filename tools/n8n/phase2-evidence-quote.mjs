function canonicalCharacter(character) {
  if (/[​-‏⁠﻿]/u.test(character)) return "";
  if (/\s/u.test(character)) return " ";
  if (/[“”]/u.test(character)) return '"';
  if (/[‘’]/u.test(character)) return "'";
  if (/[–—]/u.test(character)) return "-";
  return character;
}

function canonicalizeWithMap(value) {
  const text = String(value ?? "");
  let canonical = "";
  const sourceIndexes = [];

  for (let index = 0; index < text.length; index += 1) {
    const normalized = canonicalCharacter(text[index]);
    if (!normalized) continue;
    if (normalized === " " && (canonical === "" || canonical.endsWith(" "))) continue;
    canonical += normalized;
    sourceIndexes.push(index);
  }

  if (canonical.endsWith(" ")) {
    canonical = canonical.slice(0, -1);
    sourceIndexes.pop();
  }
  return { canonical, sourceIndexes };
}

export function findExactSourceQuote(articleText, proposedQuote) {
  const article = String(articleText ?? "");
  const proposed = String(proposedQuote ?? "").trim();
  if (!article || !proposed) return null;

  const exactStart = article.indexOf(proposed);
  if (exactStart >= 0) return article.slice(exactStart, exactStart + proposed.length);

  const source = canonicalizeWithMap(article);
  const candidate = canonicalizeWithMap(proposed).canonical;
  if (!candidate) return null;

  const normalizedStart = source.canonical.indexOf(candidate);
  if (normalizedStart < 0) return null;

  const originalStart = source.sourceIndexes[normalizedStart];
  const originalEnd = source.sourceIndexes[normalizedStart + candidate.length - 1] + 1;
  return article.slice(originalStart, originalEnd);
}
