[CmdletBinding()]
param(
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

$script:Results = @()
$allowedStatuses = @('draft', 'active', 'planned', 'in-progress', 'blocked', 'completed', 'superseded')
$requiredBundleFiles = @(
    'Project-knowledge-Index.md',
    'North-Star.md',
    'Current-Status.md',
    'Roadmap.md',
    'Project-Knowledge-Log.md',
    'decisions\Decisions-Index.md'
)
$requiredTemplates = @('Decision.md')

function Add-Result {
    param([string]$Level, [string]$File, [string]$Message)
    $script:Results += [pscustomobject]@{ Level = $Level; File = $File; Message = $Message }
}

function Get-RelativePath {
    param([string]$BasePath, [string]$FullPath)
    $base = [IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
    $full = [IO.Path]::GetFullPath($FullPath)
    if ($full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) {
        return $full.Substring($base.Length).Replace('\', '/')
    }
    return $full.Replace('\', '/')
}

function Get-Frontmatter {
    param([string]$Content, [string]$RelativeFile)

    $match = [regex]::Match($Content, '\A---\s*\r?\n(?<yaml>[\s\S]*?)\r?\n---(?:\r?\n|\z)')
    if (-not $match.Success) {
        Add-Result 'ERROR' $RelativeFile 'Missing YAML frontmatter delimited by --- lines.'
        return $null
    }

    $fields = @{}
    $lineNumber = 1
    foreach ($line in ($match.Groups['yaml'].Value -split '\r?\n')) {
        $lineNumber++
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) { continue }
        $field = [regex]::Match($line, '^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$')
        if (-not $field.Success) {
            Add-Result 'ERROR' $RelativeFile ("Unsupported YAML syntax on frontmatter line {0}: {1}" -f $lineNumber, $line.Trim())
            continue
        }
        $key = $field.Groups[1].Value
        $value = $field.Groups[2].Value.Trim()
        if ($fields.ContainsKey($key)) {
            Add-Result 'ERROR' $RelativeFile ("Duplicate YAML key: {0}" -f $key)
            continue
        }
        if (($value.StartsWith('"') -and -not $value.EndsWith('"')) -or ($value.StartsWith("'") -and -not $value.EndsWith("'"))) {
            Add-Result 'ERROR' $RelativeFile ("Unclosed quoted YAML value for key: {0}" -f $key)
        }
        if ($value.StartsWith('[') -and -not $value.EndsWith(']')) {
            Add-Result 'ERROR' $RelativeFile ("Unclosed YAML list for key: {0}" -f $key)
        }
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $fields[$key] = $value
    }

    return [pscustomobject]@{ Fields = $fields; Body = $Content.Substring($match.Length) }
}

function Test-OkfDocument {
    param([string]$FilePath, [string]$RelativeFile, [switch]$Template)

    $content = Get-Content -LiteralPath $FilePath -Raw
    $frontmatter = Get-Frontmatter -Content $content -RelativeFile $RelativeFile
    if ($null -eq $frontmatter) { return }

    foreach ($requiredKey in @('type', 'title', 'description')) {
        if (-not $frontmatter.Fields.ContainsKey($requiredKey) -or [string]::IsNullOrWhiteSpace($frontmatter.Fields[$requiredKey])) {
            Add-Result 'ERROR' $RelativeFile ("Required YAML field is missing or empty: {0}" -f $requiredKey)
        }
    }

    if ($frontmatter.Fields.ContainsKey('status') -and $frontmatter.Fields['status'] -notin $allowedStatuses) {
        Add-Result 'ERROR' $RelativeFile ("Unsupported status '{0}'." -f $frontmatter.Fields['status'])
    }

    if ($frontmatter.Fields.ContainsKey('type') -and $frontmatter.Fields['type'] -eq 'Milestone') {
        if (-not $frontmatter.Fields.ContainsKey('build_phase') -or [string]::IsNullOrWhiteSpace($frontmatter.Fields['build_phase'])) {
            Add-Result 'ERROR' $RelativeFile 'Milestone requires a non-empty build_phase field.'
        }
    }

    if (-not $Template -and [string]::IsNullOrWhiteSpace($frontmatter.Body)) {
        Add-Result 'ERROR' $RelativeFile 'Markdown body is empty.'
    }
}

function Resolve-MarkdownLink {
    param([string]$SourceFile, [string]$Target)
    $cleanTarget = ($Target -split '[#?]', 2)[0]
    if ([string]::IsNullOrWhiteSpace($cleanTarget)) { return $null }
    $decoded = [Uri]::UnescapeDataString($cleanTarget).Replace('/', '\')
    return [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $SourceFile) $decoded))
}

$root = [IO.Path]::GetFullPath($ProjectRoot)
$bundleRoot = Join-Path $root 'project-knowledge'
$templateRoot = Join-Path $root '.project-template\okf-templates'

if (-not (Test-Path -LiteralPath $bundleRoot -PathType Container)) {
    Add-Result 'ERROR' 'project-knowledge' 'Project Knowledge directory is missing.'
}
else {
    foreach ($relative in $requiredBundleFiles) {
        $path = Join-Path $bundleRoot $relative
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            Add-Result 'ERROR' ($relative.Replace('\', '/')) 'Required Project Knowledge file is missing.'
        }
    }

    $legacyIndexes = @(Get-ChildItem -LiteralPath $bundleRoot -Recurse -File | Where-Object { $_.Name -ieq 'index.md' })
    foreach ($legacyIndex in $legacyIndexes) {
        Add-Result 'ERROR' (Get-RelativePath $bundleRoot $legacyIndex.FullName) 'Legacy index.md filename is not allowed; use the named group index.'
    }

    $bundleDocuments = @(Get-ChildItem -LiteralPath $bundleRoot -Recurse -Filter '*.md' -File)
    foreach ($document in $bundleDocuments) {
        $relative = Get-RelativePath $bundleRoot $document.FullName
        Test-OkfDocument -FilePath $document.FullName -RelativeFile $relative

        $content = Get-Content -LiteralPath $document.FullName -Raw
        foreach ($link in [regex]::Matches($content, '\[[^\]]+\]\((?<target>[^)]+)\)')) {
            $target = $link.Groups['target'].Value.Trim()
            if ($target -match '^(?i:https?|mailto):' -or $target.StartsWith('#')) { continue }
            try {
                $resolved = Resolve-MarkdownLink -SourceFile $document.FullName -Target $target
                if ($null -ne $resolved -and -not (Test-Path -LiteralPath $resolved)) {
                    Add-Result 'ERROR' $relative ("Broken internal link: {0}" -f $target)
                }
            }
            catch {
                Add-Result 'ERROR' $relative ("Invalid internal link: {0}" -f $target)
            }
        }
    }

    $mainIndexPath = Join-Path $bundleRoot 'Project-knowledge-Index.md'
    if (Test-Path -LiteralPath $mainIndexPath) {
        $mainIndex = Get-Content -LiteralPath $mainIndexPath -Raw
        foreach ($requiredLink in @(
            'North-Star.md', 'Current-Status.md', 'Roadmap.md',
            'Project-Knowledge-Log.md', 'decisions/Decisions-Index.md'
        )) {
            if ($mainIndex -notmatch [regex]::Escape('(' + $requiredLink + ')')) {
                Add-Result 'ERROR' 'Project-knowledge-Index.md' ("Missing direct link: {0}" -f $requiredLink)
            }
        }
    }

    $groupIndex = 'decisions\Decisions-Index.md'
    $indexPath = Join-Path $bundleRoot $groupIndex
    if (Test-Path -LiteralPath $indexPath) {
        $content = Get-Content -LiteralPath $indexPath -Raw
        if ($content -notmatch [regex]::Escape('(../Project-knowledge-Index.md)')) {
            Add-Result 'ERROR' 'decisions/Decisions-Index.md' 'Decisions Index must link back to ../Project-knowledge-Index.md.'
        }
        $directory = Split-Path -Parent $indexPath
        foreach ($concept in @(Get-ChildItem -LiteralPath $directory -Filter '*.md' -File | Where-Object { $_.FullName -ne $indexPath })) {
            if ($content -notmatch [regex]::Escape('(' + $concept.Name + ')')) {
                Add-Result 'ERROR' 'decisions/Decisions-Index.md' ("Index does not list decision: {0}" -f $concept.Name)
            }
        }
    }
}

if (-not (Test-Path -LiteralPath $templateRoot -PathType Container)) {
    Add-Result 'ERROR' '.project-template/okf-templates' 'OKF concept-template directory is missing.'
}
else {
    foreach ($templateName in $requiredTemplates) {
        $templatePath = Join-Path $templateRoot $templateName
        if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) {
            Add-Result 'ERROR' ('.project-template/okf-templates/' + $templateName) 'Required concept template is missing.'
        }
        else {
            Test-OkfDocument -FilePath $templatePath -RelativeFile ('.project-template/okf-templates/' + $templateName) -Template
        }
    }
}

$adapterChecks = @{
    'AGENTS.md' = 'project-knowledge/Project-knowledge-Index.md'
    'CLAUDE.md' = '@AGENTS.md'
    'GEMINI.md' = '@./AGENTS.md'
    '.agents\rules\project-knowledge.md' = '@../../AGENTS.md'
}
foreach ($relativePath in $adapterChecks.Keys) {
    $path = Join-Path $root $relativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Add-Result 'ERROR' ($relativePath.Replace('\', '/')) 'Required AI-agent instruction adapter is missing.'
    }
    elseif ((Get-Content -LiteralPath $path -Raw) -notmatch [regex]::Escape($adapterChecks[$relativePath])) {
        Add-Result 'ERROR' ($relativePath.Replace('\', '/')) ("Required instruction reference is missing: {0}" -f $adapterChecks[$relativePath])
    }
}

$errors = @($script:Results | Where-Object { $_.Level -eq 'ERROR' })
$warnings = @($script:Results | Where-Object { $_.Level -eq 'WARNING' })

foreach ($result in $script:Results) {
    $color = if ($result.Level -eq 'ERROR') { 'Red' } elseif ($result.Level -eq 'WARNING') { 'Yellow' } else { 'Green' }
    Write-Host ("{0}: {1} - {2}" -f $result.Level, $result.File, $result.Message) -ForegroundColor $color
}

if ($errors.Count -eq 0) {
    Write-Host 'OK: Lean Project Knowledge structure, YAML frontmatter, links, decision template, and agent adapters are valid.' -ForegroundColor Green
}
Write-Host ("Summary: {0} error(s), {1} warning(s)." -f $errors.Count, $warnings.Count)

if ($errors.Count -gt 0) { exit 1 }
