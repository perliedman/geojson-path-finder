var L = require('leaflet'),
    PathFinder = require('geojson-path-finder'),
    util = require('./util'),
    explode = require('turf-explode'),
    nearest = require('turf-nearest');

require('leaflet-routing-machine');

module.exports = L.Class.extend({
    initialize: function(geojson) {
        this._pathFinder = new PathFinder(geojson, { precision: 1e-9 });
        this._points = explode(geojson);
    },

    route: function(waypoints, cb, context) {
        var actualWaypoints = waypoints.map(function(wp) {
                return nearest(util.toPoint(wp), this._points);
            }.bind(this)),
            legs = actualWaypoints.map(function(wp, i, wps) {
            if (i > 0) {
                return this._pathFinder.findPath(wps[i - 1], wp);
            }

            return [];
        }.bind(this)).slice(1);

        if (legs.some(function(l) { return !l; })) {
            return cb.call(context, {
                status: 1,
                message: 'Can\'t find route.'
            });
        }

        var totalDistance = legs.reduce(function(sum, l) { return sum + l.weight; }, 0) * 1000;

        cb.call(context, null, [{
            name: '',
            waypoints: actualWaypoints.map(function(p) { return { latLng: util.toLatLng(p) }; }),
            inputWaypoints: waypoints,
            summary: {
                totalDistance: totalDistance,
                totalTime: totalDistance / (15 / 3.6)
            },
            coordinates: Array.prototype.concat.apply([], legs.map(function(l) { return l.path.map(util.toLatLng); })),
            instructions: []
        }]);
    }
});
