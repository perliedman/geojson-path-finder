var PathFinder = require('../'),
    geojson = require('./network.json'),
    test = require('tap').test,
    {point} = require('@turf/helpers'),
    distance = require('@turf/distance').default;

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

    t.ok(path, 'has path');
    t.ok(path.path, 'path has vertices');
    t.equal(path.path.length, 3, 'path has 3 vertices');
    t.ok(path.weight, 'path has a weight');
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

    t.ok(path, 'has path');
    t.ok(path.path, 'path has vertices');
    t.equal(path.path.length, 3, 'path has 3 vertices');
    t.ok(path.weight, 'path has a weight');
    t.end();
});

test('can find path (complex)', function(t) {
    var pathfinder = new PathFinder(geojson),
        path = pathfinder.findPath(point([8.44460166,59.48947469]), point([8.44651,59.513920000000006]));

    t.ok(path, 'has path');
    t.ok(path.path, 'path has vertices');
    t.ok(path.weight, 'path has a weight');
    t.equal(path.path.length, 220, 'path has expected length');
    t.ok(Math.abs(path.weight - 6.3751) < 5e-5, 'path has expected weight');
    t.end();
});

test('can\'t find path (advent of code)', function(t) {
    try {
        new PathFinder(require('./advent24.json'), {
            weightFn: function(a, b) {
                var dx = a[0] - b[0];
                var dy = a[1] - b[1];
                return Math.sqrt(dx * dx + dy * dy);
            }
        });
        t.fail('Expected to throw exception for trivial topology');
        t.end();
    } catch (e) {
        t.end();
    }
});

test('can make oneway network', function(t) {
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

    var pathfinder = new PathFinder(network, {
            weightFn: function(a, b) {
                return {
                    forward: distance(point(a), point(b))
                };
            }        
        }),
        path = pathfinder.findPath(point([0, 0]), point([1, 1]));

    t.ok(path, 'has path');
    t.ok(path.path, 'path has vertices');
    t.ok(path.weight, 'path has a weight');

    path = pathfinder.findPath(point([1, 1]), point([0, 0]));
    t.notOk(path, 'does not have path');

    t.end();
});

test('can recreate PathFinder from serialized data', function(t) {
    var pathfinder = new PathFinder(geojson);

    pathfinder = new PathFinder(pathfinder.serialize());
    var path = pathfinder.findPath(point([8.44460166,59.48947469]), point([8.44651,59.513920000000006]));

    t.ok(path, 'has path');
    t.ok(path.path, 'path has vertices');
    t.ok(path.weight, 'path has a weight');
    t.equal(path.path.length, 220, 'path has expected length');
    t.ok(Math.abs(path.weight - 6.3751) < 5e-5, 'path has expected weight');
    t.end();
});

test('can reduce data on edges', function(t) {
    var pathfinder = new PathFinder(geojson, {
            edgeDataReduceFn: function(a, p) { return {id: p.id}; },
            edgeDataSeed: -1
        }),
        path = pathfinder.findPath(point([8.44460166,59.48947469]), point([8.44651,59.513920000000006]));

    t.ok(path, 'has path');
    t.ok(path.edgeDatas, 'has edge datas');
    t.ok(path.edgeDatas.every(function(e) { return e; }));

    t.end();
});

function edgeReduce(a, p) {
    var a_arr = (a && a.id) ? a.id : [];
    if(typeof p.id === 'number') {
        a_arr.push(p.id);
    } else {
        p.id.forEach(function (id) {
            a_arr.push(id);
        });
    }
    return { id: Array.from(new Set(a_arr)) };
}

test('captures all edge data', function(t) {
    var pathfinder = new PathFinder(geojson, {
            edgeDataReduceFn: edgeReduce,
            edgeDataSeed: -1
        }),
        path = pathfinder.findPath(point([8.44460166,59.48947469]), point([8.44651,59.513920000000006]));

    t.ok(path, 'has path');
    t.ok(path.edgeDatas, 'has edge datas');
    t.ok(path.edgeDatas.some(function(e) { return (e.reducedEdge.id.indexOf(2001) >-1); }));

    t.end();
});

test('finding a path between nodes not in original graph', function(t) {
    var pathfinder = new PathFinder(geojson, {
            edgeDataReduceFn: function(a, p) { return {id: p.id}; },
            edgeDataSeed: -1
        }),
        path = pathfinder.findPath(point([8.3,59.3]), point([8.5,59.6]));

    t.false(path);
    t.end();
})