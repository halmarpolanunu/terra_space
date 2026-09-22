[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$packageRoot = $PSScriptRoot
$manifestPath = Join-Path $packageRoot "manifest.json"
$workflowRoot = Join-Path $packageRoot "workflows"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$forbiddenPatterns = @('"credentials"', 'sb_secret_', 'service_role_key', '"password"')

foreach ($workflow in $manifest.workflowFiles) {
    $path = Join-Path $workflowRoot $workflow.file
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing workflow file: $($workflow.file)"
    }

    $content = Get-Content -LiteralPath $path -Raw
    $json = $content | ConvertFrom-Json
    if ($json.active -ne $false) {
        throw "$($workflow.file) is not marked inactive."
    }
    foreach ($pattern in $forbiddenPatterns) {
        if ($content.Contains($pattern)) {
            throw "$($workflow.file) contains a blocked credential marker: $pattern"
        }
    }
}

Write-Host "Portable n8n package passed: $($manifest.workflowFiles.Count) inactive, credential-free workflow exports are present."
