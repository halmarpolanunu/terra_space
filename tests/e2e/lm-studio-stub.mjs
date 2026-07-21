import http from "node:http";
import { fileURLToPath } from "node:url";

// responseTable: array of one entry per document, each shaped:
//   {
//     match: string,              // substring unique to this document (usually its evidence quote)
//     candidate: {                // the one signal candidate this stub returns for this document
//       working_title, summary, epistemic_status, evidence_quote
//     },
//     event_type?: { existing },                                   // default: { existing: null }
//     event_date?: { event_date, event_date_precision },           // default: both null
//     locations?: { locations: [...] },                            // default: []
//     actors?: { source_actors: [...], recipient_actors: [...] },  // default: both []
//     failTimes?: number,         // Signal Parser call returns schema-invalid output this
//                                  // many times for this document before succeeding, so the
//                                  // whole document fails and can be retried (only the
//                                  // signal_parser stage fails a document in the staged
//                                  // pipeline, so this only affects that one call type).
//   }
//
// The staged pipeline makes one call per document to parse signals, then four narrow
// classifier calls per surviving candidate; every call's request body names which one it is
// via response_format.json_schema.name. The document text and the matched candidate's own
// evidence_quote both appear in every call's user message, so the same `match` substring
// test used for the Signal Parser call also correctly disambiguates classifier calls between
// different documents/candidates.
const CALL_DEFAULTS = {
  signal_parse_result: () => ({ candidates: [] }),
  classified_event_type: () => ({ existing: null }),
  classified_date: () => ({ event_date: null, event_date_precision: null }),
  classified_locations: () => ({ locations: [] }),
  classified_actors: () => ({ source_actors: [], recipient_actors: [] }),
};

const ENTRY_KEY_BY_SCHEMA = {
  classified_event_type: "event_type",
  classified_date: "event_date",
  classified_locations: "locations",
  classified_actors: "actors",
};

export function startLmStudioStub(port, responseTable) {
  const signalParserCallCounts = new Map();

  const server = http.createServer((request, response) => {
    if (request.method === "GET" && request.url === "/v1/models") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "stub-model" }] }));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/chat/completions") {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        const parsedBody = JSON.parse(body);
        const schemaName = parsedBody?.response_format?.json_schema?.name;
        const index = responseTable.findIndex((entry) => body.includes(entry.match));
        const matched = index >= 0 ? responseTable[index] : responseTable[0];

        let payload;
        if (schemaName === "signal_parse_result") {
          const seen = (signalParserCallCounts.get(index) ?? 0) + 1;
          signalParserCallCounts.set(index, seen);
          const failing = matched?.failTimes && seen <= matched.failTimes;
          // Schema-invalid content (missing required candidate fields) makes the backend
          // raise a response error, failing the whole document -- only the Signal Parser
          // stage can do this in the staged pipeline.
          payload = failing
            ? { candidates: [{ working_title: "incomplete" }] }
            : { candidates: matched?.candidate ? [matched.candidate] : [] };
        } else {
          const key = ENTRY_KEY_BY_SCHEMA[schemaName];
          payload = (key && matched?.[key]) || CALL_DEFAULTS[schemaName]?.() || {};
        }

        const content = JSON.stringify(payload);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content } }] }));
      });
      return;
    }

    response.writeHead(404);
    response.end();
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

// When run directly (not imported), start the stub as a standalone process.
// This must be a separate OS process from anything that calls spawnSync for
// docker/PowerShell: spawnSync blocks the whole Node.js event loop for the
// duration of the child process, which would freeze this server in-process
// and make every request to it hang until the child process exits.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const port = Number(process.argv[2]);
  const responseTable = JSON.parse(process.argv[3]);
  await startLmStudioStub(port, responseTable);
  console.log(`lm-studio-stub listening on ${port}`);
}
