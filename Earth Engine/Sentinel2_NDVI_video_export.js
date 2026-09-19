var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
var aoi = Kericho_Wards.geometry().bounds();

Map.centerObject(Kericho_Wards, 9);
Map.addLayer(Kericho_Wards, {color: 'red'}, 'Kericho Wards', false);

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2020-01-01', '2026-01-01')
  .filterBounds(aoi);

function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask  = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask);
}

var s2Masked = s2.map(maskS2clouds);

var start = ee.Date('2020-01-01');
var end   = ee.Date('2026-01-01');
var nMonths = end.difference(start, 'month').round();
var months  = ee.List.sequence(0, nMonths.subtract(1));

var monthlyNDVI = ee.ImageCollection(months.map(function(m) {
  var startMonth = start.advance(m, 'month');
  var endMonth   = startMonth.advance(1, 'month');
  var monthlyImages = s2Masked.filterDate(startMonth, endMonth);
  var composite = ee.Image(ee.Algorithms.If(
    monthlyImages.size().gt(0),
    monthlyImages.median(),
    ee.Image.constant(0).rename('B8')
      .addBands(ee.Image.constant(0).rename('B4'))
  ));
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return ndvi.clip(Kericho_Wards)
    .set('system:time_start', startMonth.millis())
    .set('month_label', startMonth.format('YYYY-MM'));
}));

var visParams = {
  min: 0.0, max: 1.0,
  palette: ['#a50026', '#fdae61', '#ffffbf', '#a6d96a', '#1a9850']
};

var wardLines = ee.Image().byte()
  .paint({featureCollection: Kericho_Wards, color: 1, width: 2})
  .visualize({palette: ['000000']});

var visCollection = monthlyNDVI.map(function(image) {
  return image.visualize(visParams)
    .blend(wardLines)
    .copyProperties(image, ['system:time_start']);
});

Export.video.toDrive({
  collection: visCollection,
  description: 'Kericho_S2_NDVI_Animation',
  folder: 'Remote',
  framesPerSecond: 4,
  dimensions: 1080,
  region: aoi
});