var topology = require('./topology'),
    compactor = require('./compactor'),
    distance = require('turf-distance'),
    roundCoord = require('./round-coord'),
    point = require('turf-point');

module.exports = function preprocess(graph, options) {
    options = options || {};
    var weightFn = options.weightFn || function defaultWeightFn(a, b) {
            return distance(point(a), point(b));
        };

    if (graph.type === 'FeatureCollection') {
        // Graph is GeoJSON data, create a topology from it
        topo = topology(graph, options);
    } else if (graph.edges) {
        // Graph is a preprocessed topology
        topo = graph;
    }

    var vertices = topo.edges.reduce(function buildGraph(g, edge) {
        var a = edge[0],
            b = edge[1],
            props = edge[2],
            w = weightFn(topo.vertices[a], topo.vertices[b], props),
            makeEdgeList = function makeEdgeList(node) {
                if (!g[node]) {
                    g[node] = {};
                }
            },
            concatEdge = function concatEdge(startNode, endNode, weight) {
                var v = g[startNode];
                v[endNode] = weight;
            };

        if (w) {
            makeEdgeList(a);
            makeEdgeList(b);
            if (w instanceof Object) {
                if (w.forward) {
                    concatEdge(a, b, w.forward);
                }
                if (w.backward) {
                    concatEdge(b, a, w.backward);
                }
            } else {
                concatEdge(a, b, w);
                concatEdge(b, a, w);
            }
        }

        return g;
    }, {});

    var compact = compactor.compactGraph(vertices, topo.vertices);

    return {
        vertices: vertices,
        sourceVertices: topo.vertices,
        compactedVertices: compact.graph,
        compactedCoordinates: compact.coordinates
    };
};
