var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

// NOAA CDR VIIRS LAI/FAPAR. Bands are Int16 × 1000.
var fapar = ee.ImageCollection('NOAA/CDR/VIIRS/LAI_FAPAR/V1')
  .filterDate('2020-01-01', '2026-01-01')
  .filterBounds(aoi)
  .select(['LAI', 'FAPAR']);

var faparScaled = fapar.map(function(image) {
  return image.multiply(0.001).copyProperties(image, ['system:time_start']);
});

var start = ee.Date('2020-01-01');
var end = ee.Date('2026-01-01');
var nMonths = end.difference(start, 'month').round();
var months = ee.List.sequence(0, nMonths.subtract(1));

// Monthly means from the daily/8-day inputs.
var monthlyFapar = ee.ImageCollection(months.map(function(m) {
  var startMonth = start.advance(m, 'month');
  var endMonth = startMonth.advance(1, 'month');
  var monthImages = faparScaled.filterDate(startMonth, endMonth);

  var composite = ee.Image(ee.Algorithms.If(
    monthImages.size().gt(0),
    monthImages.mean(),
    ee.Image.constant(0).rename('LAI')
      .addBands(ee.Image.constant(0).rename('FAPAR'))
  ));

  return composite
    .set('system:time_start', startMonth.millis())
    .set('month_label', startMonth.format('YYYY-MM'));
}));

print('Monthly FAPAR frames:', monthlyFapar.size());

var wardStats = ee.FeatureCollection(
  monthlyFapar.map(function(image) {
    var monthLabel = image.get('month_label');

    var stats = image.reduceRegions({
      collection: Kericho_Wards,
      reducer: ee.Reducer.mean()
        .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
        .combine({reducer2: ee.Reducer.count(), sharedInputs: true}),
      scale: 5566,
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
  description: 'Kericho_Wards_FAPAR_2020_2025',
  folder: 'Remote',
  fileFormat: 'CSV',
  selectors: [
    'ward_name', 'ward_id', 'county', 'month',
    'LAI_mean', 'LAI_stdDev', 'LAI_count',
    'FAPAR_mean', 'FAPAR_stdDev', 'FAPAR_count'
  ]
});