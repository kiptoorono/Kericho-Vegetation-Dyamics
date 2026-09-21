var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

// CHIRPS daily rainfall is already in mm. No scale factor needed.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate('2020-01-01', '2026-01-01')
  .filterBounds(aoi);

var start = ee.Date('2020-01-01');
var end = ee.Date('2026-01-01');
var nMonths = end.difference(start, 'month').round();
var months = ee.List.sequence(0, nMonths.subtract(1));

// Sum daily images within each month to get monthly rainfall total (mm).
var monthlyPrecip = ee.ImageCollection(months.map(function(m) {
  var startMonth = start.advance(m, 'month');
  var endMonth = startMonth.advance(1, 'month');
  var monthImages = chirps.filterDate(startMonth, endMonth);

  var monthlyTotal = ee.Image(ee.Algorithms.If(
    monthImages.size().gt(0),
    monthImages.sum(),   // .sum() gives monthly total, not daily average
    ee.Image.constant(0).rename('precipitation')
  ));

  return monthlyTotal
    .set('system:time_start', startMonth.millis())
    .set('month_label', startMonth.format('YYYY-MM'));
}));

print('Monthly CHIRPS frames:', monthlyPrecip.size());

var wardStats = ee.FeatureCollection(
  monthlyPrecip.map(function(image) {
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
  description: 'Kericho_Wards_CHIRPS_2020_2025',
  folder: 'Remote',
  fileFormat: 'CSV',
  selectors: ['ward_name', 'ward_id', 'county', 'month', 'mean', 'stdDev', 'count']
});