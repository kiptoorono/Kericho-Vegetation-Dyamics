var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

// MOD13Q1: NDVI + EVI, Int16 scaled by 0.0001. SummaryQA: 0 = good.
var modis = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate('2000-01-01', '2026-01-01')
  .select(['NDVI', 'EVI', 'SummaryQA']);

var modisScaled = modis.map(function(image) {
  var ndvi = image.select('NDVI').multiply(0.0001).rename('NDVI');
  var evi  = image.select('EVI').multiply(0.0001).rename('EVI');
  var goodQa = image.select('SummaryQA').eq(0);

  return ndvi.addBands(evi).updateMask(goodQa)
    .copyProperties(image, ['system:time_start']);
});

var start = ee.Date('2000-01-01');
var end = ee.Date('2026-01-01');
var nMonths = end.difference(start, 'month').round();
var months = ee.List.sequence(0, nMonths.subtract(1));

// Aggregate 16-day composites to monthly means.
var monthlyNDVI = ee.ImageCollection(months.map(function(m) {
  var startMonth = start.advance(m, 'month');
  var endMonth = startMonth.advance(1, 'month');
  var monthImages = modisScaled.filterDate(startMonth, endMonth);

  var composite = ee.Image(ee.Algorithms.If(
    monthImages.size().gt(0),
    monthImages.mean(),
    ee.Image.constant(0).rename('NDVI')
      .addBands(ee.Image.constant(0).rename('EVI'))
  ));

  return composite
    .set('system:time_start', startMonth.millis())
    .set('month_label', startMonth.format('YYYY-MM'));
}));

print('Monthly MODIS frames:', monthlyNDVI.size());

var wardStats = ee.FeatureCollection(
  monthlyNDVI.map(function(image) {
    var monthLabel = image.get('month_label');

    var stats = image.reduceRegions({
      collection: Kericho_Wards,
      reducer: ee.Reducer.mean()
        .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
        .combine({reducer2: ee.Reducer.count(), sharedInputs: true}),
      scale: 250,
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
  description: 'Kericho_Wards_MODIS_2000_2025',
  folder: 'Remote',
  fileFormat: 'CSV',
  selectors: [
    'ward_name', 'ward_id', 'county', 'month',
    'NDVI_mean', 'NDVI_stdDev', 'NDVI_count',
    'EVI_mean', 'EVI_stdDev', 'EVI_count'
  ]
});