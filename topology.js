var explode = require('turf-explode');

module.exports = topology;

function geoJsonReduce(geojson, fn, seed) {
    if (geojson.type === 'FeatureCollection') {
        return geojson.features.reduce(function(a, f) {
            return geoJsonReduce(f, fn, a);
        }, seed);
    } else {
        return fn(seed, geojson);
    }
}

function topology(geojson, options) {
    options = options || {};
    var keyFn = options.keyFn || function(c) {
            return c.join(',');
        },
        precision = options.precision || 1e-5,
        roundCoord = function(c) {
            return c.map(function(c) {
                return Math.round(c / precision) * precision;
            });
        };

    var vertices = explode(geojson).features.reduce(function(cs, f) {
            var rc = roundCoord(f.geometry.coordinates);
            cs[keyFn(rc)] = f.geometry.coordinates;
            return cs;
        }, {}),
        edges = geoJsonReduce(geojson, function(es, f) {
            if (f.geometry.type === 'LineString') {
                f.geometry.coordinates.forEach(function(c, i, cs) {
                    if (i > 0) {
                        var k1 = keyFn(roundCoord(cs[i - 1])),
                            k2 = keyFn(roundCoord(c));
                        es.push([k1, k2]);
                    }
                });
            }

            return es;
        }, []);

    return {
        vertices: vertices,
        edges: edges
    };
}
