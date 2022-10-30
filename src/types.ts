import { Position } from "@turf/helpers";

export type Key = string;
export type Edge<TProperties> = [Key, Key, TProperties];
export type Topology<TProperties> = {
  vertices: Coordinates;
  edges: Edge<TProperties>[];
};

export type Vertex = Record<Key, number>;
export type Vertices = Record<Key, Vertex>;
export type Coordinates = Record<Key, Position>;

export type PathFinderGraph<TEdgeData> = {
  vertices: Vertices;
  edgeData: Record<Key, Record<Key, TEdgeData | undefined>>;
  sourceCoordinates: Coordinates;
  compactedVertices: Vertices;
  compactedCoordinates: Record<Key, Record<Key, Position[]>>;
  compactedEdges: Record<Key, Record<Key, TEdgeData | undefined>>;
};

export type PathFinderOptions<TEdgeReduce, TProperties> = {
  tolerance?: number;
  key?: (coordinates: Position) => string;
  compact?: boolean;
  /**
   * Calculate weight for an edge from a node at position a to a node at position b
   * @param {Position} a coordinate of node A
   * @param {Position} b coordinate of node B
   * @param {Properties} properties the properties associated with the network's LineString from a to b
   * @returns the weight of the edge, zero indicates the edge is not passable
   */
  weight?: (
    a: Position,
    b: Position,
    properties: TProperties
  ) => number | { forward: number; backward: number } | undefined;
  progress?: (type: string, completed: number, total: number) => void;
} & (
  | {
      edgeDataReducer: (
        seed: TEdgeReduce,
        modifier: TEdgeReduce
      ) => TEdgeReduce;
      edgeDataSeed: (properties: TProperties) => TEdgeReduce;
    }
  | {}
);
