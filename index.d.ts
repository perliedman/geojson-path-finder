declare module 'geojson-path-finder' {
    import {Feature, FeatureCollection, GeoJsonProperties, LineString, Point, Position} from 'geojson';

    export type Weight = number | { forward?: number, backward?: number }

    export type PathFinderOptions<A, G> = {
        weightFn?: (a: Position, b: Position, options: PathFinderOptions<A, G>) => Weight,
        precision?: number,
        edgeDataReduceFn?: (left: A | undefined, right: A | G) => A,
        edgeDataSeed?: A | -1
    }

    export type Route<A> = {
        path: Position[],
        edgeDatas?: [{ reducedEdge: A }],
        weight: number
    }

    export default class PathFinder<A = undefined, G = GeoJsonProperties> {
        constructor(geoJson: FeatureCollection<LineString, G>, options?: PathFinderOptions<A, G>)

        findPath(start: Feature<Point>, finish: Feature<Point>): Route<A>
    }
}
