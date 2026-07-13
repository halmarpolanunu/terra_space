[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not available in PowerShell."
}

Push-Location $PSScriptRoot
try {
    docker compose down
    if ($LASTEXITCODE -ne 0) {
        throw "Terra Space could not be stopped cleanly."
    }

    Write-Host "Terra Space has stopped. Your local data in the data folder remains safe."
}
finally {
    Pop-Location
}
