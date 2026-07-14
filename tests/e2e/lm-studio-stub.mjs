import http from "node:http";
import { fileURLToPath } from "node:url";

export function startLmStudioStub(port, evidenceQuote) {
  const server = http.createServer((request, response) => {
    if (request.method === "GET" && request.url === "/v1/models") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "stub-model" }] }));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/chat/completions") {
      const content = JSON.stringify({
        events: [
          {
            title: "Stub extracted event",
            summary: "Extracted by the local LM Studio stub for end-to-end verification.",
            event_type: { suggested: "Report" },
            start_date: null,
            start_date_precision: null,
            end_date: null,
            end_date_precision: null,
            epistemic_status: "confirmed",
            locations: [],
            actors: [],
            evidence_quote: evidenceQuote,
          },
        ],
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ choices: [{ message: { content } }] }));
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
  const evidenceQuote = process.argv[3];
  await startLmStudioStub(port, evidenceQuote);
  console.log(`lm-studio-stub listening on ${port}`);
}
