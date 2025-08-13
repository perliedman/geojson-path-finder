import { FeatureCollection, LineString } from "geojson";
import RouteNetwork from "./RouteNetwork";
import { ReactNode, useMemo } from "react";
import lineDistance from "@turf/line-distance";

const numberFormat = new Intl.NumberFormat();

export default function About({
  routeData,
  routeNetwork,
}: {
  routeData: FeatureCollection<LineString>;
  routeNetwork?: RouteNetwork;
}) {
  const totalDistance = useMemo(
    () =>
      routeData.features.reduce(function (total, feature) {
        if (feature.geometry.type === "LineString") {
          return (total += lineDistance(feature, "kilometers"));
        } else {
          return total;
        }
      }, 0),
    [routeData]
  );
  const networkStats = useMemo(() => {
    const graph = routeNetwork?.pathFinder.graph.compactedVertices;
    if (!graph) return null;
    const nodeNames = Object.keys(graph);
    const totalNodes = nodeNames.length;
    const totalEdges = nodeNames.reduce(function (total, nodeName) {
      return total + Object.keys(graph[nodeName]).length;
    }, 0);
    return { totalNodes, totalEdges };
  }, [routeNetwork]);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-center text-4xl">GeoJSON Path Finder</h1>
      <p className="text-center text-xl mt-4">
        Serverless, offline routing in the browser
      </p>

      <div className="flex justify-center gap-1">
        {links.map(([label, url]) => (
          <a
            href={url}
            className="bg-sky-500 text-white px-6 py-2 rounded tracking-wider font-bold hover:bg-sky-600"
          >
            {label}
          </a>
        ))}
      </div>

      <P>
        GeoJSON Path Finder is a standalone JavaScript library for routing/path
        finding using GeoJSON as input. It can run offline in the browser
        without any server, or as a part of a Node.js application. It is ideal
        for simpler use cases where a more complete routing engine like OSRM or
        GraphHopper is overkill or not possible.
      </P>
      <P>
        Given a road network in the form of a GeoJSON FeatureCollection of
        LineString features, the library builds a routable graph which can
        perform fast shortest path searches. In the demo above, the road network
        for a smaller sized city (data from OpenStreetMap) is used:
      </P>
      {routeNetwork && networkStats ? (
        <ul className="ml-5 list-disc">
          <Stat label="Total Road Length" value={totalDistance} unit="km" />
          <Stat
            label="Network Nodes"
            value={networkStats.totalNodes / 1000}
            unit="k"
          />
          <Stat
            label="Network Edges"
            value={networkStats.totalEdges / 1000}
            unit="k"
          />
          <Stat
            label="Coordinates"
            value={routeNetwork?.coordinatesIndex.all().length / 1000}
            unit="k"
          />
        </ul>
      ) : (
        <div className="text-center text-gray-400 my-8">
          Route Network is initializing...
        </div>
      )}
      <P>
        As can be seen by dragging the waypoint markers, GeoJSON Path Finder
        runs fast enough for interactive feedback with a graph of this size.
      </P>
      <P>
        The library comes without any user interface, and can easily be
        integrated in any routing application. The demo above uses OpenLayers
        with a simple custom user interface.
      </P>
      <h2 className="text-2xl mt-8">Using</h2>
      <P>GeoJSON Path Finder is distributed through npm:</P>

      <code>
        <pre>{`  npm install --save geojson-path-finder`}</pre>
      </code>

      <P>
        The API is exposed through the class PathFinder, which is created with
        the GeoJSON network used for routing:
      </P>

      <code>
        <pre>
          {`  import PathFinder from 'geojson-path-finder'
  import geojson from './network.json'
  const pathFinder = new PathFinder(geojson);`}
        </pre>
      </code>

      <P>
        The network must be a GeoJSON FeatureCollection, where the features have
        LineString geometries. The network will be built into a topology, so
        that lines that start and end, or cross, at the same coordinate are
        joined so that you can find a path from one feature to the other. By
        default, coordinates very close to each other will also be snapped
        together; by default coordinates with less than 0.00001 difference in
        latitude or longitude will be considered the same, but this precision
        can be adjusted with the tolerance option:
      </P>

      <code>
        <pre>
          const pathFinder = new PathFinder(geojson, {"{"} tolerance: 1e-3 {"}"}
          );
        </pre>
      </code>

      <P>
        By default, the cost of going from one node in the network to another is
        determined simply by the geographic distance between the two nodes. This
        means that, by default, shortest paths will be found. You can however
        override this by providing a cost calculation function through the
        weight option:
      </P>

      <code>
        <pre>{`
  const pathFinder = new PathFinder(geojson, {
    weight: (a, b, props) => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      return Math.sqrt(dx * dx + dy * dy);
    }
  });
        `}</pre>
      </code>

      <P>
        The weight function is passed two coordinate arrays (in GeoJSON axis
        order), as well as the feature properties that are associated with this
        feature, and should return either: a numeric value for the cost of
        travelling between the two coordinates; in this case, the cost is
        assumed to be the same going from a to b as going from b to a. 0 means
        the edge can not be used. an object with two properties: forward and
        backward; in this case, forward denotes the cost of going from a to b,
        and backward the cost of going from b to a; setting either to 0, null or
        undefined will prevent taking that direction, the segment will be a
        oneway. To find the shortest (or lowest cost) route between to points,
        use the findPath method:
      </P>

      <code>
        <pre>{`
  const path = pathfinder.findPath(start, finish);
`}</pre>
      </code>

      <P>
        start and finish must be GeoJSON Point features, where the coordinates
        are within the routing network, or at least possible to snap to the
        network with the PathFinder's precision. If a route can be found, an
        object with two properties: path and weight, is returned, where path is
        the coordinates the path runs through, and weight is the total weight
        (distance) of the path.
      </P>
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-6 leading-relaxed">{children}</p>;
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <li>
      <span className="text-gray-600 mr-2">{label}:</span>{" "}
      <strong>
        {numberFormat.format(Math.round(value))} {unit}
      </strong>
    </li>
  );
}

const links = [
  ["About", "#about"],
  ["Using", "#using"],
  ["API", "docs/index.html"],
  ["Code", "https://github.com/perliedman/geojson-path-finder/"],
];
