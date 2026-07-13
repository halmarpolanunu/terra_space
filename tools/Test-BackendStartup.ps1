[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Join-Path $PSScriptRoot ".."

Push-Location $projectRoot
try {
    docker compose up --detach backend
    if ($LASTEXITCODE -ne 0) {
        throw "The backend container could not be started."
    }

    $deadline = (Get-Date).AddSeconds(30)
    do {
        $state = docker compose ps backend --format json | ConvertFrom-Json
        if ($state.Health -eq "healthy") {
            Write-Host "Backend startup passed."
            exit 0
        }
        if ($state.State -eq "exited") {
            docker compose logs backend
            throw "The backend exited before becoming healthy."
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    docker compose logs backend
    throw "The backend did not become healthy within 30 seconds."
}
finally {
    docker compose down
    Pop-Location
}
