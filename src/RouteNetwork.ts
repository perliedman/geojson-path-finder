import PathFinder from "geojson-path-finder";
import { Coordinate } from "ol/coordinate";
import RBush from "rbush";
import knn from "rbush-knn";
import {
  FeatureCollection,
  LineString as GeoJSONLineString,
  Feature as GeoJSONFeature,
  Point,
  Position,
} from "geojson";
import distance from "@turf/distance";

export type NetworkProperties = {
  highway: string;
  maxspeed?: number | string;
  oneway?: string;
  junction?: string;
};

export default class RouteNetwork {
  highlightedRef: string | null = null;
  pathFinder: PathFinder<void, NetworkProperties>;
  coordinatesIndex: CoordinateRBush;

  constructor(
    routeData: FeatureCollection<GeoJSONLineString, NetworkProperties>
  ) {
    this.pathFinder = new PathFinder(routeData, { weight: weightFn });
    this.coordinatesIndex = new CoordinateRBush();
    const coordinates = Object.keys(this.pathFinder.graph.vertices)
      .map((vertex1) =>
        Object.keys(this.pathFinder.graph.vertices[vertex1])
          .filter((vertex2) => {
            const w = this.pathFinder.graph.vertices[vertex1][vertex2];
            return w != null && w !== Infinity;
          })
          .map((vertex2) => [vertexToCoord(vertex1), vertexToCoord(vertex2)])
      )
      .flat(2);
    this.coordinatesIndex.load(coordinates);
  }

  route(waypoints: Coordinate[]) {
    const [startX, startY] = waypoints[0];
    const [endX, endY] = waypoints[waypoints.length - 1];
    const [start] = knn<Coordinate>(this.coordinatesIndex, startX, startY, 1);
    const [end] = knn<Coordinate>(this.coordinatesIndex, endX, endY, 1);
    return this.pathFinder.findPath(point(start), point(end));
  }

  getClosestNetworkCoordinate(coordinate: Coordinate) {
    const [x, y] = coordinate;
    const [closest] = knn<Coordinate>(this.coordinatesIndex, x, y, 1);
    return closest;
  }
}

class CoordinateRBush extends RBush<Coordinate> {
  toBBox([x, y]: Coordinate) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  compareMinX(a: Coordinate, b: Coordinate) {
    return a[0] - b[0];
  }
  compareMinY(a: Coordinate, b: Coordinate) {
    return a[1] - b[1];
  }
}

function point(coordinates: Coordinate): GeoJSONFeature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates },
  };
}

const highwaySpeeds: Record<string, number> = {
  motorway: 110,
  trunk: 90,
  primary: 80,
  secondary: 70,
  tertiary: 50,
  unclassified: 50,
  road: 50,
  residential: 30,
  service: 30,
  living_street: 20,
};

const unknowns: Record<string, boolean> = {};

function weightFn(
  a: Position,
  b: Position,
  props: NetworkProperties
): { forward: number; backward: number } | undefined {
  var d = distance(point(a), point(b)) * 1000,
    factor = 0.9,
    type = props.highway,
    forwardSpeed,
    backwardSpeed;

  if (props.maxspeed) {
    forwardSpeed = backwardSpeed = Number(props.maxspeed);
  } else {
    var linkIndex = type.indexOf("_link");
    if (linkIndex >= 0) {
      type = type.substring(0, linkIndex);
      factor *= 0.7;
    }

    forwardSpeed = backwardSpeed = highwaySpeeds[type] * factor;
    if (!forwardSpeed) {
      unknowns[type] = true;
    }
  }

  if (
    (props.oneway && props.oneway !== "no") ||
    (props.junction && props.junction === "roundabout")
  ) {
    backwardSpeed = 0;
  }

  return {
    forward: d / (forwardSpeed / 3.6),
    backward: d / (backwardSpeed / 3.6),
  };
}

function vertexToCoord(vertexKey: string): Coordinate {
  return vertexKey.split(",").map(Number);
}
