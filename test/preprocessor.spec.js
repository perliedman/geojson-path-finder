import largeNetwork from "./large-network.json";
import preprocess from "../src/preprocessor";
import { expect, test } from "vitest";
import osmWeight from "./osm-weight";
import twoIslands from "./two-islands.json";
import createTopology from "../src/topology";

test("preprocesses a large network", () => {
  var highwaySpeeds = {
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

  var unknowns = {};

  preprocess(largeNetwork, { weight: osmWeight, precision: 1e-9 });
});

test("compacts islands correctly", () => {
  const graph = preprocess(twoIslands);
  expect(Object.keys(graph.compactedVertices).length).toEqual(2);
});
