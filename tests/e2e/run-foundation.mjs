import { spawnSync } from "node:child_process";

const powershell = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"];

function run(command, args) {
  const usesWindowsCommandShell = process.platform === "win32" && command === "npx.cmd";
  const result = spawnSync(
    usesWindowsCommandShell ? "cmd.exe" : command,
    usesWindowsCommandShell ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args,
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`${command} failed.`);
  }
}

try {
  run("powershell", [...powershell, ".\\Start-TerraSpace.ps1"]);
  run("npx.cmd", ["playwright", "test"]);
} finally {
  run("powershell", [...powershell, ".\\Stop-TerraSpace.ps1"]);
}
