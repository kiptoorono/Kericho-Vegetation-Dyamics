# Vegetation Dynamics in Kenya's Tea Highlands

A multi-sensor analysis of vegetation change in Kericho County, Kenya,
combining 26 years of MODIS NDVI with high-resolution Sentinel-2 imagery
and gridded climate data (CHIRPS rainfall, ERA5-Land, SMAP soil moisture).

**Status:** data pipeline complete; analysis in progress.

---

## The question

Kericho County produces a significant share of Kenya's tea exports and
supports hundreds of thousands of smallholder livelihoods. How has
vegetation productivity in the region changed over the past two decades,
and to what extent is that change driven by rainfall, temperature, and
soil moisture?

This project builds a ward-level (GADM level 3, 30 wards) time series of
NDVI and climate variables from 2000–2025 and quantifies trends,
seasonality, and climate sensitivity.

---

## Data

| Dataset | Variable | Resolution | Period | Source |
|---|---|---|---|---|
| MODIS MOD13Q1 | NDVI, EVI | 250 m, 16-day | 2000–2025 | NASA |
| Sentinel-2 SR Harmonized | NDVI | 10 m, 5-day | 2020–2025 | ESA |
| NOAA VIIRS LAI/FAPAR | LAI, FAPAR | 0.05°, daily | 2020–2025 | NOAA |
| CHIRPS Daily | Precipitation | 0.05°, daily | 2020–2025 | UCSB |
| ERA5-Land Monthly | Temp, precip, evap, soil moisture | 0.1°, monthly | 2020–2025 | ECMWF |
| SMAP L4 | Surface + root-zone soil moisture | 9 km, 3-hourly | 2020–2025 | NASA |
| ESA CCI Land Cover | Land cover class | 100 m, static | 2019 | ESA |
| GADM level 3 | Ward boundaries | vector | — | GADM |

All data is pulled from Google Earth Engine (see `gee/`). Ward-level
zonal statistics are computed for every 2020–2025 month, and for MODIS
across the full 2000–2025 record.

---

## Pipeline

| Step | Notebook | Purpose |
|---|---|---|
| 1 | `01_load_clean_merge_data.ipynb` | Load raw CSVs, standardize columns, QC, merge into analysis frames |
| 2 | `02_analyse_ndvi_trends.ipynb` | Mann-Kendall trend test + Sen's slope per ward |
| 3 | `03_decompose_seasonality.ipynb` | STL decomposition (trend, seasonal, residual) |
| 4 | `04_correlate_ndvi_climate.ipynb` | Lagged correlation with rainfall, temp, soil moisture |
| 5 | `05_cluster_wards.ipynb` | K-means typology of ward-level responses |
| 6 | `06_validate_cross_sensor.ipynb` | MODIS vs Sentinel-2, NDVI vs FAPAR |
| 7 | `07_figures_for_writeup.ipynb` | Publication-quality figures |

Steps 1 and the GEE extraction scripts are complete. Steps 2–7 are in
development.

---

## Repository structure
