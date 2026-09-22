function contentWords(value) {
  const stopwords = new Set(['after', 'along', 'from', 'into', 'near', 'that', 'their', 'they', 'this', 'were', 'while', 'with']);
  return new Set((String(value ?? '').toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu) || [])
    .filter((word) => word.length >= 4 && !stopwords.has(word)));
}

function removeOpeningImageCaption(text) {
  return String(text ?? '').replace(
    /^!\[([^\]]*)\]\([^)]+\)\s*\n\s*\n([^\n]{20,300})(?=\n\s*\n|$)/u,
    (whole, alt, followingParagraph) => {
      const altWords = contentWords(alt);
      const paragraphWords = contentWords(followingParagraph);
      const shared = [...altWords].filter((word) => paragraphWords.has(word)).length;
      const denominator = Math.min(altWords.size, paragraphWords.size);
      return shared >= 4 && denominator > 0 && shared / denominator >= 0.35 ? '' : whole;
    },
  );
}

function cleanDeterministic(text) {
  return removeOpeningImageCaption(String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n'))
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/(?:^|\n\n)\s*\[(?:file|photo|image|credit)\s*:\s*[^\]\n]*(?:AP(?: Photo)?|AFP|Getty(?: Images)?|Reuters|EPA|Shutterstock|Flash90)[^\]\n]*\]\s*(?=\n\n|$)/gim, '')
    .replace(/(?:^|\n\n)\s*(?:(?:Photo|Image|Credit|Caption)\s*:\s*)?[^\n]{0,160}\b(?:AP Photo|AFP(?: via Getty Images)?|Getty Images|EPA|Shutterstock|Flash90)\b[.\s]*?(?=\n\n|$)/gim, '')
    .replace(/(?:^|\n\n)\s*(?:[A-Z][^\n]{0,120}\s+)?contributed to this story\.?\s*(?=\n\n|$)/gm, '')
    .replace(/(?:^|\n\n)[^\n]*(?:\((?:AP Photo|Photo by|Getty|AFP|Reuters|EPA|Shutterstock|Flash90)[^)\n]*\)|\bPhotograph:\s*[^\n]*(?:\/(?:AP|AFP|EPA|Reuters|Getty|Shutterstock|Flash90)|\b(?:AP|AFP|EPA|Reuters|Getty|Shutterstock|Flash90)\b)[^\n]*)\s*(?=\n\n|$)/gim, '')
    .replace(/(^|\n\n)[^\n]{20,300}\n\n[^\n]{2,100}\s*\|\s*Reuters\s*(?=\n\n|$)/gim, (whole, boundary) => boundary)
    .replace(/(?:^|\n\n)\s*advertisement\s*(?=\n\n|$)/gim, '')
    .replace(/(?:^|\n\n)Get instant alerts and updates based on your interests\. Be the first to know when big stories happen\.\s*(?=\n\n|$)/gim, '')
    .replace(/^Watch:\s*[^\n]+\n\n/iu, '')
    .replace(/(^|\n\n)\s*-\s*\[[^\]]*\b(?:live\s*[–—-]\s*latest updates|latest updates)\b[^\]]*\]\([^)]+\)\s*(?=\n\n|$)/gim, (whole, boundary) => boundary)
    .replace(/(?:^|\n\n)Share News\s*\n\nAnadolu Agency website contains only a portion of the news stories offered to subscribers[\s\S]*$/i, '')
    .replace(/(?:^|\n\n)news\\_share(?:\s*\n\nnews\\_share\\_description\s+\*\*subscription\\_contact\*\*)?[\s\S]*$/i, '')
    .replace(/!\[[^\]]*\]\([^)]+\)\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^(#{1,6})\s+(?=\S)/gm, '')
    .replace(/(?:^|\n)#{1,6}\s*Thank you for registering[\s\S]*$/i, '')
    .replace(/(?:^|\n)Please refresh[^\n]*(?:logged in|log in)[^\n]*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

return $input.all().map(item => ({
  ...item,
  json: {
    ...item.json,
    p1_preclean_content_text: cleanDeterministic(item.json.p1_raw_content_text),
  },
}));
