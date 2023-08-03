import distance from "@turf/distance";
import { point } from "@turf/helpers";

const highwaySpeeds = {
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

export default function osmWeight(a, b, props) {
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
  }

  if (
    (props.oneway && props.oneway !== "no") ||
    (props.junction && props.junction === "roundabout")
  ) {
    backwardSpeed = null;
  }

  return {
    forward: forwardSpeed && d / (forwardSpeed / 3.6),
    backward: backwardSpeed && d / (backwardSpeed / 3.6),
  };
}
