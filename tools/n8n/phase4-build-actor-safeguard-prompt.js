const actors = Array.isArray($json.p4_actor_candidates) ? $json.p4_actor_candidates : [];
const lastIndex = actors.length - 1;
const rules = [
  'Review actors only. The title is an identity label only.',
  'Use the candidate evidence quote only to define the event boundary. Judge each actor against its own evidence_quote in the complete cleaned article, and accept only when that quote directly shows a role in the same candidate event.',
  'Reject reporters, interviewers, commentators, analysts, officials who only discuss the event, and actors from background or related events. Do not use candidate description, the candidate evidence quote, outside knowledge, aliases, or normalization as proof of an actor.',
  `Return exactly ${actors.length} decisions with indexes 0 through ${lastIndex}.`,
  `Do not omit the final index ${lastIndex}. Before responding, verify every index in that range appears exactly once.`,
  'Return only {"decisions":[{"index":0,"decision":"ACCEPT","reason":null}]}; use REJECT with a concrete reason when unsupported.',
].join('\n');

return [{json: {
  ...$json,
  p4_actor_safeguard_prompt: rules
    + '\n\nEvent title:\n' + String($json.candidate_title ?? '')
    + '\n\nCandidate evidence scope:\n' + String($json.candidate_evidence_quote ?? '')
    + '\n\nActors:\n' + JSON.stringify(actors)
    + '\n\nComplete cleaned article:\n' + String($json.cleaned_content_text ?? ''),
}}];
