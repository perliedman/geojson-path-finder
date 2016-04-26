var L = require('leaflet');

module.exports = {
    toPoint: function (wp) {
        var c = wp.latLng;
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [c.lng, c.lat]
            }
        };
    },

    toLatLng: function (p) {
        return L.latLng(p[1], p[0]);
    }
};
