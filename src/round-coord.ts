import { Position } from "@turf/helpers";

export default function roundCoord(
  coord: Position,
  precision: number
): Position {
  return [
    Math.round(coord[0] / precision) * precision,
    Math.round(coord[1] / precision) * precision,
  ];
}
