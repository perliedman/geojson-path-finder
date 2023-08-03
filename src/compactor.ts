import { Position } from "@turf/helpers";
import { Coordinates, PathFinderOptions, Vertices, Key } from "./types";

/**
 * Given a graph of vertices and edges, simplifies the graph so redundant
 * nodes/edges are removed, only preserving nodes which are either:
 *
 *   * Dead ends: end of lines, where you can only go back in the opposite
 *     direction
 *   * Forks, where there is an option to go in multiple directions
 *
 * The idea is to reduce the number of nodes in the graph, which drasticly
 * reduces the complexity of Dijkstra's algorithm.
 *
 * @param sourceVertices the graph's vertices (a lookup of vertex edges and weights)
 * @param vertexCoords the geographic coordinates of the vertices
 * @param edgeData the (optional) data associated with each edge
 * @param options options used for creating and compacting the graph
 * @returns
 */
export default function compactGraph<TEdgeData, TProperties>(
  sourceVertices: Vertices,
  vertexCoords: Coordinates,
  sourceEdgeData: Record<Key, Record<Key, TEdgeData | undefined>>,
  options: PathFinderOptions<TEdgeData, TProperties> = {}
): {
  vertices: Vertices;
  coordinates: Record<Key, Record<Key, Position[]>>;
  edgeData: Record<Key, Record<Key, TEdgeData | undefined>>;
} {
  const result = {
    vertices: Object.keys(sourceVertices).reduce(
      (clonedVertices, vertexKey) => {
        clonedVertices[vertexKey] = { ...sourceVertices[vertexKey] };
        return clonedVertices;
      },
      {} as Vertices
    ),
    coordinates: Object.keys(sourceVertices).reduce(
      (coordinates, vertexKey) => {
        coordinates[vertexKey] = {};
        for (const neighborKey of Object.keys(sourceVertices[vertexKey])) {
          coordinates[vertexKey][neighborKey] = [vertexCoords[vertexKey]];
        }

        return coordinates;
      },
      {} as Record<Key, Record<Key, Position[]>>
    ),
    edgeData:
      "edgeDataReducer" in options
        ? Object.keys(sourceVertices).reduce((compactedEdges, vertexKey) => {
            compactedEdges[vertexKey] = Object.keys(
              sourceVertices[vertexKey]
            ).reduce((compactedEdges, targetKey) => {
              compactedEdges[targetKey] = sourceEdgeData[vertexKey][targetKey];
              return compactedEdges;
            }, {} as Record<Key, TEdgeData | undefined>);
            return compactedEdges;
          }, {} as Record<Key, Record<Key, TEdgeData | undefined>>)
        : {},
  };

  const { vertices, coordinates, edgeData } = result;
  const hasEdgeDataReducer = "edgeDataReducer" in options && edgeData;

  const vertexKeysToCompact = Object.keys(sourceVertices).filter((vertexKey) =>
    shouldCompact(sourceVertices, vertexKey)
  );

  for (const vertexKey of vertexKeysToCompact) {
    const vertex = vertices[vertexKey];
    const edges = Object.keys(vertex);

    // No edges means all other vertices around this one have been compacted
    // and compacting this node would remove this part of the graph; skip compaction.
    if (edges.length === 0) continue;

    for (const neighborKey of edges) {
      for (const otherNeighborKey of edges) {
        if (neighborKey !== otherNeighborKey) {
          compact(vertexKey, neighborKey, otherNeighborKey);
          compact(vertexKey, otherNeighborKey, neighborKey);
        }
      }
    }

    for (const neighborKey of edges) {
      if (!vertices[neighborKey]) {
        throw new Error(`Missing neighbor vertex for ${neighborKey}`);
      }
      delete vertices[neighborKey][vertexKey];
      delete coordinates[neighborKey][vertexKey];
    }

    delete vertices[vertexKey];
    delete coordinates[vertexKey];
  }

  return result;

  function compact(vertexKey: Key, neighborKey: Key, otherNeighborKey: Key) {
    const vertex = vertices[vertexKey];
    const neighbor = vertices[neighborKey];
    const weightFromNeighbor = neighbor[vertexKey];

    if (!neighbor[otherNeighborKey] && weightFromNeighbor) {
      neighbor[otherNeighborKey] =
        weightFromNeighbor + vertex[otherNeighborKey];
      coordinates[neighborKey][otherNeighborKey] = [
        ...coordinates[neighborKey][vertexKey],
        ...coordinates[vertexKey][otherNeighborKey],
      ];
      let reducedEdge = hasEdgeDataReducer
        ? edgeData[neighborKey][vertexKey]
        : undefined;
      const otherEdgeData = hasEdgeDataReducer
        ? edgeData[vertexKey][otherNeighborKey]
        : undefined;

      if (hasEdgeDataReducer && reducedEdge && otherEdgeData) {
        edgeData[neighborKey][otherNeighborKey] = options.edgeDataReducer(
          reducedEdge,
          otherEdgeData
        );
      }
    }
  }
}

export function compactNode<TEdgeData, TProperties>(
  key: Key,
  vertices: Vertices,
  ends: Vertices,
  vertexCoords: Coordinates,
  edgeData: Record<Key, Record<Key, TEdgeData | undefined>>,
  trackIncoming: boolean,
  options: PathFinderOptions<TEdgeData, TProperties> = {}
) {
  const neighbors = vertices[key];
  return Object.keys(neighbors).reduce(compactEdge, {
    edges: {},
    incomingEdges: {},
    coordinates: {},
    incomingCoordinates: {},
    reducedEdges: {},
  });

  function compactEdge(
    result: {
      edges: Record<Key, number>;
      incomingEdges: Record<Key, number>;
      coordinates: Record<Key, Position[]>;
      incomingCoordinates: Record<Key, Position[]>;
      reducedEdges: Record<Key, TEdgeData | undefined>;
    },
    j: Key
  ) {
    const neighbor = findNextFork(
      key,
      j,
      vertices,
      ends,
      vertexCoords,
      edgeData,
      trackIncoming,
      options
    );
    const weight = neighbor.weight;
    const reverseWeight = neighbor.reverseWeight;
    if (neighbor.vertexKey !== key) {
      if (
        !result.edges[neighbor.vertexKey] ||
        result.edges[neighbor.vertexKey] > weight
      ) {
        result.edges[neighbor.vertexKey] = weight;
        result.coordinates[neighbor.vertexKey] = [vertexCoords[key]].concat(
          neighbor.coordinates
        );
        result.reducedEdges[neighbor.vertexKey] = neighbor.reducedEdge;
      }
      if (
        trackIncoming &&
        !isNaN(reverseWeight) &&
        (!result.incomingEdges[neighbor.vertexKey] ||
          result.incomingEdges[neighbor.vertexKey] > reverseWeight)
      ) {
        result.incomingEdges[neighbor.vertexKey] = reverseWeight;
        var coordinates = [vertexCoords[key]].concat(neighbor.coordinates);
        coordinates.reverse();
        result.incomingCoordinates[neighbor.vertexKey] = coordinates;
      }
    }
    return result;
  }
}

function findNextFork<TEdgeData, TProperties>(
  prev: Key,
  vertexKey: Key,
  vertices: Vertices,
  ends: Vertices,
  vertexCoords: Coordinates,
  edgeData: Record<Key, Record<Key, TEdgeData | undefined>>,
  trackIncoming: boolean,
  options: PathFinderOptions<TEdgeData, TProperties> = {}
) {
  let weight = vertices[prev][vertexKey];
  let reverseWeight = vertices[vertexKey][prev];
  const coordinates = [];
  const path = [];
  let reducedEdge =
    "edgeDataReducer" in options ? edgeData[vertexKey][prev] : undefined;

  while (!ends[vertexKey]) {
    var edges = vertices[vertexKey];

    if (!edges) {
      break;
    }

    var next = Object.keys(edges).filter(function notPrevious(k) {
      return k !== prev;
    })[0];
    weight += edges[next];

    if (trackIncoming) {
      reverseWeight += vertices[next]?.[vertexKey] || Infinity;

      if (path.indexOf(vertexKey) >= 0) {
        ends[vertexKey] = vertices[vertexKey];
        break;
      }
      path.push(vertexKey);
    }

    const nextEdgeData = edgeData[vertexKey] && edgeData[vertexKey][next];
    if ("edgeDataReducer" in options && reducedEdge && nextEdgeData) {
      reducedEdge = options.edgeDataReducer(reducedEdge, nextEdgeData);
    }

    coordinates.push(vertexCoords[vertexKey]);
    prev = vertexKey;
    vertexKey = next;
  }

  return {
    vertexKey,
    weight: weight,
    reverseWeight: reverseWeight,
    coordinates: coordinates,
    reducedEdge: reducedEdge,
  };
}

function shouldCompact(vertices: Vertices, vertexKey: Key): boolean {
  const vertex = vertices[vertexKey];
  const edges = Object.keys(vertex);
  const numberEdges = edges.length;

  switch (numberEdges) {
    case 1: {
      // A vertex A with a single edge A->B is a fork
      // if B has an edge to A.
      // (It's a fork in the sense that it is a dead end and you can only turn back to B.)
      const other = vertices[edges[0]];
      return !other[vertexKey];
    }
    case 2: {
      // A vertex A which lies between two vertices B and C (only has two edges)
      // is only a fork if you can't go back to A from at least one of them.
      return edges.every((n) => vertices[n][vertexKey]);
    }
    default:
      // A vertex with more than two edges (a fork) is always a fork
      return false;
  }
}
