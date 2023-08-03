import {
  Feature,
  FeatureCollection,
  lineString,
  LineString,
  Point,
  Position,
} from "@turf/helpers";
import { compactNode } from "./compactor";
import findPath from "./dijkstra";
import preprocess from "./preprocessor";
import roundCoord from "./round-coord";
import { defaultKey } from "./topology";
import { Key, Path, PathFinderGraph, PathFinderOptions } from "./types";

export default class PathFinder<TEdgeReduce, TProperties> {
  graph: PathFinderGraph<TEdgeReduce>;
  options: PathFinderOptions<TEdgeReduce, TProperties>;

  constructor(
    network: FeatureCollection<LineString, TProperties>,
    options: PathFinderOptions<TEdgeReduce, TProperties> = {}
  ) {
    this.graph = preprocess(network, options);
    this.options = options;

    // if (
    //   Object.keys(this.graph.compactedVertices).filter(function (k) {
    //     return k !== "edgeData";
    //   }).length === 0
    // ) {
    //   throw new Error(
    //     "Compacted graph contains no forks (topology has no intersections)."
    //   );
    // }
  }

  findPath(
    a: Feature<Point>,
    b: Feature<Point>
  ): Path<TEdgeReduce> | undefined {
    const { key = defaultKey, tolerance = 1e-5 } = this.options;
    const start = key(roundCoord(a.geometry.coordinates, tolerance));
    const finish = key(roundCoord(b.geometry.coordinates, tolerance));

    // We can't find a path if start or finish isn't in the
    // set of non-compacted vertices
    if (!this.graph.vertices[start] || !this.graph.vertices[finish]) {
      return undefined;
    }

    const phantomStart = this._createPhantom(start);
    const phantomEnd = this._createPhantom(finish);
    try {
      const pathResult = findPath(this.graph.compactedVertices, start, finish);

      if (pathResult) {
        const [weight, path] = pathResult;
        return {
          path: path
            .reduce(
              (
                coordinates: Position[],
                vertexKey: Key,
                index: number,
                vertexKeys: Key[]
              ) => {
                if (index > 0) {
                  coordinates = coordinates.concat(
                    this.graph.compactedCoordinates[vertexKeys[index - 1]][
                      vertexKey
                    ]
                  );
                }

                return coordinates;
              },
              []
            )
            .concat([this.graph.sourceCoordinates[finish]]),
          weight,
          edgeDatas:
            "edgeDataReducer" in this.options
              ? path.reduce(
                  (
                    edges: (TEdgeReduce | undefined)[],
                    vertexKey: Key,
                    index: number,
                    vertexKeys: Key[]
                  ) => {
                    if (index > 0) {
                      edges.push(
                        this.graph.compactedEdges[vertexKeys[index - 1]][
                          vertexKey
                        ]
                      );
                    }

                    return edges;
                  },
                  []
                )
              : undefined,
        };
      } else {
        return undefined;
      }
    } finally {
      this._removePhantom(phantomStart);
      this._removePhantom(phantomEnd);
    }
  }

  _createPhantom(n: Key) {
    if (this.graph.compactedVertices[n]) return undefined;

    const phantom = compactNode(
      n,
      this.graph.vertices,
      this.graph.compactedVertices,
      this.graph.sourceCoordinates,
      this.graph.edgeData,
      true,
      this.options
    );
    this.graph.compactedVertices[n] = phantom.edges;
    this.graph.compactedCoordinates[n] = phantom.coordinates;

    if ("edgeDataReducer" in this.options) {
      this.graph.compactedEdges[n] = phantom.reducedEdges;
    }

    Object.keys(phantom.incomingEdges).forEach((neighbor) => {
      this.graph.compactedVertices[neighbor][n] =
        phantom.incomingEdges[neighbor];
      if (!this.graph.compactedCoordinates[neighbor]) {
        this.graph.compactedCoordinates[neighbor] = {};
      }
      this.graph.compactedCoordinates[neighbor][n] = [
        this.graph.sourceCoordinates[neighbor],
        ...phantom.incomingCoordinates[neighbor].slice(0, -1),
      ];
      if (this.graph.compactedEdges) {
        if (!this.graph.compactedEdges[neighbor]) {
          this.graph.compactedEdges[neighbor] = {};
        }
        this.graph.compactedEdges[neighbor][n] = phantom.reducedEdges[neighbor];
      }
    });

    return n;
  }

  _removePhantom(n: Key | undefined) {
    if (!n) return;

    Object.keys(this.graph.compactedVertices[n]).forEach((neighbor) => {
      delete this.graph.compactedVertices[neighbor][n];
    });
    Object.keys(this.graph.compactedCoordinates[n]).forEach((neighbor) => {
      delete this.graph.compactedCoordinates[neighbor][n];
    });
    if ("edgeDataReducer" in this.options) {
      Object.keys(this.graph.compactedEdges[n]).forEach((neighbor) => {
        delete this.graph.compactedEdges[neighbor][n];
      });
    }

    delete this.graph.compactedVertices[n];
    delete this.graph.compactedCoordinates[n];

    if (this.graph.compactedEdges) {
      delete this.graph.compactedEdges[n];
    }
  }
}

export function pathToGeoJSON<TEdgeReduce>(
  path: Path<TEdgeReduce> | undefined
):
  | Feature<
      LineString,
      { weight: number; edgeDatas: (TEdgeReduce | undefined)[] | undefined }
    >
  | undefined {
  if (path) {
    const { weight, edgeDatas } = path;
    return lineString(path.path, { weight, edgeDatas });
  }
}
