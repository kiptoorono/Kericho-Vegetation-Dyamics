var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
  .filterDate('2020-01-01', '2026-01-01')
  .select([
    'temperature_2m',
    'total_precipitation_sum',
    'potential_evaporation_sum',
    'volumetric_soil_water_layer_1',
    'volumetric_soil_water_layer_2',
    'volumetric_soil_water_layer_3',
    'volumetric_soil_water_layer_4'
  ]);

// Apply unit conversions so the exported CSV is directly usable.
// ECMWF convention: downward fluxes are positive, so evaporation is
// stored as negative. We flip the sign so evaporation_mm is a positive
// number representing water loss.
var era5Converted = era5.map(function(image) {
  var temp_c = image.select('temperature_2m').subtract(273.15).rename('temp_2m_c');
  var precip_mm = image.select('total_precipitation_sum').multiply(1000).rename('precip_mm');
  var evap_mm = image.select('potential_evaporation_sum').multiply(-1000).rename('evaporation_mm');
  var sm1 = image.select('volumetric_soil_water_layer_1').rename('sm_layer1');
  var sm2 = image.select('volumetric_soil_water_layer_2').rename('sm_layer2');
  var sm3 = image.select('volumetric_soil_water_layer_3').rename('sm_layer3');
  var sm4 = image.select('volumetric_soil_water_layer_4').rename('sm_layer4');

  return temp_c.addBands([precip_mm, evap_mm, sm1, sm2, sm3, sm4])
    .copyProperties(image, ['system:time_start']);
});

print('ERA5 monthly frames:', era5Converted.size());
print('First image bands:', era5Converted.first().bandNames());

var wardStats = ee.FeatureCollection(
  era5Converted.map(function(image) {
    var monthLabel = ee.Date(image.get('system:time_start')).format('YYYY-MM');

    var stats = image.reduceRegions({
      collection: Kericho_Wards,
      reducer: ee.Reducer.mean(),
      scale: 11132,
      tileScale: 4
    });

    return stats.map(function(feature) {
      return feature.set({
        'month': monthLabel,
        'ward_name': feature.get('NAME_3'),
        'ward_id': feature.get('GID_3'),
        'county': feature.get('NAME_1')
      });
    });
  })
).flatten();

print('Total rows:', wardStats.size());
print('First row:', wardStats.first());

Export.table.toDrive({
  collection: wardStats,
  description: 'Kericho_Wards_ERA5_2020_2025',
  folder: 'Remote',
  fileFormat: 'CSV',
  selectors: [
    'ward_name', 'ward_id', 'county', 'month',
    'temp_2m_c',
    'precip_mm',
    'evaporation_mm',
    'sm_layer1',
    'sm_layer2',
    'sm_layer3',
    'sm_layer4'
  ]
});