import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const powershell = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"];
const STUB_PORT = 4180;
const EVENT_REVIEW_STUB_PORT = 4181;
const EVENTS_DASHBOARD_STUB_PORT = 4182;
const SETTINGS_STUB_PORT = 4183;
// Kept in sync with STUB_EVIDENCE_QUOTE in documents.spec.ts.
const STUB_EVIDENCE_QUOTE = "A large protest occurred at the capitol on July 10th";
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const STUB_SCRIPT = path.join(PROJECT_ROOT, "tests", "e2e", "lm-studio-stub.mjs");

function resetLocalDatabase() {
  const result = spawnSync(
    "docker",
    ["compose", "down", "--volumes", "--remove-orphans"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error("Could not reset the isolated Docker database volume.");
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
    run("npx.cmd", ["playwright", "test", "--workers=1", "tests/e2e/foundation.spec.ts", "tests/e2e/visual-responsive.spec.ts"], env);
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
        event_type: { existing: null },
        event_date: null,
        event_date_precision: null,
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
import hashlib
import os
import sqlite3

conn = sqlite3.connect("/data/database/terra-space.db")
events = conn.execute("SELECT review_status FROM events").fetchall()
assert any(row[0] == "draft" for row in events), f"expected a draft event, found {events}"

quotes = [row[0] for row in conn.execute("SELECT evidence_quote FROM event_sources").fetchall()]
assert any("${STUB_EVIDENCE_QUOTE}" in (quote or "") for quote in quotes), f"evidence quote missing from {quotes}"

# The e2e scenario uploads and deletes one attachment, then uploads a second
# that must survive document processing untouched, both on disk and in the DB.
attachments = conn.execute(
    "SELECT original_name, relative_path, checksum FROM attachments"
).fetchall()
assert len(attachments) == 1, f"expected exactly one surviving attachment, found {attachments}"
original_name, relative_path, checksum = attachments[0]
assert original_name == "kept.png", f"expected the kept attachment, found {original_name}"
file_path = os.path.join("/data", relative_path)
assert os.path.isfile(file_path), f"attachment file missing on disk: {file_path}"
with open(file_path, "rb") as handle:
    file_bytes = handle.read()
assert hashlib.sha256(file_bytes).hexdigest() == checksum, "attachment file bytes do not match checksum"

print("Verified: a draft event backed by the expected evidence quote exists, and the surviving attachment's file matches its checksum after processing.")
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
  // Kept in sync with UNMATCHED_QUOTE in event-review.spec.ts.
  const UNMATCHED_QUOTE = "A local official announced new port rules on 2026-07-10";

  const responseTable = [
    {
      match: UNMATCHED_QUOTE,
      extraction: singleEventExtraction(UNMATCHED_QUOTE, {
        title: "Untyped port-rules announcement",
        summary: "A local official announced new port rules.",
        event_type: { existing: null },
        event_date: "2026-07-10",
        event_date_precision: "exact",
        epistemic_status: "claim",
      }),
    },
  ];

  const stub = await startLmStudioStubProcess(EVENT_REVIEW_STUB_PORT, responseTable);
  const env = { TERRA_LM_STUDIO_URL: `http://host.docker.internal:${EVENT_REVIEW_STUB_PORT}` };
  resetLocalDatabase();

  const verifyScript = `
import sqlite3

conn = sqlite3.connect("/data/database/terra-space.db")

types = conn.execute("SELECT name FROM event_types").fetchall()
assert types == [("Diplomatic Statement",)], f"AI created an unexpected Event Type: {types}"

event = conn.execute("SELECT review_status, event_type_id FROM events WHERE title = 'Untyped port-rules announcement'").fetchone()
assert event is not None and event[0] == "approved" and event[1] is not None, event

print("Verified: an unmatched AI type stayed blank, no AI Event Type was created, and the reviewer assigned the approved type manually.")
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

async function runEventsDashboardScenario() {
  // Kept in sync with the quotes/titles in events-dashboard.spec.ts. These
  // records cover city, admin1, country, unmatched, and rejected cases.
  const JAKARTA_QUOTE = "A Jakarta field observation was recorded on 2026-07-10";
  const LOS_ANGELES_QUOTE = "A Los Angeles field observation was recorded on 2026-07-12";
  const UNKNOWN_DATE_QUOTE = "An undated briefing was received from the field";
  const UNMATCHED_QUOTE = "A report named an unknown location without a country";
  const REJECTED_QUOTE = "A rejected observation should remain out of approved views";

  const responseTable = [
    {
      match: JAKARTA_QUOTE,
      extraction: singleEventExtraction(JAKARTA_QUOTE, {
        title: "Jakarta field observation",
        summary: "A confirmed observation from Jakarta.",
        event_type: { existing: null },
        event_date: "2026-07-10",
        event_date_precision: "exact",
        epistemic_status: "confirmed",
        locations: [{ country: "ID", admin1: "DKI Jakarta", city_regency: "Jakarta" }],
      }),
    },
    {
      match: LOS_ANGELES_QUOTE,
      extraction: singleEventExtraction(LOS_ANGELES_QUOTE, {
        title: "Los Angeles field observation",
        summary: "A confirmed observation from California.",
        event_type: { existing: null },
        event_date: "2026-07-12",
        event_date_precision: "exact",
        epistemic_status: "confirmed",
        locations: [{ country: "US", admin1: "California", city_regency: null }],
      }),
    },
    {
      match: UNKNOWN_DATE_QUOTE,
      extraction: singleEventExtraction(UNKNOWN_DATE_QUOTE, {
        title: "Unknown-date briefing",
        summary: "A briefing whose date was not stated.",
        event_type: { existing: null },
        event_date: null,
        event_date_precision: "unknown",
        epistemic_status: "claim",
        locations: [{ country: "ID", admin1: null, city_regency: null }],
      }),
    },
    {
      match: UNMATCHED_QUOTE,
      extraction: singleEventExtraction(UNMATCHED_QUOTE, {
        title: "Unmatched location report",
        summary: "A report with a location that cannot be resolved locally.",
        event_type: { existing: null },
        event_date: "2026-07-14",
        event_date_precision: "exact",
        epistemic_status: "rumor",
        locations: [{ country: null, admin1: null, city_regency: "Atlantis" }],
      }),
    },
    {
      match: REJECTED_QUOTE,
      extraction: singleEventExtraction(REJECTED_QUOTE, {
        title: "Rejected observation",
        summary: "An observation deliberately rejected during review.",
        event_type: { existing: null },
        event_date: "2026-07-15",
        event_date_precision: "exact",
        epistemic_status: "denied",
        locations: [],
      }),
    },
  ];
  const stub = await startLmStudioStubProcess(EVENTS_DASHBOARD_STUB_PORT, responseTable);
  const env = { TERRA_LM_STUDIO_URL: `http://host.docker.internal:${EVENTS_DASHBOARD_STUB_PORT}` };
  resetLocalDatabase();

  const verifyScript = `
import json
import sqlite3
from urllib.request import urlopen

conn = sqlite3.connect("/data/database/terra-space.db")

event_rows = conn.execute("SELECT title, review_status, approved_at FROM events").fetchall()
statuses = {title: status for title, status, _approved_at in event_rows}
assert statuses == {
    "Jakarta observation updated": "approved",
    "Los Angeles field observation": "approved",
    "Unknown-date briefing": "approved",
    "Unmatched location report": "approved",
    "Rejected observation": "rejected",
}, statuses
assert all(approved_at is not None for _title, status, approved_at in event_rows if status == "approved")
assert all(approved_at is None for _title, status, approved_at in event_rows if status != "approved")

locations = {
    title: (latitude, longitude, precision)
    for title, latitude, longitude, precision in conn.execute(
        """
        SELECT e.title, l.latitude, l.longitude, l.coordinate_precision
        FROM events e
        LEFT JOIN event_locations el ON el.event_id = e.id
        LEFT JOIN locations l ON l.id = el.location_id
        """
    )
}
assert locations["Jakarta observation updated"][0] is not None and locations["Jakarta observation updated"][1] is not None
assert locations["Jakarta observation updated"][2] == "city_regency", locations
assert locations["Los Angeles field observation"][0] is not None and locations["Los Angeles field observation"][1] is not None
assert locations["Los Angeles field observation"][2] == "admin1", locations
assert locations["Unknown-date briefing"][0] is not None and locations["Unknown-date briefing"][1] is not None
assert locations["Unknown-date briefing"][2] == "country", locations
assert locations["Unmatched location report"] == (None, None, None), locations

with urlopen("http://backend:8000/api/events?review_status=approved") as response:
    approved_titles = {event["title"] for event in json.load(response)}
assert "Rejected observation" not in approved_titles, approved_titles
assert approved_titles == {
    "Jakarta observation updated",
    "Los Angeles field observation",
    "Unknown-date briefing",
    "Unmatched location report",
}, approved_titles

print("Verified: local coordinate precision, approved_at semantics, and approved-only API visibility.")
`.trim();

  try {
    await startTerraSpaceWithRetry(env);
    run("npx.cmd", ["playwright", "test", "tests/e2e/events-dashboard.spec.ts"], env);
    run("docker", ["compose", "run", "--rm", "backend", "python", "-c", verifyScript], env);
  } finally {
    run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
    stub.kill();
  }
}

async function runSettingsScenario() {
  // Kept in sync with ALPHA_CONTENT/BRAVO_CONTENT in settings.spec.ts. Bravo
  // fails once (schema-invalid output) so the browser can drive process ->
  // fail -> retry -> success against a stub that succeeds on the second call.
  const ALPHA_QUOTE = "alpha valid body";
  const BRAVO_QUOTE = "bravo failing body";

  const responseTable = [
    {
      match: ALPHA_QUOTE,
      extraction: singleEventExtraction(ALPHA_QUOTE, { title: "Alpha event" }),
    },
    {
      match: BRAVO_QUOTE,
      failTimes: 1,
      extraction: singleEventExtraction(BRAVO_QUOTE, { title: "Bravo event" }),
    },
  ];

  const stub = await startLmStudioStubProcess(SETTINGS_STUB_PORT, responseTable);
  const env = { TERRA_LM_STUDIO_URL: `http://host.docker.internal:${SETTINGS_STUB_PORT}` };
  resetLocalDatabase();

  const verifyScript = `
import sqlite3

conn = sqlite3.connect("/data/database/terra-space.db")

settings = conn.execute("SELECT lm_studio_base_url, lm_studio_model FROM app_settings").fetchone()
assert settings is not None, "expected an app_settings row"
assert settings[0] == "http://host.docker.internal:${SETTINGS_STUB_PORT}", settings
assert settings[1] == "stub-model", settings

types = {name: is_active for name, is_active in conn.execute("SELECT name, is_active FROM event_types").fetchall()}
assert "Manual Type" in types, types
assert types["Manual Type"] == 0, f"expected Manual Type deactivated, got {types}"
assert "Temp Type" not in types, f"expected Temp Type deleted, got {types}"

docs = {title: (status, error) for title, status, error in conn.execute("SELECT title, processing_status, processing_error FROM documents").fetchall()}
assert docs["Alpha valid report"][0] == "ready_for_review", docs
assert docs["Bravo failing report"][0] == "ready_for_review", docs
assert docs["Bravo failing report"][1] is None, f"expected retry to clear the error, got {docs}"

print("Verified: settings persistence, event-type management, and partial-failure retry recovery.")
`.trim();

  try {
    await startTerraSpaceWithRetry(env);
    run("npx.cmd", ["playwright", "test", "tests/e2e/settings.spec.ts"], env);
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
await sleep(5000);
await runEventsDashboardScenario();
await sleep(5000);
await runSettingsScenario();
