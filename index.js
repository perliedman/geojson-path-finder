var Graph = require('node-dijkstra'),
    topology = require('./topology'),
    point = require('turf-point'),
    distance = require('turf-distance');

module.exports = PathFinder;

function findNextEnd(v, prev, vertices, ends) {
    var weight = 0;

    while (!ends[v]) {
        var edges = vertices[v],
            next = Object.keys(edges).filter(function(k) { return k !== prev; })[0];
        weight += edges[next];
        prev = v;
        v = next;
    }

    return { vertex: v, weight: weight };
}

function compactNode(k, vertices, ends) {
    var neighbors = vertices[k];
    return Object.keys(neighbors).reduce(function(edges, j) {
        var neighbor = findNextEnd(j, k, vertices, ends);
        edges[neighbor.vertex] = neighbors[j] + neighbor.weight;
        return edges;
    }, {});
}

function compact(vertices) {
    var ends = Object.keys(vertices).reduce(function(es, k) {
        var vertex = vertices[k];
        if (Object.keys(vertex).length !== 2) {
            es[k] = vertex;
        }
        return es;
    }, {});

    return Object.keys(ends).reduce(function(g, k) {
        g[k] = compactNode(k, vertices, ends);
        return g;
    }, {});
}

function PathFinder(geojson, options) {
    options = options || {};
    
    var topo = this._topo = topology(geojson, options),
        weightFn = options.weightFn || function(a, b) {
            return distance(point(a), point(b));
        };

    this._keyFn = options.keyFn || function(c) {
        return c.join(',');
    };
    this._precision = options.precision || 1e-5;

    this._vertices = topo.edges.reduce(function(g, edge) {
        var a = edge[0],
            b = edge[1],
            w = weightFn(topo.vertices[a], topo.vertices[b]),
            concatEdge = function(startNode, endNode, weight) {
                var v = g[startNode];
                if (!v) {
                    v = g[startNode] = {};
                }
                v[endNode] = weight;
            };

        concatEdge(a, b, w);
        concatEdge(b, a, w);

        return g;
    }, {});

    this._compact = compact(this._vertices);
    this._graph = new Graph(this._compact);
}

PathFinder.prototype = {
    findPath: function(a, b) {
        var start = this._keyFn(this._roundCoord(a.geometry.coordinates)),
            finish = this._keyFn(this._roundCoord(b.geometry.coordinates));

        this._createPhantom(start);
        this._createPhantom(finish);

        var path = this._graph.shortestPath(start, finish);

        if (path) {
            return {
                path: path.map(function(v) { return this._topo.vertices[v]; }.bind(this)),
                weight: path.reduce(function(sum, v, i, vs) {
                    if (i > 0) {
                        var v0 = this._compact[vs[i - 1]],
                            w = v0[v];
                        sum += w;
                    }

                    return sum;
                }.bind(this), 0)
            };
        } else {
            return null;
        }
    },

    _roundCoord: function(c) {
        return c.map(function(c) {
            return Math.round(c / this._precision) * this._precision;
        }.bind(this));
    },

    _createPhantom: function(n) {
        if (this._compact[n]) return;

        var phantom = compactNode(n, this._vertices, this._compact);
        Object.keys(phantom).forEach(function(neighbor) {
            this._compact[neighbor][n] = phantom[neighbor];
        }.bind(this));

        this._graph.addVertex(n, phantom);
    }
};
