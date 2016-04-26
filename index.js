var L = require('leaflet'),
    Router = require('./router'),
    network = require('./network.json'),
    util = require('./util');

L.Icon.Default.imagePath = 'images/';

require('leaflet-routing-machine');

var map = L.map('map');

L.tileLayer('https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibGllZG1hbiIsImEiOiJjaW5odGlpM2EwMDNodnNrbDdyMXloZHRyIn0.XqcMsnzar2XNODt99aSkEA')
    .addTo(map);
var networkLayer = L.geoJson(network).addTo(map);

map.fitBounds(networkLayer.getBounds());

var control = L.Routing.control({
    router: new Router(network)
}).addTo(map);

control.setWaypoints([
    util.toLatLng(network.features[0].geometry.coordinates[0]),
    util.toLatLng(network.features[network.features.length - 1].geometry.coordinates[0]),
]);
