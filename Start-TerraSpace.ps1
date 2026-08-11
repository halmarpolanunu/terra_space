[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$mapPath = Join-Path $projectRoot "data\maps\world-low-detail.pmtiles"
$envPath = Join-Path $projectRoot ".env"

function Get-DotEnvValue {
    param([string]$Path, [string]$Key)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ($trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }
        $parts = $trimmed.Split("=", 2)
        if ($parts[0].Trim() -eq $Key) {
            return $parts[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not available in PowerShell. Install Docker Desktop, then try again."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait until it is ready, then try again."
}

if (-not (Test-Path -LiteralPath $mapPath -PathType Leaf)) {
    throw "The offline map is missing. Run .\tools\maps\Build-WorldLowDetailMap.ps1 first. Nothing was downloaded automatically."
}

# Terra Space needs its own database connection string to start -- see
# project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md. Fail fast here with a
# plain-language message instead of waiting out the full startup timeout below. LM Studio is
# checked separately (project-knowledge/decisions and the Settings page) and never blocks startup.
$databaseUrl = $env:TERRA_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    $databaseUrl = Get-DotEnvValue -Path $envPath -Key "TERRA_DATABASE_URL"
}
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "TERRA_DATABASE_URL is not set. Copy .env.example to .env and set TERRA_DATABASE_URL to " +
        "your local Supabase instance's connection string, then try again. See .env.example and " +
        "project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md for details."
}

$supabasePort = $null
if ($databaseUrl -match ":(\d+)/") {
    $supabasePort = [int]$Matches[1]
}
if ($null -ne $supabasePort) {
    $probe = Test-NetConnection -ComputerName "localhost" -Port $supabasePort -WarningAction SilentlyContinue
    if (-not $probe.TcpTestSucceeded) {
        throw "Local Supabase does not appear to be running on localhost:$supabasePort. Start your " +
            "local Supabase instance first (see project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md), " +
            "then try again."
    }
}

Push-Location $projectRoot
try {
    docker compose up --build --detach
    if ($LASTEXITCODE -ne 0) {
        throw "Terra Space could not be started."
    }

    $deadline = (Get-Date).AddSeconds(90)
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000" -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "Terra Space is ready. Open http://localhost:3000"
                exit 0
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    docker compose ps
    docker compose logs backend --tail 30
    throw "Terra Space did not become ready within 90 seconds. Review the service status and " +
        "backend log lines above -- a common cause is TERRA_DATABASE_URL pointing at an " +
        "unreachable or misconfigured local Supabase instance."
}
finally {
    Pop-Location
}
