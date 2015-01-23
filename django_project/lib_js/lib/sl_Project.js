'use strict';

var EVENTS = require('./events');

var ol = require('../contrib/ol');

var m = require('mithril');
var me = require('mithril.elements');

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
        var self = this;
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
                center: ol.proj.transform([17.02, 43.5], 'EPSG:4326', 'EPSG:3765'),
                zoom: 6,
                maxZoom: 14,  // optimal for EPSG:3765
                extent: extent
            })
        });

        this.map.addLayer(dgu_dof);

        // Register custom 'accordion' element with mithril.elements.
        this.registerAccordionElement();

        // init print control
        this.printCtrl = new SL_PrintControl(this.map, this.options);

        // Render and initialize all sidebar controls.
        m.module(document.getElementById('sidebar'), {
            controller: function() {
                this.printCtrl = new self.printCtrl.PrintControler();
            },
            view: this.sidebarView.bind(this)
        });

        // these two layers should be added as last overlays
        // add qgis_layer to the map
        // var qgis_layer = new SL_LayerControl(this.map, this.options);
        // this.map.addLayer(qgis_layer.SL_QGIS_Layer);

        // // // add qgis_GFIControl Layer to the map
        // var qgis_GFI_layer = new SL_GFIControl(this.map, this.options);
        // this.map.addLayer(qgis_GFI_layer.SL_GFI_Layer);

        // new SL_DistanceToolControl(this.map, this.options);

        // // // add similarity search control
        // var qgis_Similarity_layer = new SL_SimilaritySearchControl(this.map, this.options);
        // this.map.addLayer(qgis_Similarity_layer.SL_Result_Layer);

        // new SL_PrintControl(this.map, this.options);

        // propagate map events
        this.map.on('singleclick', function(evt) {
            EVENTS.emit('map.singleclick', {
                'coordinate': evt.coordinate
            });
        });
    },

    /**
     * @method
     * This method registers custom element 'accordion' with mithril.elements.
     */
    registerAccordionElement: function() {

        me.element('accordion', {
            controller: function() {
                this.toggle = function(id) {
                    this.open=id;
                };
            },
            view: function(ctrl, content) {
                var display = function(id) {
                    return 'display:'+(ctrl.open===id? 'block':'none');
                };

                return me('ul', {'class': 'accordion'}, content.map(function(line,id) {
                    var title = line.children[0];
                    var content = line.children[1];
                    content.attrs.style = display(id);
                    return me(line, {
                        onclick:ctrl.toggle.bind(ctrl,id)
                    },[
                        title,
                        content
                        // me('div',{style:display(id)},content)
                    ]
                    );
                }));
            }
        });
    },

    /**
     * @constructor
     * View constructor for sidebar and it's elements.
     * Context (this) is SL_Project instance.
     */
    sidebarView: function(ctrl) {
        console.log(ctrl);
        return me('accordion', [
            me('li', {'class': 'accordion-navigation'}, [
                'Slojevi',
                me('div', {'id': 'panelLayers', 'class': 'content'})
            ]),
            me('li', {'class': 'accordion-navigation'}, [
                'Pretraživanje',
                me('div', {'id': 'panelSearch', 'class': 'content'})
            ]),
            me('li', {'class': 'accordion-navigation'}, [
                'Alati',
                me('div', {'id': 'panelTools', 'class': 'content'}, [
                    me('div', {'id': 'distanceToolControl', 'class': 'controlHolder'})
                ])
            ]),
            me('li', {'class': 'accordion-navigation'}, [
                'Print',
                me('div', {'id': 'panelPrint', 'class': 'content'}, [
                    this.printCtrl.PrintView(ctrl.printCtrl)
                ])
            ])
        ]);
    }
};

module.exports = SL_Project;
