module.exports = {
    compactNode: compactNode,
    compactGraph: compactGraph
};

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

function compactGraph(vertices, vertexCoords) {
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
};
