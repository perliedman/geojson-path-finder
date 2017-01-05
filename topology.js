var explode = require('turf-explode'),
    roundCoord = require('./round-coord');

module.exports = topology;

function geoJsonReduce(geojson, fn, seed) {
    if (geojson.type === 'FeatureCollection') {
        return geojson.features.reduce(function reduceFeatures(a, f) {
            return geoJsonReduce(f, fn, a);
        }, seed);
    } else {
        return fn(seed, geojson);
    }
}

function geoJsonFilterFeatures(geojson, fn) {
    var features = [];
    if (geojson.type === 'FeatureCollection') {
        features = features.concat(geojson.features.filter(fn));
    }

    return {
        type: 'FeatureCollection',
        features: features
    };
}

function isLineString(f) {
    return f.geometry.type === 'LineString';
}

function topology(geojson, options) {
    options = options || {};
    var keyFn = options.keyFn || function defaultKeyFn(c) {
            return c.join(',');
        },
        precision = options.precision || 1e-5;

    var lineStrings = geoJsonFilterFeatures(geojson, isLineString);
    var vertices = explode(lineStrings).features.reduce(function buildTopologyVertices(cs, f) {
            var rc = roundCoord(f.geometry.coordinates, precision);
            cs[keyFn(rc)] = f.geometry.coordinates;
            return cs;
        }, {}),
        edges = geoJsonReduce(lineStrings, function buildTopologyEdges(es, f) {
            f.geometry.coordinates.forEach(function buildLineStringEdges(c, i, cs) {
                if (i > 0) {
                    var k1 = keyFn(roundCoord(cs[i - 1], precision)),
                        k2 = keyFn(roundCoord(c, precision));
                    es.push([k1, k2, f.properties]);
                }
            });

            return es;
        }, []);

    return {
        vertices: vertices,
        edges: edges
    };
}
