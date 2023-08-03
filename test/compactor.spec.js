import { expect, test } from "vitest";
import compactGraph from "../src/compactor";

test("removes redundant vertices 1", () => {
  const compacted = compactGraph(
    {
      "0,0": { "1,0": 1 },
      "1,0": { "0,0": 1, "2,0": 1 },
      "2,0": { "1,0": 1 },
    },
    {
      "0,0": [0, 0],
      "1,0": [1, 0],
      "2,0": [2, 0],
    },
    {},
    {}
  );

  expect(compacted.vertices).toEqual({
    "0,0": { "2,0": 2 },
    "2,0": { "0,0": 2 },
  });
});

test("removes redundant vertices 2", () => {
  const compacted = compactGraph(
    {
      "0,0": { "1,0": 1 },
      "1,0": { "0,0": 1, "2,0": 1, "1,1": 1 },
      "1,1": { "1,0": 1 },
      "2,0": { "1,0": 1 },
    },
    {
      "0,0": [0, 0],
      "1,0": [1, 0],
      "1,1": [1, 1],
      "2,0": [2, 0],
    },
    {},
    {}
  );

  expect(compacted.vertices).toEqual({
    "0,0": { "1,0": 1 },
    "1,0": { "0,0": 1, "2,0": 1, "1,1": 1 },
    "1,1": { "1,0": 1 },
    "2,0": { "1,0": 1 },
  });
});

test("does not remove all vertices from circle", () => {
  const compacted = compactGraph(
    {
      "0,0": { "1,0": 1, "0,1": 1 },
      "1,0": { "0,0": 1, "1,1": 1 },
      "1,1": { "1,0": 1, "0,1": 1 },
      "0,1": { "1,1": 1, "0,0": 1 },
    },
    {
      "0,0": [0, 0],
      "1,0": [1, 0],
      "1,1": [1, 1],
      "0,1": [0, 1],
    },
    {},
    {}
  );
  expect(Object.keys(compacted.vertices).length).toBeGreaterThan(0);
});
