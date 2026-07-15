[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not available in PowerShell. Install Docker Desktop, then try again."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait until it is ready, then try again."
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$destRelative = "data\database-backups\$stamp"
$dest = Join-Path $projectRoot $destRelative

Push-Location $projectRoot
try {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null

    docker compose run --rm -v "${dest}:/backup_dest" backend sh -c "cp -a /data/database/. /backup_dest/"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy the database out of Docker."
    }

    Write-Host "Database backed up to $destRelative"
    Write-Host "For a full backup, also copy the whole 'data' folder somewhere safe (it includes this backup plus your attachments and map)."
}
finally {
    Pop-Location
}
