[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFolder
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

if (-not (Test-Path -LiteralPath $BackupFolder -PathType Container)) {
    throw "Backup folder not found: $BackupFolder"
}

$dbFile = Join-Path $BackupFolder "terra-space.db"
if (-not (Test-Path -LiteralPath $dbFile -PathType Leaf)) {
    throw "That folder does not look like a database backup (no terra-space.db inside): $BackupFolder"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not available in PowerShell. Install Docker Desktop, then try again."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait until it is ready, then try again."
}

Write-Host "This will replace the current live database with the backup at: $BackupFolder"
Write-Host "Make sure Terra Space is stopped first (.\Stop-TerraSpace.ps1)."
$confirmation = Read-Host "Type YES to continue"
if ($confirmation -ne "YES") {
    Write-Host "Cancelled. Nothing was changed."
    exit 0
}

$backupFull = (Resolve-Path -LiteralPath $BackupFolder).Path

Push-Location $projectRoot
try {
    docker compose run --rm -v "${backupFull}:/restore_src:ro" backend sh -c "rm -f /data/database/*.db /data/database/*.db-shm /data/database/*.db-wal && cp -a /restore_src/. /data/database/"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not restore the database into Docker."
    }

    Write-Host "Database restored from $BackupFolder. You can start Terra Space again."
}
finally {
    Pop-Location
}
