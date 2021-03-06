'use strict';

var EVENTS = require('./events');

var ol = require('../contrib/ol');

// initialize projections
require('./proj');

var SL_LayerControl = require('./sl_layerControl');
var SL_GFIControl = require('./sl_getfeatureinfoControl');
var SL_DistanceToolControl = require('./sl_distanceToolControl');
var SL_SimilaritySearchControl = require('./sl_similaritySearchControl');
var SL_PrintControl = require('./sl_printControl');


var SL_Project = function (options) {
    // default options
    this.options = {
        // initial module options
    };

    if (!options || Object.getOwnPropertyNames(options).length === 0) {
        throw new Error('SLProject options parameter must be defined');
    }

    // override and extend default options
    for (var opt in options) {
        if (options.hasOwnProperty(opt)) {
            this.options[opt] = options[opt];
        }
    }

    // initialize the client
    this._init();
};


SL_Project.prototype = {

    _init: function (){
        // initialize

        var projection = ol.proj.get('EPSG:3765');

        var extent = [208311.05, 4614890.75, 724721.78, 5159767.36];
        projection.setExtent(extent);

        var dgu_dof = new ol.layer.Tile({
            extent: extent,
            source: new ol.source.TileWMS(({
                url: 'http://geoportal.dgu.hr/wms',
                params: {'LAYERS': 'DOF', 'TILED':true, 'FORMAT':'image/jpeg'}
                // serverType: 'geoserver'
            }))
        });

        this.map = new ol.Map({
            target: 'map',
            view: new ol.View({
                projection: projection,
                center: ol.proj.transform([14.5, 44.7], 'EPSG:4326', 'EPSG:3765'),
                zoom: 5,
                maxZoom: 13,  // optimal for EPSG:3765
                extent: extent
            })
        });

        this.map.addLayer(dgu_dof);


        // these two layers should be added as last overlays
        // add qgis_layer to the map
        var qgis_layer = new SL_LayerControl(this.map, this.options);
        this.map.addLayer(qgis_layer.SL_QGIS_Layer);

        // // add qgis_GFIControl Layer to the map
        var qgis_GFI_layer = new SL_GFIControl(this.map, this.options);
        this.map.addLayer(qgis_GFI_layer.SL_GFI_Layer);

        new SL_DistanceToolControl(this.map, this.options);

        // // add similarity search control
        var qgis_Similarity_layer = new SL_SimilaritySearchControl(this.map, this.options);
        this.map.addLayer(qgis_Similarity_layer.SL_Result_Layer);

        new SL_PrintControl(this.map, this.options);

        // propagate map events
        this.map.on('singleclick', function(evt) {
            EVENTS.emit('map.singleclick', {
                'coordinate': evt.coordinate
            });
        });
    },
};

module.exports = SL_Project;
