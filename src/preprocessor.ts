import distance from "@turf/distance";
import { FeatureCollection, LineString, point, Position } from "@turf/helpers";
import type {
  PathFinderGraph,
  PathFinderOptions,
  Edge,
  Key,
  Vertices,
} from "./types";
import compactGraph from "./compactor";
import createTopology from "./topology";

export default function preprocess<TEdgeReduce, TProperties>(
  network: FeatureCollection<LineString, TProperties>,
  options: PathFinderOptions<TEdgeReduce, TProperties> = {}
): PathFinderGraph<TEdgeReduce> {
  const topology = createTopology(network, options);
  const { weight = defaultWeight } = options;

  const graph = topology.edges.reduce(reduceEdges, {
    edgeData: {},
    vertices: {},
  } as PathFinderGraph<TEdgeReduce>);

  const {
    vertices: compactedVertices,
    coordinates: compactedCoordinates,
    edgeData: compactedEdges,
  } = compactGraph(graph.vertices, topology.vertices, graph.edgeData, options);

  return {
    vertices: graph.vertices,
    edgeData: graph.edgeData,
    sourceCoordinates: topology.vertices,
    compactedVertices,
    compactedCoordinates,
    compactedEdges,
  };

  function reduceEdges(
    g: PathFinderGraph<TEdgeReduce>,
    edge: Edge<TProperties>,
    i: number,
    es: Edge<TProperties>[]
  ) {
    const [a, b, properties] = edge;
    const w = weight(topology.vertices[a], topology.vertices[b], properties);

    if (w) {
      makeEdgeList(a);
      makeEdgeList(b);
      // If the weight for an edge is falsy, it means the edge is impassable;
      // we still add the edge to the graph, but with a weight of Infinity,
      // since this makes compaction easier.
      // After compaction, we remove any edge with a weight of Infinity.
      if (w instanceof Object) {
        concatEdge(a, b, w.forward || Infinity);
        concatEdge(b, a, w.backward || Infinity);
      } else {
        concatEdge(a, b, w || Infinity);
        concatEdge(b, a, w || Infinity);
      }
    }

    if (i % 1000 === 0 && options.progress) {
      options.progress("edgeweights", i, es.length);
    }

    return g;

    function makeEdgeList(node: Key) {
      if (!g.vertices[node]) {
        g.vertices[node] = {};
        g.edgeData[node] = {};
      }
    }

    function concatEdge(startNode: Key, endNode: Key, weight: number) {
      var v = g.vertices[startNode];
      v[endNode] = weight;
      g.edgeData[startNode][endNode] =
        "edgeDataReducer" in options
          ? options.edgeDataSeed(properties)
          : undefined;
    }
  }
}

function defaultWeight(a: Position, b: Position) {
  return distance(point(a), point(b));
}
