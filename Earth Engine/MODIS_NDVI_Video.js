var Kericho_Wards = Kenya_wards.filter(ee.Filter.eq('NAME_1', 'Kericho'));
Map.centerObject(Kericho_Wards, 8);
Map.addLayer(Kericho_Wards, {color: 'red'}, 'Kericho Wards');

var region = Kericho_Wards.geometry();

var modis = ee.ImageCollection("MODIS/061/MOD13A2")
  .filterDate('2020-01-01', '2025-12-31')
  .select('NDVI');

var visParams = {
  min: 0, max: 1,
  palette: ['#a50026','#fdae61','#ffffbf','#a6d96a','#1a9850']
};

var visCollection = modis.map(function(image) {
  return image.multiply(0.0001)
    .clip(Kericho_Wards)
    .visualize(visParams)
    .copyProperties(image, ['system:time_start']);
});

var wardLines = ee.Image().byte()
  .paint({featureCollection: Kericho_Wards, color: 1, width: 2})
  .visualize({palette: ['000000']});

var visCollection2 = visCollection.map(function(img) {
  return img.blend(wardLines).copyProperties(img, ['system:time_start']);
});

Export.video.toDrive({
  collection: visCollection2,
  description: 'Kericho_MODIS_NDVI_Animation',
  folder: 'Remote',
  framesPerSecond: 2,
  dimensions: 1080,
  region: Kericho_Wards.geometry().bounds()
});