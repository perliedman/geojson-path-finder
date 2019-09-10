import { compactGraph } from './compactor'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import topology from './topology'

export default function preprocess (graph, options) {
  options = options || {}
  var weightFn = options.weightFn || function defaultWeightFn (a, b) {
    return distance(point(a), point(b))
  }
  var topo

  if (graph.type === 'FeatureCollection') {
    // Graph is GeoJSON data, create a topology from it
    topo = topology(graph, options)
  } else if (graph.edges) {
    // Graph is a preprocessed topology
    topo = graph
  }

  var graph2 = topo.edges.reduce(function buildGraph (g, edge, i, es) {
    var a = edge[0]
    var b = edge[1]
    var props = edge[2]
    var w = weightFn(topo.vertices[a], topo.vertices[b], props)
    var makeEdgeList = function makeEdgeList (node) {
      if (!g.vertices[node]) {
        g.vertices[node] = {}
        if (options.edgeDataReduceFn) {
          g.edgeData[node] = {}
        }
      }
    }
    var concatEdge = function concatEdge (startNode, endNode, weight) {
      var v = g.vertices[startNode]
      v[endNode] = weight
      if (options.edgeDataReduceFn) {
        g.edgeData[startNode][endNode] = options.edgeDataReduceFn(options.edgeDataSeed, props)
      }
    }

    if (w) {
      makeEdgeList(a)
      makeEdgeList(b)
      if (w instanceof Object) {
        if (w.forward) {
          concatEdge(a, b, w.forward)
        }
        if (w.backward) {
          concatEdge(b, a, w.backward)
        }
      } else {
        concatEdge(a, b, w)
        concatEdge(b, a, w)
      }
    }

    if (i % 1000 === 0 && options.progress) {
      options.progress('edgeweights', i, es.length)
    }

    return g
  }, { edgeData: {}, vertices: {} })

  var compact = compactGraph(graph2.vertices, topo.vertices, graph2.edgeData, options)

  return {
    vertices: graph2.vertices,
    edgeData: graph2.edgeData,
    sourceVertices: topo.vertices,
    compactedVertices: compact.graph,
    compactedCoordinates: compact.coordinates,
    compactedEdges: options.edgeDataReduceFn ? compact.reducedEdges : null
  }
}
