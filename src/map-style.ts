import { ColorLike } from "ol/colorlike";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";

export function outlinedStyle(color: ColorLike, width: number) {
  return [
    // new Style({
    //   image: new Circle({
    //     radius: 5,
    //     fill: new Fill({
    //       color: "white",
    //     }),
    //     stroke: new Stroke({
    //       color: "#4466aa",
    //       width: 2,
    //     }),
    //   }),
    //   zIndex: 3,
    // }),
    new Style({
      stroke: new Stroke({
        color: "black",
        width,
      }),
      zIndex: 0,
    }),
    new Style({
      stroke: new Stroke({
        color: "white",
        width: width - 1,
      }),
      zIndex: 1,
    }),
    new Style({
      stroke: new Stroke({
        color,
        width: width - 4,
      }),
      zIndex: 2,
    }),
  ];
}
