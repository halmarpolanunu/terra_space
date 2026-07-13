# Offline world map

Run this command once while connected to the internet:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\maps\Build-WorldLowDetailMap.ps1
```

It creates `world-low-detail.pmtiles` in this folder. The file is intentionally not committed to Git because it is generated data.

The package uses Natural Earth public-domain vector data: 1:110m land, countries, and populated places, plus 1:50m first-level administrative areas. It is a low-detail global reference map for country, province/state, and major-city context. Natural Earth data is free for use; retain this attribution when redistributing the package.

The script checks the SHA-256 checksum of every downloaded archive before converting it. It uses Docker to build a pinned Tippecanoe revision and to run GDAL, so no separate GIS application is needed on Windows.
