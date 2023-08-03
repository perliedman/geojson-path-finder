import largeNetwork from "./large-network.json";
import preprocess from "../src/preprocessor";
import { test } from "vitest";
import osmWeight from "./osm-weight";

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
