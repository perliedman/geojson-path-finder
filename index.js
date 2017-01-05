var findPath = require('./dijkstra'),
    topology = require('./topology'),
    compactor = require('./compactor')
    point = require('turf-point'),
    distance = require('turf-distance'),
    roundCoord = require('./round-coord');

module.exports = PathFinder;

function PathFinder(graph, options) {
    options = options || {};
    var weightFn = options.weightFn || function defaultWeightFn(a, b) {
            return distance(point(a), point(b));
        };
    this._keyFn = options.keyFn || function(c) {
        return c.join(',');
    };
    this._precision = options.precision || 1e-5;
    
    if (graph.type === 'FeatureCollection') {
        // Graph is GeoJSON data, create a topology from it
        topo = topology(graph, options);
        this._sourceVertices = topo.vertices;
    } else if (graph.vertices) {
        this._vertices = graph.vertices;
        this._sourceVertices = graph.sourceVertices;
        this._compact = {
            graph: graph.compactedVertices,
            coordinates: graph.compactedCoordinates
        };
        return;
    }

    this._vertices = topo.edges.reduce(function buildGraph(g, edge) {
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

    this._compact = compactor.compactGraph(this._vertices, this._sourceVertices);

    if (Object.keys(this._compact.graph).length === 0) {
        throw new Error('Compacted graph contains no forks (topology has no intersections).');
    }
}

PathFinder.prototype = {
    findPath: function(a, b) {
        var start = this._keyFn(roundCoord(a.geometry.coordinates, this._precision)),
            finish = this._keyFn(roundCoord(b.geometry.coordinates, this._precision));

        var phantomStart = this._createPhantom(start);
        var phantomEnd = this._createPhantom(finish);

        var path = findPath(this._compact.graph, start, finish);

        if (path) {
            var weight = path[0];
            path = path[1];
            return {
                path: path.reduce(function buildPath(cs, v, i, vs) {
                    if (i > 0) {
                        cs = cs.concat(this._compact.coordinates[vs[i - 1]][v]);
                    }

                    return cs;
                }.bind(this), []).concat([this._sourceVertices[finish]]),
                weight: weight
            };
        } else {
            return null;
        }

        this._removePhantom(phantomStart);
        this._removePhantom(phantomEnd);
    },

    serialize: function() {
        return {
            vertices: this._vertices,
            sourceVertices: this._sourceVertices,
            compactedVertices: this._compact.graph,
            compactedCoordinates: this._compact.coordinates
        };
    },

    _createPhantom: function(n) {
        if (this._compact.graph[n]) return null;

        var phantom = compactor.compactNode(n, this._vertices, this._compact.graph, this._sourceVertices, true);
        this._compact.graph[n] = phantom.edges;
        this._compact.coordinates[n] = phantom.coordinates;

        Object.keys(phantom.incomingEdges).forEach(function(neighbor) {
            this._compact.graph[neighbor][n] = phantom.incomingEdges[neighbor];
            this._compact.coordinates[neighbor][n] = phantom.incomingCoordinates[neighbor];
        }.bind(this));

        return n;
    },

    _removePhantom: function(n) {
        if (!n) return;

        Object.keys(this._compact.graph[n]).forEach(function(neighbor) {
            delete this._compact.graph[neighbor][n];
        }.bind(this));
        Object.keys(this._compact.coordinates[n]).forEach(function(neighbor) {
            delete this._compact.coordinates[neighbor][n];
        }.bind(this));

        delete this._compact.graph[n];
        delete this._compact.coordinates[n];
    }
};
