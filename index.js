var Graph = require('node-dijkstra'),
    topology = require('./topology'),
    point = require('turf-point'),
    distance = require('turf-distance');

module.exports = PathFinder;

function findNextEnd(v, prev, vertices, ends, vertexCoords) {
    var weight = 0,
        coordinates = [];

    while (!ends[v]) {
        var edges = vertices[v],
            next = Object.keys(edges).filter(function(k) { return k !== prev; })[0];
        weight += edges[next];
        coordinates.push(vertexCoords[v]);
        prev = v;
        v = next;
    }

    return { vertex: v, weight: weight, coordinates: coordinates };
}

function compactNode(k, vertices, ends, vertexCoords) {
    var neighbors = vertices[k];
    return Object.keys(neighbors).reduce(function(result, j) {
        var neighbor = findNextEnd(j, k, vertices, ends, vertexCoords);
        var weight = neighbors[j] + neighbor.weight;
        if (neighbor.vertex !== k && (!result.edges[neighbor.vertex] || result.edges[neighbor.vertex] > weight)) {
            result.edges[neighbor.vertex] = weight;
            result.coordinates[neighbor.vertex] = [vertexCoords[k]].concat(neighbor.coordinates);
        }
        return result;
    }, {edges: {}, coordinates: {}});
}

function compact(vertices, vertexCoords) {
    var ends = Object.keys(vertices).reduce(function(es, k) {
        var vertex = vertices[k];
        if (Object.keys(vertex).length !== 2) {
            es[k] = vertex;
        }
        return es;
    }, {});

    return Object.keys(ends).reduce(function(result, k) {
        var compacted = compactNode(k, vertices, ends, vertexCoords);
        result.graph[k] = compacted.edges;
        result.coordinates[k] = compacted.coordinates;
        return result;
    }, {graph: {}, coordinates: {}});
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

    this._compact = compact(this._vertices, this._topo.vertices);
    this._graph = new Graph(this._compact.graph);
}

PathFinder.prototype = {
    findPath: function(a, b) {
        var start = this._keyFn(this._roundCoord(a.geometry.coordinates)),
            finish = this._keyFn(this._roundCoord(b.geometry.coordinates));

        var phantomStart = this._createPhantom(start);
        var phantomEnd = this._createPhantom(finish);

        var path = this._graph.shortestPath(start, finish);

        if (path) {
            return {
                path: path.reduce(function(cs, v, i, vs) {
                    if (i > 0) {
                        cs = cs.concat(this._compact.coordinates[vs[i - 1]][v]);
                    }

                    return cs;
                }.bind(this), []).concat([this._topo.vertices[finish]]),
                weight: path.reduce(function(sum, v, i, vs) {
                    if (i > 0) {
                        var v0 = this._compact.graph[vs[i - 1]],
                            w = v0[v];
                        sum += w;
                    }

                    return sum;
                }.bind(this), 0)
            };
        } else {
            return null;
        }

        this._removePhantom(phantomStart);
        this._removePhantom(phantomEnd);
    },

    _roundCoord: function(c) {
        return c.map(function(c) {
            return Math.round(c / this._precision) * this._precision;
        }.bind(this));
    },

    _createPhantom: function(n) {
        if (this._compact.graph[n]) return null;

        var phantom = compactNode(n, this._vertices, this._compact.graph, this._topo.vertices);
        this._compact.graph[n] = phantom.edges;
        this._compact.coordinates[n] = phantom.coordinates;

        // Add reverse edges from targets to phantom node
        Object.keys(phantom.edges).forEach(function(neighbor) {
            this._compact.graph[neighbor][n] = phantom.edges[neighbor];
            var coords = phantom.coordinates[neighbor].slice(1);
            coords.push(this._topo.vertices[neighbor])
            coords.reverse();
            this._compact.coordinates[neighbor][n] = coords;
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
