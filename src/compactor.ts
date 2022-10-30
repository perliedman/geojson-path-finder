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
 * @param vertices the graph's vertices (a lookup of vertex edges and weights)
 * @param vertexCoords the geographic coordinates of the vertices
 * @param edgeData the (optional) data associated with each edge
 * @param options options used for creating and compacting the graph
 * @returns
 */
export default function compactGraph<TEdgeData, TProperties>(
  vertices: Vertices,
  vertexCoords: Coordinates,
  edgeData: Record<Key, Record<Key, TEdgeData | undefined>>,
  options: PathFinderOptions<TEdgeData, TProperties> = {}
) {
  const { progress, compact = true } = options;
  const ends = Object.keys(vertices).reduce(findForks, {});

  return Object.keys(ends).reduce(compactFork, {
    graph: {},
    coordinates: {},
    reducedEdges: {},
  });

  function findForks(
    ends: Vertices,
    key: Key,
    index: number,
    vertexKeys: Key[]
  ): Vertices {
    const vertex = vertices[key];
    const edges = Object.keys(vertex);
    const numberEdges = edges.length;
    let isEnd;

    if (!compact) {
      // If instructed not to compact, everything is treated as a fork
      // (can't be compacted)
      isEnd = true;
    } else if (numberEdges === 1) {
      // A vertex with a single edge A->B is a fork
      // if B has an edge to A.
      // (It's a fork in the sense that it is a dead end and you can only turn back to B.)
      const other = vertices[edges[0]];
      isEnd = other[key];
    } else if (numberEdges === 2) {
      // A vertex A which lies between two vertices B and C (only has two edges)
      // is only a fork if you can't go back to A from at least one of them.
      isEnd = edges.some((n) => !vertices[n][key]);
    } else {
      // A vertex with more than two edges (a fork) is always a fork
      isEnd = true;
    }

    if (isEnd) {
      ends[key] = vertex;
    }

    if (index % 1000 === 0 && progress) {
      progress("compact:ends", index, vertexKeys.length);
    }

    return ends;
  }

  function compactFork(
    result: {
      graph: Vertices;
      coordinates: Record<Key, Record<Key, Position[]>>;
      reducedEdges: Record<Key, Record<Key, TEdgeData | undefined>>;
    },
    key: Key,
    index: number,
    forks: Key[]
  ) {
    var compacted = compactNode(
      key,
      vertices,
      ends,
      vertexCoords,
      edgeData,
      false,
      options
    );
    result.graph[key] = compacted.edges;
    result.coordinates[key] = compacted.coordinates;
    result.reducedEdges[key] = compacted.reducedEdges;

    if (index % 1000 === 0 && progress) {
      progress("compact:nodes", index, forks.length);
    }

    return result;
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
      reverseWeight += vertices[next][vertexKey];

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
