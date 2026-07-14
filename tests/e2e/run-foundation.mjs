import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const powershell = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"];
const STUB_PORT = 4180;
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
async function startLmStudioStubProcess(port, evidenceQuote) {
  const child = spawn("node", [STUB_SCRIPT, String(port), evidenceQuote], {
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

async function runDocumentsScenario() {
  const stub = await startLmStudioStubProcess(STUB_PORT, STUB_EVIDENCE_QUOTE);
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

await runFoundationScenario();
await sleep(5000);
await runDocumentsScenario();
