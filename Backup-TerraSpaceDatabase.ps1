[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

# Terra Space's own application tables in the shared local Supabase database -- see
# project-knowledge/decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md. This intentionally
# excludes the phase2_* pipeline tables n8n owns: this backup is application rollback material,
# not a whole-database dump, so it can never disturb pipeline-owned data.
$appTables = @(
    "terra_space_phase1_sources",
    "terra_space_phase1_attachments",
    "terra_space_phase3_event_types",
    "terra_space_phase3_taxonomy_nodes",
    "terra_space_phase3_actors",
    "terra_space_phase3_actor_aliases",
    "terra_space_phase3_locations",
    "terra_space_phase3_events",
    "terra_space_phase3_event_actors",
    "terra_space_phase3_event_sources",
    "terra_space_phase3_event_locations",
    "terra_space_phase3_duplicate_flags",
    "terra_space_phase3_event_runs",
    "terra_space_app_settings"
)

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

$databaseUrl = $env:TERRA_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    $databaseUrl = Get-DotEnvValue -Path $envPath -Key "TERRA_DATABASE_URL"
}
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "TERRA_DATABASE_URL is not set. Copy .env.example to .env and set it to your local Supabase " +
        "instance's connection string first."
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$destRelative = "data\database-backups\$stamp"
$dest = Join-Path $projectRoot $destRelative

Push-Location $projectRoot
try {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null

    $tableArgs = ($appTables | ForEach-Object { "--table=$_" }) -join " "
    docker run --rm `
        --add-host=host.docker.internal:host-gateway `
        -v "${dest}:/backup_dest" `
        postgres:17-alpine `
        sh -c "pg_dump `"$databaseUrl`" --format=custom $tableArgs --file=/backup_dest/terra-space-supabase.dump"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not dump Terra Space's tables from the local Supabase database."
    }

    # Attachment directory manifest: relative path, size, and a checksum for every file, so a
    # restore can be verified against what was actually backed up.
    $attachmentsRoot = Join-Path $projectRoot "data\attachments"
    $manifestPath = Join-Path $dest "attachments-manifest.json"
    $manifestEntries = @()
    if (Test-Path -LiteralPath $attachmentsRoot -PathType Container) {
        $manifestEntries = Get-ChildItem -LiteralPath $attachmentsRoot -Recurse -File | ForEach-Object {
            [PSCustomObject]@{
                path   = [System.IO.Path]::GetRelativePath($attachmentsRoot, $_.FullName) -replace "\\", "/"
                size   = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        }
    }
    ($manifestEntries | ConvertTo-Json -Depth 3) | Set-Content -LiteralPath $manifestPath -Encoding utf8

    Write-Host "Terra Space's database tables and an attachments manifest were backed up to $destRelative"
    Write-Host "For a full backup, also copy the whole 'data' folder somewhere safe (it includes this backup plus your actual attachments, map, and logs)."
}
finally {
    Pop-Location
}
