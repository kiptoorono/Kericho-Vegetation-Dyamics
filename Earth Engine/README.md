# Google Earth Engine Scripts

Earth Engine scripts for extracting vegetation and climate variables over Kericho County, Kenya, at the ward level (GADM level 3).

## Scripts

| File | Purpose | Output |
|---|---|---|
| `s2_ndvi_video.js` | Sentinel-2 NDVI animation (2020–2025) | MP4 |
| `s2_ndvi_ward_timeseries.js` | Sentinel-2 NDVI + stdDev + count | CSV |
| `modis_ndvi_video.js` | MODIS NDVI animation (comparison) | MP4 |
| `extract_modis.js` | MODIS MOD13Q1 NDVI + EVI (2000–2025) | CSV |
| `extract_chirps.js` | CHIRPS monthly rainfall total | CSV |
| `extract_era5.js` | ERA5-Land temp, precip, evap, soil moisture | CSV |
| `extract_landcover.js` | ESA CCI Land Cover majority class per ward | CSV |
| `extract_fapar.js` | NOAA VIIRS LAI + FAPAR | CSV |
| `extract_smap.js` | SMAP L4 surface + root-zone soil moisture | CSV |

## Output Conventions

All extraction scripts share the same key columns:

| Column | Description |
|---|---|
| `ward_name` | GADM level-3 name (`NAME_3`) |
| `ward_id` | GADM level-3 ID (`GID_3`) |
| `county` | GADM level-1 name (`NAME_1`) |
| `month` | `YYYY-MM` string |

**Exception:** `extract_landcover.js` has no `month` column — it's static per-ward metadata (one row per ward).

## Scaling Conventions

| Dataset | Variable | Raw Unit | Scale Factor | Real Unit |
|---|---|---|---|---|
| Sentinel-2 | NDVI | Int16 | × 10000 | −1 to 1 |
| MODIS MOD13Q1 | NDVI, EVI | Int16 | × 0.0001 | −1 to 1 |
| CHIRPS | precipitation | Float | none (already mm) | mm/month |
| ERA5-Land | temperature_2m | K | −273.15 | °C |
| ERA5-Land | total_precipitation_sum | m | × 1000 | mm/month |
| ERA5-Land | potential_evaporation_sum | m (negative) | × −1000 | mm/month |
| ERA5-Land | volumetric_soil_water_* | m³/m³ | none | m³/m³ |
| NOAA VIIRS | LAI, FAPAR | Int16 | × 0.001 | LAI: 0–6; FAPAR: 0–1 |
| SMAP L4 | sm_surface, sm_rootzone | m³/m³ | none | m³/m³ |
| ESA CCI LC | discrete_classification | int class code | none | class label |

## Common Pitfalls

| Issue | Detail |
|---|---|
| Excel corrupts month strings | Excel auto-converts `YYYY-MM` month strings into dates. Never open the CSVs in Excel; use `pandas.read_csv`. |
| Multi-band column naming | Multi-band `reduceRegions` outputs are named `<band>_<reducer>` (e.g. `NDVI_mean`), not just `mean`. |
| Land cover reducer | `extract_landcover.js` uses a `mode` reducer, not `mean` — the resulting column is called `mode`. |
| ERA5 evaporation sign | ERA5 `potential_evaporation_sum` is stored negative (ECMWF convention); the script flips the sign. |
