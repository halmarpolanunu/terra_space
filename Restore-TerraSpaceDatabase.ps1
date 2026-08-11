[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFolder
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
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

if (-not (Test-Path -LiteralPath $BackupFolder -PathType Container)) {
    throw "Backup folder not found: $BackupFolder"
}

$dumpFile = Join-Path $BackupFolder "terra-space-supabase.dump"
if (-not (Test-Path -LiteralPath $dumpFile -PathType Leaf)) {
    throw "That folder does not look like a Terra Space Supabase backup (no terra-space-supabase.dump inside): $BackupFolder. " +
        "If this is an old backup from before the Supabase transition (a 'terra-space.db' file), see the " +
        "'Legacy SQLite rollback' section in README.md instead -- it is not restored by this script."
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

# Refuse anything that is not clearly the local Supabase instance -- this script must never be
# able to overwrite a remote or production database by accident.
if ($databaseUrl -notmatch "@(localhost|127\.0\.0\.1|host\.docker\.internal):") {
    throw "TERRA_DATABASE_URL does not point at a local Supabase instance (expected localhost, " +
        "127.0.0.1, or host.docker.internal). Refusing to restore -- this script only restores " +
        "into your local Terra Space Supabase database."
}

Write-Host "This will replace Terra Space's application tables in your local Supabase database with the backup at: $BackupFolder"
Write-Host "This does not touch the pipeline's own phase2_* tables or any other Supabase project data."
Write-Host "Make sure Terra Space is stopped first (.\Stop-TerraSpace.ps1)."
$confirmation = Read-Host "Type YES to continue"
if ($confirmation -ne "YES") {
    Write-Host "Cancelled. Nothing was changed."
    exit 0
}

$backupFull = (Resolve-Path -LiteralPath $BackupFolder).Path

Push-Location $projectRoot
try {
    docker run --rm `
        --add-host=host.docker.internal:host-gateway `
        -v "${backupFull}:/restore_src:ro" `
        postgres:17-alpine `
        pg_restore --clean --if-exists --no-owner -d "$databaseUrl" /restore_src/terra-space-supabase.dump
    if ($LASTEXITCODE -ne 0) {
        throw "Could not restore Terra Space's tables into the local Supabase database."
    }

    Write-Host "Terra Space's database tables were restored from $BackupFolder."
    Write-Host "Attachments are not restored automatically -- if attachments-manifest.json is present in that folder, compare it against data\attachments and copy back any files it lists that are missing."
    Write-Host "You can start Terra Space again now."
}
finally {
    Pop-Location
}
