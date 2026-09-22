[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$N8nContainer
)

$ErrorActionPreference = "Stop"
$packageRoot = $PSScriptRoot
$workflowRoot = Join-Path $packageRoot "workflows"
$manifestPath = Join-Path $packageRoot "manifest.json"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "The workflow manifest is missing: $manifestPath"
}
if (-not (Test-Path -LiteralPath $workflowRoot -PathType Container)) {
    throw "The workflow folder is missing: $workflowRoot"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop is required to import into this n8n setup."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running. Start it, wait until it is ready, then run this command again."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$missingFiles = @(
    $manifest.workflowFiles |
        Where-Object { -not (Test-Path -LiteralPath (Join-Path $workflowRoot $_.file) -PathType Leaf) } |
        ForEach-Object { $_.file }
)
if ($missingFiles.Count -gt 0) {
    throw "The package is incomplete. Missing: $($missingFiles -join ', ')"
}

if ([string]::IsNullOrWhiteSpace($N8nContainer)) {
    $candidates = @(
        docker ps --format "{{.Names}}|{{.Image}}" |
            Where-Object { $_ -match "(?i)n8n" }
    )
    if ($candidates.Count -ne 1) {
        $shown = if ($candidates.Count -eq 0) { "none" } else { $candidates -join "; " }
        throw "I could not identify one running n8n container. Found: $shown. Run again with -N8nContainer <your-container-name>."
    }
    $N8nContainer = ($candidates[0] -split "\|", 2)[0]
}

$workflowCount = $manifest.workflowFiles.Count
if (-not $PSCmdlet.ShouldProcess($N8nContainer, "Import $workflowCount inactive Terra Space workflows")) {
    return
}

docker exec $N8nContainer sh -lc "rm -rf /tmp/terra-space-n8n && mkdir -p /tmp/terra-space-n8n/workflows"
if ($LASTEXITCODE -ne 0) {
    throw "Could not prepare the n8n container '$N8nContainer'. Confirm it is a running n8n container."
}

try {
    docker cp "$workflowRoot/." "$($N8nContainer):/tmp/terra-space-n8n/workflows"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy the workflow files into the n8n container."
    }

    docker exec $N8nContainer n8n import:workflow --separate --input=/tmp/terra-space-n8n/workflows
    if ($LASTEXITCODE -ne 0) {
        throw "n8n could not import the workflows. No workflows were activated by this script."
    }
}
finally {
    docker exec $N8nContainer sh -lc "rm -rf /tmp/terra-space-n8n" *> $null
}

Write-Host "Imported $workflowCount Terra Space workflows as inactive copies."
Write-Host "In n8n, move them into the Terra_Space folder, attach the credentials listed in manifest.json, validate each workflow, and keep them inactive until you are ready."
