import http from "node:http";
import { fileURLToPath } from "node:url";

// responseTable: array of { match: string, extraction: object, failTimes?: number }.
// The document text is embedded in the chat-completions request body, so the first
// entry whose `match` substring appears in the request body is used; if none match,
// the first entry is used as a default (keeps a single-document caller simple).
// When `failTimes` is set, the first N matching requests return schema-invalid
// output (so the backend marks that document failed) and later ones succeed —
// this lets a single test drive process -> fail -> retry -> success.
export function startLmStudioStub(port, responseTable) {
  const matchCounts = new Map();

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
        const index = responseTable.findIndex((entry) => body.includes(entry.match));
        const matched = index >= 0 ? responseTable[index] : responseTable[0];
        const seen = (matchCounts.get(index) ?? 0) + 1;
        matchCounts.set(index, seen);
        const failing = matched?.failTimes && seen <= matched.failTimes;
        // Schema-invalid content (missing required event fields) makes the
        // backend raise a response error and mark this document failed.
        const extraction = failing
          ? { events: [{ title: "incomplete" }] }
          : (matched?.extraction ?? { events: [] });
        const content = JSON.stringify(extraction);
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
