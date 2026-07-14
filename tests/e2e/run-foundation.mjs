import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const powershell = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"];
const STUB_PORT = 4180;
const EVENT_REVIEW_STUB_PORT = 4181;
// Kept in sync with STUB_EVIDENCE_QUOTE in documents.spec.ts.
const STUB_EVIDENCE_QUOTE = "A large protest occurred at the capitol on July 10th";
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const DATABASE_DIR = path.join(PROJECT_ROOT, "data", "database");
const STUB_SCRIPT = path.join(PROJECT_ROOT, "tests", "e2e", "lm-studio-stub.mjs");

function resetLocalDatabase() {
  for (const name of ["terra-space.db", "terra-space.db-shm", "terra-space.db-wal"]) {
    const target = path.join(DATABASE_DIR, name);
    if (existsSync(target)) {
      rmSync(target);
    }
  }
}

function run(command, args, env) {
  const usesWindowsCommandShell = process.platform === "win32" && command === "npx.cmd";
  const result = spawnSync(
    usesWindowsCommandShell ? "cmd.exe" : command,
    usesWindowsCommandShell ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args,
    { stdio: "inherit", env: env ? { ...process.env, ...env } : process.env },
  );
  if (result.status !== 0) {
    throw new Error(`${command} failed.`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The stub must run as its own OS process, not merely its own async task in
// this process: every docker/PowerShell call below uses spawnSync, which
// blocks this process's entire event loop for the child's whole lifetime. An
// in-process HTTP server would be frozen (unable to answer any request) for
// that whole window, so LM Studio calls from the container would hang until
// timeout instead of getting a response.
async function startLmStudioStubProcess(port, responseTable) {
  const child = spawn("node", [STUB_SCRIPT, String(port), JSON.stringify(responseTable)], {
    stdio: "inherit",
  });
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/v1/models`);
      if (response.ok) {
        return child;
      }
    } catch {
      // not ready yet
    }
    await sleep(200);
  }
  child.kill();
  throw new Error("LM Studio stub did not become ready in time.");
}

async function startTerraSpaceWithRetry(env, attempts = 2) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      run("powershell", [...powershell, ".\\Start-TerraSpace.ps1"], env);
      return;
    } catch (error) {
      console.warn(`Start-TerraSpace.ps1 attempt ${attempt}/${attempts} failed: ${error.message}`);
      spawnSync("docker", ["compose", "logs", "backend"], { stdio: "inherit" });
      run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
      if (attempt === attempts) {
        throw error;
      }
      await sleep(10000);
    }
  }
}

async function runFoundationScenario() {
  // Force a genuinely unreachable LM Studio URL so this scenario stays
  // deterministic even on a machine where LM Studio happens to be running.
  const env = { TERRA_LM_STUDIO_URL: "http://host.docker.internal:19999" };
  resetLocalDatabase();
  try {
    await startTerraSpaceWithRetry(env);
    run("npx.cmd", ["playwright", "test", "tests/e2e/foundation.spec.ts"], env);
  } finally {
    run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
  }
}

function singleEventExtraction(evidenceQuote, overrides = {}) {
  return {
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
        ...overrides,
      },
    ],
  };
}

async function runDocumentsScenario() {
  const stub = await startLmStudioStubProcess(STUB_PORT, [
    { match: STUB_EVIDENCE_QUOTE, extraction: singleEventExtraction(STUB_EVIDENCE_QUOTE) },
  ]);
  const env = { TERRA_LM_STUDIO_URL: `http://host.docker.internal:${STUB_PORT}` };
  resetLocalDatabase();

  const verifyScript = `
import sqlite3

conn = sqlite3.connect("/data/database/terra-space.db")
events = conn.execute("SELECT review_status FROM events").fetchall()
assert any(row[0] == "draft" for row in events), f"expected a draft event, found {events}"

quotes = [row[0] for row in conn.execute("SELECT evidence_quote FROM event_sources").fetchall()]
assert any("${STUB_EVIDENCE_QUOTE}" in (quote or "") for quote in quotes), f"evidence quote missing from {quotes}"

print("Verified: a draft event backed by the expected evidence quote exists.")
`.trim();

  try {
    await startTerraSpaceWithRetry(env);
    run("npx.cmd", ["playwright", "test", "tests/e2e/documents.spec.ts"], env);
    run("docker", ["compose", "run", "--rm", "backend", "python", "-c", verifyScript], env);
  } finally {
    run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
    stub.kill();
  }
}

async function runEventReviewScenario() {
  // Kept in sync with the quotes/titles in event-review.spec.ts.
  const AIRSTRIKE_QUOTE = "An airstrike hit the fuel depot in Sana'a on 2026-07-10";
  const CEASEFIRE_QUOTE = "A ceasefire negotiation began in the capital on 2026-09-01";
  const SECOND_AIRSTRIKE_QUOTE = "A second airstrike hit the fuel depot in Sana'a on 2026-07-11";
  const THIRD_AIRSTRIKE_QUOTE = "A third airstrike hit the fuel depot in Sana'a on 2026-07-07";

  const responseTable = [
    {
      match: AIRSTRIKE_QUOTE,
      extraction: singleEventExtraction(AIRSTRIKE_QUOTE, {
        title: "Depot airstrike",
        summary: "An airstrike reportedly hit a fuel depot in Sana'a.",
        event_type: { suggested: "Airstrike" },
        start_date: "2026-07-10",
        start_date_precision: "exact",
        epistemic_status: "claim",
        locations: [{ country: "YE", admin1: "Sana'a", city_regency: null }],
        actors: [{ name: "Air Force", role: "source", existing: false }],
      }),
    },
    {
      match: CEASEFIRE_QUOTE,
      extraction: singleEventExtraction(CEASEFIRE_QUOTE, {
        title: "Ceasefire talks",
        summary: "Ceasefire negotiations reportedly began in the capital.",
        event_type: { suggested: "Negotiation" },
        start_date: "2026-09-01",
        start_date_precision: "exact",
        epistemic_status: "claim",
      }),
    },
    {
      match: SECOND_AIRSTRIKE_QUOTE,
      extraction: singleEventExtraction(SECOND_AIRSTRIKE_QUOTE, {
        title: "Second depot airstrike",
        summary: "A second airstrike reportedly hit the same fuel depot.",
        event_type: { suggested: "Airstrike" },
        start_date: "2026-07-11",
        start_date_precision: "exact",
        epistemic_status: "claim",
        locations: [{ country: "YE", admin1: "Sana'a", city_regency: null }],
        actors: [{ name: "Air Force", role: "source", existing: false }],
      }),
    },
    {
      match: THIRD_AIRSTRIKE_QUOTE,
      extraction: singleEventExtraction(THIRD_AIRSTRIKE_QUOTE, {
        title: "Third depot airstrike",
        summary: "A third airstrike reportedly hit the same fuel depot.",
        event_type: { suggested: "Airstrike" },
        start_date: "2026-07-07",
        start_date_precision: "exact",
        epistemic_status: "claim",
        locations: [{ country: "YE", admin1: "Sana'a", city_regency: null }],
        actors: [{ name: "Air Force", role: "source", existing: false }],
      }),
    },
  ];

  const stub = await startLmStudioStubProcess(EVENT_REVIEW_STUB_PORT, responseTable);
  const env = { TERRA_LM_STUDIO_URL: `http://host.docker.internal:${EVENT_REVIEW_STUB_PORT}` };
  resetLocalDatabase();

  const verifyScript = `
import sqlite3

conn = sqlite3.connect("/data/database/terra-space.db")

event_type = conn.execute("SELECT is_active FROM event_types WHERE name = 'Airstrike'").fetchone()
assert event_type is not None and event_type[0] == 1, f"expected Airstrike type to be active, got {event_type}"

actor = conn.execute("SELECT is_active FROM actors WHERE name = 'Air Force'").fetchone()
assert actor is not None and actor[0] == 1, f"expected Air Force actor to be active, got {actor}"

rows = conn.execute("SELECT title, review_status FROM events").fetchall()
statuses = {title: status for title, status in rows}
assert statuses.get("Depot airstrike") == "approved", statuses
assert statuses.get("Ceasefire talks") == "rejected", statuses
assert statuses.get("Second depot airstrike") == "approved", statuses
assert statuses.get("Third depot airstrike") == "merged", statuses

flags = conn.execute("SELECT resolution FROM duplicate_flags ORDER BY resolution").fetchall()
resolutions = sorted(row[0] for row in flags)
assert resolutions == ["kept_separate", "linked"], resolutions

moved = conn.execute(
    """
    SELECT COUNT(*) FROM event_sources es
    JOIN events e ON e.id = es.event_id
    WHERE e.title = 'Depot airstrike' AND es.evidence_quote LIKE '%third airstrike%'
    """
).fetchone()[0]
assert moved == 1, "expected the merged event's evidence quote to move onto the approved event"

print("Verified: approve, reject, keep-separate, and link duplicate resolution all persisted correctly.")
`.trim();

  try {
    await startTerraSpaceWithRetry(env);
    run("npx.cmd", ["playwright", "test", "tests/e2e/event-review.spec.ts"], env);
    run("docker", ["compose", "run", "--rm", "backend", "python", "-c", verifyScript], env);
  } finally {
    run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
    stub.kill();
  }
}

await runFoundationScenario();
await sleep(5000);
await runDocumentsScenario();
await sleep(5000);
await runEventReviewScenario();
