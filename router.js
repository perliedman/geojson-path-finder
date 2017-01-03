var L = require('leaflet'),
    PathFinder = require('geojson-path-finder'),
    util = require('./util'),
    explode = require('turf-explode'),
    nearest = require('turf-nearest'),
    featurecollection = require('turf-featurecollection');

require('leaflet-routing-machine');

var highwaySpeeds = {
    0: 110,
    1: 90,
    2: 80,
    3: 70,
    4: 50,
    5: 40
}

var unknowns = {};

function weightFn(a, b, props) {
    var d = distance(point(a), point(b)) * 1000,
        type = Math.floor((props.KKOD % 100) / 100)
    return d / (highwaySpeeds[type] / 3.6);
}

module.exports = L.Class.extend({
    initialize: function(geojson) {
        this._pathFinder = new PathFinder(geojson, {
            precision: 1e-9,
            weightFn: weightFn
        });
        var vertices = this._pathFinder._vertices;
        this._points = featurecollection(Object.keys(vertices)
            .filter(function(nodeName) {
                return Object.keys(vertices[nodeName]).length;
            })
            .map(function(nodeName) {
                var vertice = this._pathFinder._topo.vertices[nodeName];
                return point(vertice);
            }.bind(this)));
        console.log(JSON.stringify(unknowns, null, 2));
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

        var totalTime = legs.reduce(function(sum, l) { return sum + l.weight; }, 0);
        var totalDistance = legs.reduce(function(sum, l) { 
            var legDistance = l.path.reduce(function(d, c, i, cs) {
                if (i > 0) {
                    return d + distance(point(cs[i - 1]), point(c)) * 1000;
                }
                return d;
            }, 0);
            return sum + legDistance;
        }, 0);

        cb.call(context, null, [{
            name: '',
            waypoints: actualWaypoints.map(function(p) { return { latLng: util.toLatLng(p) }; }),
            inputWaypoints: waypoints,
            summary: {
                totalDistance: totalDistance,
                totalTime: totalTime
            },
            coordinates: Array.prototype.concat.apply([], legs.map(function(l) { return l.path.map(util.toLatLng); })),
            instructions: []
        }]);
    }
});
