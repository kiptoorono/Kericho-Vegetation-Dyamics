var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

// CGLS-LC100 Collection 3: 100 m, 2015-2019. Band is discrete_classification.
var landcover = ee.ImageCollection('COPERNICUS/Landcover/100m/Proba-V-C3/Global')
  .filterBounds(aoi)
  .select('discrete_classification')
  .first();

print('Land cover band:', landcover.bandNames());

// Majority class per ward. Using a fixed scale of 100 m (native resolution).
var wardStats = landcover.reduceRegions({
  collection: Kericho_Wards,
  reducer: ee.Reducer.mode(),
  scale: 100,
  tileScale: 4
});

// Attach ward metadata.
var wardStatsFinal = wardStats.map(function(feature) {
  return feature.set({
    'ward_name': feature.get('NAME_3'),
    'ward_id': feature.get('GID_3'),
    'county': feature.get('NAME_1')
  });
});

print('Total rows:', wardStatsFinal.size());
print('First row:', wardStatsFinal.first());

Export.table.toDrive({
  collection: wardStatsFinal,
  description: 'Kericho_Wards_LandCover_2019',
  folder: 'Remote',
  fileFormat: 'CSV',
  selectors: [
    'ward_name', 'ward_id', 'county', 'mode'
  ]
}); 