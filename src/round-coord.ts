import { Position } from "@turf/helpers";

export default function roundCoord(
  coord: Position,
  tolerance: number
): Position {
  return [
    Math.round(coord[0] / tolerance) * tolerance,
    Math.round(coord[1] / tolerance) * tolerance,
  ];
}
