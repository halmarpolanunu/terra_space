[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$mapPath = Join-Path $projectRoot "data\maps\world-low-detail.pmtiles"

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
    throw "Terra Space did not become ready within 90 seconds. Review the service status above."
}
finally {
    Pop-Location
}
