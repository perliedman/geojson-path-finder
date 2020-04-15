'use strict';

module.exports = {
    compactNode: compactNode,
    compactGraph: compactGraph
};

function findNextEnd(prev, v, vertices, ends, vertexCoords, edgeData, trackIncoming, options) {
    var weight = vertices[prev][v],
        reverseWeight = vertices[v][prev],
        coordinates = [],
        path = [],
        reducedEdge = options.edgeDataSeed;
        
    if (options.edgeDataReduceFn) {
        reducedEdge = options.edgeDataReduceFn(reducedEdge, edgeData[v][prev]);
    }

    while (!ends[v]) {
        var edges = vertices[v];

        if (!edges) { break; }

        var next = Object.keys(edges).filter(function notPrevious(k) { return k !== prev; })[0];
        weight += edges[next];

        if (trackIncoming) {
            reverseWeight += vertices[next][v];

            if (path.indexOf(v) >= 0) {
                ends[v] = vertices[v];
                break;
            }
            path.push(v);
        }

        if (options.edgeDataReduceFn) {
            reducedEdge = options.edgeDataReduceFn(reducedEdge, edgeData[v][next]);
        }

        coordinates.push(vertexCoords[v]);
        prev = v;
        v = next;
    }

    return {
        vertex: v,
        weight: weight,
        reverseWeight: reverseWeight,
        coordinates: coordinates,
        reducedEdge: reducedEdge
    };
}

function compactNode(k, vertices, ends, vertexCoords, edgeData, trackIncoming, options) {
    options = options || {};
    var neighbors = vertices[k];
    return Object.keys(neighbors).reduce(function compactEdge(result, j) {
        var neighbor = findNextEnd(k, j, vertices, ends, vertexCoords, edgeData, trackIncoming, options);
        var weight = neighbor.weight;
        var reverseWeight = neighbor.reverseWeight;
        if (neighbor.vertex !== k) {
            if (!result.edges[neighbor.vertex] || result.edges[neighbor.vertex] > weight) {
                result.edges[neighbor.vertex] = weight;
                result.coordinates[neighbor.vertex] = [vertexCoords[k]].concat(neighbor.coordinates);
                result.reducedEdges[neighbor.vertex] = neighbor.reducedEdge;
            }
            if (trackIncoming && 
                !isNaN(reverseWeight) && (!result.incomingEdges[neighbor.vertex] || result.incomingEdges[neighbor.vertex] > reverseWeight)) {
                result.incomingEdges[neighbor.vertex] = reverseWeight;
                var coordinates = [vertexCoords[k]].concat(neighbor.coordinates);
                coordinates.reverse();
                result.incomingCoordinates[neighbor.vertex] = coordinates;
            }
        }
        return result;
    }, {edges: {}, incomingEdges: {}, coordinates: {}, incomingCoordinates: {}, reducedEdges: {}});
}

function compactGraph(vertices, vertexCoords, edgeData, options) {
    options = options || {};
    var progress = options.progress;
    var ends = Object.keys(vertices).reduce(function findEnds(es, k, i, vs) {
        var vertex = vertices[k];
        var edges = Object.keys(vertex);
        var numberEdges = edges.length;
        var remove;

        if (options.compact !== undefined && !options.compact) {
            remove = false;
        } else if (numberEdges === 1) {
            var other = vertices[edges[0]];
            remove = !other[k];
        } else if (numberEdges === 2) {
            remove = edges.filter(function(n) {
                return vertices[n][k];
            }).length === numberEdges;
        } else {
            remove = false;
        }

        if (!remove) {
            es[k] = vertex;
        }

        if (i % 1000 === 0 && progress) {
            progress('compact:ends', i, vs.length);
        }

        return es;
    }, {});

    return Object.keys(ends).reduce(function compactEnd(result, k, i, es) {
        var compacted = compactNode(k, vertices, ends, vertexCoords, edgeData, false, options);
        result.graph[k] = compacted.edges;
        result.coordinates[k] = compacted.coordinates;

        if (options.edgeDataReduceFn) {
            result.reducedEdges[k] = compacted.reducedEdges;
        }

        if (i % 1000 === 0 && progress) {
            progress('compact:nodes', i, es.length);
        }

        return result;
    }, {graph: {}, coordinates: {}, reducedEdges: {}});
};
