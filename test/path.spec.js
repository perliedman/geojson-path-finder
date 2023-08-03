import { expect, test } from "vitest";

import PathFinder from "../src/index";
import geojson from "./network.json";
import geojson66 from "./66.json";
import largeNetwork from "./large-network.json";
import { point } from "@turf/helpers";
import distance from "@turf/distance";
import osmWeight from "./osm-weight";

test("can create PathFinder", () => {
  const pathfinder = new PathFinder(geojson);
  expect(pathfinder).toBeTruthy();
});

test("can find path (simple)", () => {
  const network = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [1, 1],
          ],
        },
      },
    ],
  };

  const pathfinder = new PathFinder(network);
  const path = pathfinder.findPath(point([0, 0]), point([1, 1]));

  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.path.length).toBe(3);
  expect(path.weight).toBeGreaterThan(0);
});

test("can find path (medium)", () => {
  const network = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [1, 1],
          ],
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [0, 1],
            [1, 1],
          ],
        },
      },
    ],
  };

  const pathfinder = new PathFinder(network),
    path = pathfinder.findPath(point([0, 0]), point([1, 1]));

  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.path.length).toBe(3);
  expect(path.weight).toBeGreaterThan(0);
});

test("can find path (complex)", () => {
  const pathfinder = new PathFinder(geojson),
    path = pathfinder.findPath(
      point([8.44460166, 59.48947469]),
      point([8.44651, 59.513920000000006])
    );

  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.weight).toBeGreaterThan(0);
  expect(path.path.length).toBe(220);
  expect(path.weight).toBeCloseTo(6.3751);
});

test("can handle network without forks", () => {
  const pathFinder = new PathFinder(require("./advent24.json"), {
    weight: function (a, b) {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      return Math.sqrt(dx * dx + dy * dy);
    },
  });
  const path = pathFinder.findPath(point([1, 1]), point([9, 1]));
  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.weight).toBe(8);
});

test("can handle multiple path searches in network without forks", () => {
  const pathFinder = new PathFinder(require("./advent24.json"), {
    weight: function (a, b) {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      return Math.sqrt(dx * dx + dy * dy);
    },
  });

  for (let i = 0; i < 2; i++) {
    pathFinder.findPath(point([1, 1]), point([9, 1]));
  }
});

// test("can handle island network", () => {
//   const pathFinder = new PathFinder(require("./islands.json"));
//   for (let i = 0; i < 2; i++) {
//   const path = pathFinder.findPath(point([12.7237479, 55.9095736]), point([12.6766066, 55.9092587]));
//   }
// })

test("does not remove vertices from result", (t) => {
  const pathfinder = new PathFinder(geojson66, {
      weight: (a, b) => {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
      },
      tolerance: 1,
    }),
    path = pathfinder.findPath(point([0, 0]), point([15, 12]));

  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.weight).toBeGreaterThan(0);
  expect(path.path.length).toBe(7);
  expect(path.weight).toBeCloseTo(21.9574);
});

test("can make oneway network", () => {
  const network = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0],
          ],
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 0],
            [1, 1],
          ],
        },
      },
    ],
  };

  const pathfinder = new PathFinder(network, {
    weight: function (a, b) {
      return {
        forward: distance(point(a), point(b)),
      };
    },
  });
  const path1 = pathfinder.findPath(point([0, 0]), point([1, 1]));

  expect(path1).toBeTruthy();
  expect(path1.path).toBeTruthy();
  expect(path1.weight).toBeGreaterThan(0);

  const path2 = pathfinder.findPath(point([1, 1]), point([0, 0]));
  expect(path2).toBeUndefined();
});

test("can reduce data on edges", () => {
  const pathfinder = new PathFinder(geojson, {
      edgeDataReducer: function (a, p) {
        return { id: p.id };
      },
      edgeDataSeed: () => -1,
    }),
    path = pathfinder.findPath(
      point([8.44460166, 59.48947469]),
      point([8.44651, 59.513920000000006])
    );

  expect(path).toBeTruthy();
  expect(path.edgeDatas).toBeTruthy();
  expect(
    path.edgeDatas.every(function (e) {
      return e;
    })
  ).toBeTruthy();
});

function edgeReduce(a, p) {
  const a_arr = a.id;
  p.id.forEach(function (id) {
    a_arr.push(id);
  });
  return { id: Array.from(new Set(a_arr)) };
}

test("captures all edge data", () => {
  const pathfinder = new PathFinder(geojson, {
      edgeDataReducer: edgeReduce,
      edgeDataSeed: (properties) => ({ id: [properties.id] }),
    }),
    path = pathfinder.findPath(
      point([8.44460166, 59.48947469]),
      point([8.44651, 59.513920000000006])
    );

  expect(path).toBeTruthy();
  expect(path.edgeDatas).toBeTruthy();
  expect(
    path.edgeDatas.some(function (e) {
      return e.id.indexOf(2001) > -1;
    })
  ).toBeTruthy();
});

test("finding a path between nodes not in original graph", () => {
  const pathfinder = new PathFinder(geojson, {
      edgeDataReducer: function (a, p) {
        return { id: p.id };
      },
      edgeDataSeed: (properties) => ({ id: properties.id }),
    }),
    path = pathfinder.findPath(point([8.3, 59.3]), point([8.5, 59.6]));

  expect(path).toBeUndefined();
});

test("can route through large, complex one-way network", () => {
  const pathfinder = new PathFinder(largeNetwork, {
    weight: osmWeight,
    tolerance: 1e-9,
  });
  const path = pathfinder.findPath(
    point([11.9954516, 57.7125743]),
    point([11.9608099, 57.6808616])
  );
  expect(path).toBeTruthy();
  expect(path.path).toBeTruthy();
  expect(path.weight).toBeGreaterThan(0);
});
