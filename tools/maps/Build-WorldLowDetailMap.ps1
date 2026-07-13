[CmdletBinding()]
param(
    [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $PSScriptRoot '..\..\data\maps\world-low-detail.pmtiles'
}

$tippecanoeCommit = '7fc82a1796e6d99c6a1fbd96318f6295a46df512'
$tippecanoeImage = "terra-space-tippecanoe:$tippecanoeCommit"
$gdalImage = 'ghcr.io/osgeo/gdal:ubuntu-small-3.10.3'
$sources = @(
    @{ Name = 'land'; Url = 'https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip'; Sha256 = '1926C621AFD6AC67C3F36639BB1236134A48D82226DC675D3E3DF53D02D2A3DE'; Shapefile = 'ne_110m_land.shp' },
    @{ Name = 'countries'; Url = 'https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip'; Sha256 = '0F243AEAC8AC6CF26F0417285B0BD33AC47F1B5BDB719FD3E0DF37D03EA37110'; Shapefile = 'ne_110m_admin_0_countries.shp' },
    @{ Name = 'admin1'; Url = 'https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_1_states_provinces.zip'; Sha256 = '61F79E6705E62A55D6BCF698394295A589AF5E24A4B2684C6519DD35C1300BF6'; Shapefile = 'ne_50m_admin_1_states_provinces.shp' },
    @{ Name = 'places'; Url = 'https://naciscdn.org/naturalearth/110m/cultural/ne_110m_populated_places.zip'; Sha256 = '29B901A2AE0A745741C0642123480E31101ED723086C4D0CAE657A8D722C3B28'; Shapefile = 'ne_110m_populated_places.shp' }
)

$output = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $output
$work = Join-Path ([IO.Path]::GetTempPath()) ('terra-space-map-' + [guid]::NewGuid().ToString('N'))
$tippecanoeSource = Join-Path $work 'tippecanoe'

function Invoke-Docker {
    param([string[]]$Arguments)
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: docker $($Arguments -join ' ')" }
}

try {
    New-Item -ItemType Directory -Force -Path $outputDirectory, $work, (Join-Path $work 'input'), (Join-Path $work 'geo'), (Join-Path $work 'output') | Out-Null

    foreach ($source in $sources) {
        $archive = Join-Path (Join-Path $work 'input') ([IO.Path]::GetFileName($source.Url))
        Invoke-WebRequest -Uri $source.Url -OutFile $archive
        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash
        if ($actualHash -ne $source.Sha256) { throw "Checksum mismatch for $($source.Name)." }
        Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $work 'input') -Force
    }

    & git init $tippecanoeSource
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Tippecanoe source directory.' }
    & git -C $tippecanoeSource remote add origin 'https://github.com/felt/tippecanoe.git'
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure the Tippecanoe source remote.' }
    & git -C $tippecanoeSource fetch --depth 1 origin $tippecanoeCommit
    if ($LASTEXITCODE -ne 0) { throw 'Could not download the pinned Tippecanoe source.' }
    & git -C $tippecanoeSource checkout --detach FETCH_HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Could not check out the pinned Tippecanoe revision.' }
    Invoke-Docker @('build', '--tag', $tippecanoeImage, '--file', (Join-Path $PSScriptRoot 'tippecanoe.Dockerfile'), $tippecanoeSource)
    foreach ($source in $sources) {
        $inputShapefile = "/work/input/$($source.Shapefile)"
        $outputGeoJson = "/work/geo/$($source.Name).geojson"
        Invoke-Docker @('run', '--rm', '--mount', "type=bind,source=$work,target=/work", $gdalImage, 'ogr2ogr', '-f', 'GeoJSON', '-t_srs', 'EPSG:4326', $outputGeoJson, $inputShapefile)
        Invoke-Docker @('run', '--rm', '--mount', "type=bind,source=$work,target=/work", $tippecanoeImage, 'tippecanoe', '-Z0', '-z5', '--force', '--drop-densest-as-needed', '-l', $source.Name, '-o', "/work/output/$($source.Name).pmtiles", $outputGeoJson)
    }

    Invoke-Docker @('run', '--rm', '--mount', "type=bind,source=$work,target=/work", $tippecanoeImage, 'tile-join', '--force', '-o', '/work/output/world-low-detail.pmtiles', '/work/output/land.pmtiles', '/work/output/countries.pmtiles', '/work/output/admin1.pmtiles', '/work/output/places.pmtiles')
    Move-Item -Force -LiteralPath (Join-Path $work 'output\world-low-detail.pmtiles') -Destination $output
    Write-Host "Offline world map created: $output"
}
finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
