import Queue from "tinyqueue";
import { Key, Vertices } from "./types";

type State = [number, Key[], Key];

export default function findPath(
  graph: Vertices,
  start: Key,
  end: Key
): [number, Key[]] | undefined {
  const costs: Record<Key, number> = { [start]: 0 };
  const initialState: State = [0, [start], start];
  const queue = new Queue([initialState], (a: State, b: State) => a[0] - b[0]);

  while (true) {
    const state = queue.pop();
    if (!state) {
      return undefined;
    }

    const cost = state[0];
    const node = state[2];
    if (node === end) {
      return [state[0], state[1]];
    }

    const neighbours = graph[node];
    Object.keys(neighbours).forEach(function (n) {
      var newCost = cost + neighbours[n];
      if (newCost < Infinity && (!(n in costs) || newCost < costs[n])) {
        costs[n] = newCost;
        const newState: State = [newCost, state[1].concat([n]), n];
        queue.push(newState);
      }
    });
  }
}
