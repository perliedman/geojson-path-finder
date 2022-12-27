# GeoJSON Path Finder

[![Build status](https://travis-ci.org/perliedman/geojson-path-finder.svg?branch=master)](https://travis-ci.org/perliedman/geojson-path-finder)

Find shortest paths through a network of GeoJSON.

Given a network of GeoJSON `LineString`s, GeoJSON Path Finder will find the shortest path between two points in the network. This might be useful for automatic route searches in smaller networks, where setting up a real route planner like OSRM is too much work, or you simply need to do everything on the client.

See the [GeoJSON Path Finder demo](https://www.liedman.net/geojson-path-finder/).

_Upgrade notice_ Version 2.0 has been released, which is a TypeScript rewrite - you can still use the module from plain JavaScript, of course. This version also contains some breaking changes regarding option naming; for most common use cases, everything will work as before.

Breaking changes:

- option `precision` is now named `tolerance`
- option `keyFn` is now named `key`
- option `weightFn` is now named `weight`
- option `edgeDataReduceFn` is now named `edgeDataReducer`
- option `edgeDataSeed` is now _a function_ taking the properties of the start node

## Installing

```
npm install --save geojson-path-finder
```

## API

Detailed (and somewhat experimental) [API Docs](https://www.liedman.net/geojson-path-finder/docs/)

Create a path finding object:

```javascript
import PathFinder from "geojson-path-finder";
import geojson from "./network.json";

const pathFinder = new PathFinder(geojson);
```

The GeoJSON object should be a `FeatureCollection` of `LineString` features. The network will be built
into a topology, so that lines that start and end, or cross, at the same coordinate are joined such that
you can find a path from one feature to the other.

To find the shortest path between two coordinates:

```javascript
var path = pathFinder.findPath(start, finish);
```

Where `start` and `finish` are two GeoJSON `point` features. Note that both points _have to_ be vertices in the routing network; if they are not, no route will be found.

If a route can be found, an object with two properties: `path` and `weight` is returned, where `path`
is the coordinates the path runs through, and `weight` is the total weight (distance in kilometers, if you use the default weight function) of the path.

As a convenience, the function `pathToGeoJSON` is also exported, it converts the result of a `findPath` call to
a GeoJSON linestring:

```javascript
import PathFinder, { pathToGeoJSON } from "geojson-path-finder";
const pathFinder = new PathFinder(geojson);
const pathLineString = pathToGeoJSON(pathFinder.findPath(start, finish));
```

(If `findPath` does not find a path, pathToGeoJSON will also return `undefined`.)

### `PathFinder` options

The `PathFinder` constructor takes an optional seconds parameter containing `options` that you can
use to control the behaviour of the path finder. Available options:

- `weight` controls how the weight (or cost) of travelling between two vertices is calculated;
  by default, the geographic distance between the coordinates is calculated and used as weight;
  see [Weight functions](#weight-functions) below for details
- `tolerance` (default `1e-5`) controls the tolerance for how close vertices in the GeoJSON can be
  before considered being the same vertice; you can say that coordinates closer than this will be
  snapped together into one coordinate
- `edgeDataReducer` can optionally be used to store data present in the GeoJSON on each edge of
  the routing graph; typically, this can be used for storing things like street names; if specified,
  the reduced data is present on found paths under the `edgeDatas` property
- `edgeDataSeed` is a function returning taking a network feature's `properties` as argument and returning the seed used when reducing edge data with the `edgeDataReducer` above

## Weight functions

By default, the _cost_ of going from one node in the network to another is determined simply by
the geographic distance between the two nodes. This means that, by default, shortest paths will be found.
You can however override this by providing a cost calculation function through the `weight` option:

```javascript
const pathFinder = new PathFinder(geojson, {
  weight: function (a, b, props) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  },
});
```

The weight function is passed two coordinate arrays (in GeoJSON axis order), as well as the feature properties
that are associated with this feature, and should return either:

- a numeric value for the cost of travelling between the two coordinates; in this case, the cost is assumed
  to be the same going from `a` to `b` as going from `b` to `a`; as cost of `0` means the edge can't be used
- an object with two properties: `forward` and `backward`; in this case,
  `forward` denotes the cost of going from `a` to `b`, and
  `backward` the cost of going from `b` to `a`; setting either
  to `0` will prevent taking that direction, the segment will be a oneway.
- `undefined` is the same as setting the weight to `0`: this edge can't be used
