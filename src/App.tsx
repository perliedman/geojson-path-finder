import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";

import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import "ol/ol.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { DEVICE_PIXEL_RATIO } from "ol/has.js";
import RouteNetwork, { NetworkProperties } from "./RouteNetwork";
import { Feature } from "ol";
import { toLonLat, transform, transformExtent } from "ol/proj";
import { Coordinate } from "ol/coordinate";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Translate, { TranslateEvent } from "ol/interaction/Translate";
import { LineString, Point, Polygon } from "ol/geom";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { outlinedStyle } from "./map-style";
import { FeatureCollection, LineString as GeoJSONLineString } from "geojson";
import "./index.css";
import { boundingExtent } from "ol/extent";
import { XYZ } from "ol/source";
import { apiToken } from "./config";
import About from "./About";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

function App({
  network,
}: {
  network: FeatureCollection<GeoJSONLineString, NetworkProperties>;
}) {
  const mapContainer: MutableRefObject<HTMLDivElement | null> = useRef(null);

  const map = useLmMap(mapContainer);
  const routeNetwork = useRouteNetwork(map, network);
  const { waypoints } = useWaypoints(map, mapContainer, routeNetwork);
  const debouncedWaypoints = useThrottle(waypoints, 100);

  const route = useMemo(() => {
    if (routeNetwork && debouncedWaypoints.length > 1) {
      const route = routeNetwork.route(debouncedWaypoints);
      if (route) {
        const { path: routeCoordinates, weight: routeDistance } = route;
        return {
          routeCoordinates: routeCoordinates.map((c) =>
            transform(c as Coordinate, "EPSG:4326", "EPSG:3857")
          ),
          routeDistance,
        };
      }
    }
    return null;
  }, [routeNetwork, debouncedWaypoints]);

  useRouteLayer(map, route);

  return (
    <>
      <div className="w-full h-96" ref={mapContainer} />
      {!routeNetwork ? (
        <div className="absolute top-0 w-full h-96 bg-gray-100 z-10 flex items-center justify-center">
          <h1 className="text-2xl">Preparing routing network...</h1>
        </div>
      ) : null}
      <About routeData={network} routeNetwork={routeNetwork || undefined} />
    </>
  );
}

function useLmMap(containerRef: MutableRefObject<HTMLDivElement | null>) {
  const [map, setMap] = useState<Map | null>(null);
  useEffect(() => {
    if (containerRef.current) {
      const topowebb = new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${apiToken}`,
          attributions:
            "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
          tileSize: [512, 512],
          tilePixelRatio: DEVICE_PIXEL_RATIO > 1 ? 2 : 1,
        }),
        zIndex: 0,
      });

      const map = new Map({
        target: containerRef.current,
        layers: [topowebb],
      });
      setMap(map);

      return () => map.setTarget(undefined);
    }
  }, [containerRef]);

  return map;
}

function useRouteNetwork(
  map: Map | null,
  trails: FeatureCollection<GeoJSONLineString, NetworkProperties>
) {
  const [routeNetwork, setRouteNetwork] = useState<RouteNetwork | null>(null);
  useEffect(() => {
    if (map) {
      const routeNetwork = new RouteNetwork(trails);
      const extent = transformExtent(
        boundingExtent(routeNetwork.coordinatesIndex.all()),
        "EPSG:4326",
        "EPSG:3857"
      );
      const worldPolygon = new Polygon([
        [
          [0, 0],
          [0, 1e9],
          [1e9, 1e9],
          [1e9, 0],
          [0, 0],
        ],
        [
          [extent[0], extent[1]],
          [extent[0], extent[3]],
          [extent[2], extent[3]],
          [extent[2], extent[1]],
          [extent[0], extent[1]],
        ],
      ]);
      const maskFeature = new Feature(worldPolygon);
      const maskLayer = new VectorLayer({
        source: new VectorSource({ features: [maskFeature] }),
        style: new Style({
          fill: new Fill({ color: [0, 0, 0, 0.3] }),
          stroke: new Stroke({ color: "orange", width: 1 }),
        }),
        zIndex: 1,
      });
      map.addLayer(maskLayer);
      // map.addLayer(routeNetwork.layer);
      map.getView().fit(extent, { padding: [10, 10, 10, 10] });
      setRouteNetwork(routeNetwork);
      return () => {
        map.removeLayer(maskLayer);
      };
    }
  }, [map, trails]);

  return routeNetwork;
}

const iconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 32],
    anchorXUnits: "fraction",
    anchorYUnits: "pixels",
    src: "marker.svg",
  }),
});

function useWaypoints(
  map: Map | null,
  mapContainer: MutableRefObject<HTMLDivElement | null>,
  routeNetwork: RouteNetwork | null
) {
  const [waypoints, setWaypoints] = useState<Coordinate[]>([
    [11.91103, 57.73631],
    [11.93494, 57.67368],
  ]);

  useEffect(() => {
    const containerElement = mapContainer.current;
    if (containerElement && map && routeNetwork) {
      const onLongPress = (e: MouseEvent) => {
        e.preventDefault();
        const coord = routeNetwork.getClosestNetworkCoordinate(
          toLonLat(map.getEventCoordinate(e), "EPSG:3857")
        );

        setWaypoints((waypoints) => {
          const nextWaypoints = [...waypoints];
          if (nextWaypoints.length > 0) {
            nextWaypoints[1] = coord;
          } else {
            nextWaypoints.push(coord);
          }
          return nextWaypoints;
        });
      };

      containerElement.addEventListener("contextmenu", onLongPress);

      return () => {
        containerElement.removeEventListener("contextmenu", onLongPress);
      };
    }
  }, [map, mapContainer, routeNetwork]);

  useWaypointsLayer(map, routeNetwork, waypoints, setWaypoints);

  return {
    waypoints,
    clearWaypoints: () => setWaypoints([]),
  };
}

function useWaypointsLayer(
  map: Map | null,
  routeNetwork: RouteNetwork | null,
  waypoints: Coordinate[],
  setWaypoints: (setter: (waypoints: Coordinate[]) => Coordinate[]) => void
) {
  const features = useMemo(
    () =>
      waypoints.map(
        (c, index) =>
          new Feature({
            geometry: new Point(transform(c, "EPSG:4326", "EPSG:3857")),
            index,
          })
      ),
    [waypoints]
  );
  const source = useMemo(() => new VectorSource({}), []);
  useEffect(() => {
    source.clear();
    source.addFeatures(features);
  }, [features]);
  const layer = useMemo(
    () => new VectorLayer({ source, zIndex: 3, style: iconStyle }),
    [source]
  );

  useEffect(() => {
    if (map && routeNetwork) {
      const modify = new Translate({
        layers: [layer],
      });

      modify.on("translateend", onMove);
      modify.on("translating", onMove);

      map.addInteraction(modify);

      return () => {
        map.removeInteraction(modify);
      };
    }

    function onMove(e: TranslateEvent) {
      if (!routeNetwork) return;
      const features = e.features.getArray();
      if (features.length > 0) {
        const [feature] = features;
        const index = features[0].get("index") as number;
        const coordinate = routeNetwork.getClosestNetworkCoordinate(
          transform(
            (feature.getGeometry() as Point).getCoordinates(),
            "EPSG:3857",
            "EPSG:4326"
          )
        );
        setWaypoints((waypoints) => {
          const coordinates = [...waypoints];
          coordinates[index] = coordinate;
          return coordinates;
        });
      }
    }
  }, [map, routeNetwork, source, setWaypoints, layer]);

  useEffect(() => {
    if (map) {
      map.addLayer(layer);

      return () => {
        map.removeLayer(layer);
      };
    }
  }, [map, layer]);
}

export default App;

function useRouteLayer(
  map: Map | null,
  route: { routeCoordinates: Coordinate[]; routeDistance: number } | null
) {
  useEffect(() => {
    if (map && route) {
      const routeLayer = new VectorLayer({
        source: new VectorSource({
          features: [new Feature(new LineString(route.routeCoordinates))],
        }),
        style: outlinedStyle("purple", 8),
        zIndex: 2,
      });

      map.addLayer(routeLayer);

      return () => {
        map.removeLayer(routeLayer);
      };
    }
  }, [map, route]);
}

function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLast = now - lastExecuted.current;

    if (timeSinceLast >= delay) {
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      const timeout = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - timeSinceLast);

      return () => clearTimeout(timeout);
    }
  }, [value, delay]);

  return throttledValue;
}
