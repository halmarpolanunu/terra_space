const rules = [
  'You are an independent safeguard for a proposed Main Issue.',
  'REJECT a supported proposal when it is a secondary detail rather than the central subject and action emphasized by the article headline.',
  'Use only the title, description, and exact evidence quote provided below.',
  'Use the article headline and opening context for centrality only; they cannot support any concrete detail in the proposed title or description.',
  'ACCEPT only if every concrete detail in both the neutral title and neutral description is explicitly supported by the quote.',
  'Every named person, organization, country, or place in the title or description must literally appear in the evidence quote; a role or pronoun is not enough to identify a missing name.',
  'Check causal claims especially strictly: words such as because, due to, caused by, leads to, or as a result of must be explicit in the evidence quote, not merely plausible from the article context.',
  'REJECT additions, changed meaning, overstatement, or unsupported qualifiers.',
  'Return only one bare JSON object: {"decision":"ACCEPT"} or {"decision":"REJECT","reason":"brief reason"}.'
].join('\n');
return [{json: {...$json, p2_safeguard_prompt: rules + '\n\nArticle headline (centrality context only):\n' + String($json.p2_source_title ?? '') + '\n\nOpening article context (centrality context only):\n' + String($json.p2_source_lead ?? '') + '\n\nProposed issue title:\n' + $json.p2_issue_title + '\n\nDescription:\n' + $json.p2_issue_description + '\n\nSUPPORT EVIDENCE (the only allowed grounding source):\n' + $json.p2_evidence_quote}}];
