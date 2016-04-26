var PathFinder = require('../'),
    geojson = require('./network.json'),
    test = require('tape'),
    point = require('turf-point');

test('can create PathFinder', function(t) {
    var pathfinder = new PathFinder(geojson);
    t.ok(pathfinder);
    t.end();
});

test('can find path (simple)', function(t) {
    var network = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0], [1, 0]]
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[1, 0], [1, 1]]
                }
            }
        ]
    };

    var pathfinder = new PathFinder(network),
        path = pathfinder.findPath(point([0, 0]), point([1, 1]));

    t.ok(path);
    t.ok(path.path);
    t.equal(path.path.length, 3);
    t.ok(path.weight);
    t.end();
});

test('can find path (medium)', function(t) {
    var network = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0], [1, 0]]
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[1, 0], [1, 1]]
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[1, 0], [0, 1], [1, 1]]
                }
            }
        ]
    };

    var pathfinder = new PathFinder(network),
        path = pathfinder.findPath(point([0, 0]), point([1, 1]));

    t.ok(path);
    t.ok(path.path);
    t.equal(path.path.length, 3);
    t.ok(path.weight);
    t.end();
});

test('can find path (complex)', function(t) {
    var pathfinder = new PathFinder(geojson),
        path = pathfinder.findPath(point([8.44460166,59.48947469]), point([8.44651,59.513920000000006]));

    t.ok(path);
    t.ok(path.path);
    t.ok(path.weight);
    t.end();
});
