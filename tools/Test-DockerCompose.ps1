[CmdletBinding()]
param(
    [string]$ComposeFile = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
    $ComposeFile = Join-Path $PSScriptRoot "..\docker-compose.yml"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not available in PowerShell."
}

docker compose --file $ComposeFile config --quiet
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose configuration is invalid."
}

$resolved = docker compose --file $ComposeFile config --format json | ConvertFrom-Json
$serviceNames = @($resolved.services.PSObject.Properties.Name | Sort-Object)

if (@($serviceNames).Count -ne 2 -or $serviceNames -notcontains "backend" -or $serviceNames -notcontains "frontend") {
    throw "Compose must define exactly the backend and frontend services."
}

$backendDataMount = @($resolved.services.backend.volumes | Where-Object { $_.type -eq "bind" -and $_.target -eq "/data" })
if ($backendDataMount.Count -ne 1) {
    throw "The backend must mount ./data at /data."
}

if ($null -eq $resolved.services.frontend.depends_on.backend -or $resolved.services.frontend.depends_on.backend.condition -ne "service_healthy") {
    throw "The frontend must depend on a healthy backend."
}

$hostGateway = @($resolved.services.backend.extra_hosts | Where-Object { $_ -match "^host\.docker\.internal[=:]host-gateway$" })
if ($hostGateway.Count -ne 1) {
    throw "The backend must map host.docker.internal to host-gateway."
}

$localFrontendPort = @($resolved.services.frontend.ports | Where-Object { $_.host_ip -eq "127.0.0.1" -and $_.target -eq 3000 -and $_.published -eq "3000" })
if ($localFrontendPort.Count -ne 1) {
    throw "The frontend must expose only 127.0.0.1:3000:3000."
}

Write-Host "Docker Compose configuration passed."
