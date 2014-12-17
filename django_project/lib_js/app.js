var ol = require('./contrib/ol');

// OL3 requires proj4 to be a global var
proj4 = require('proj4');

proj4.defs("EPSG:3765","+proj=tmerc +lat_0=0 +lon_0=16.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

var projection = ol.proj.get('EPSG:3765');

var extent = [208311.05, 4614890.75, 724721.78, 5159767.36];
projection.setExtent(extent);

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            extent: extent,
            source: new ol.source.TileWMS(({
                url: 'http://geoportal.dgu.hr/wms',
                params: {'LAYERS': 'DOF', 'TILED':true, 'FORMAT':'image/jpeg'}
                // serverType: 'geoserver'
            }))
        }),
        new ol.layer.Image({
            extent: extent,
            transparent:true,
            source: new ol.source.ImageWMS({
                url: '/getmap',
                params: {'LAYERS': 'Cres  Corine LC,Cres obala,hillshade', 'MAP':'/data/simple.qgs', 'VERSION':'1.1.1', 'FORMAT':'image/png'},
                ratio: 1.2
            })
        })
    ],
    view: new ol.View({
        projection: projection,
        center: ol.proj.transform([14.5, 44.7], 'EPSG:4326', 'EPSG:3765'),
        zoom: 3,
        extent: extent
    })
});