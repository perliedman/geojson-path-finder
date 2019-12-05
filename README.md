GeoJSON Path Finder
===================

[![Greenkeeper badge](https://badges.greenkeeper.io/perliedman/geojson-path-finder.svg)](https://greenkeeper.io/) [![Build status](https://travis-ci.org/perliedman/geojson-path-finder.svg?branch=master)](https://travis-ci.org/perliedman/geojson-path-finder)

Find shortest path through a network of GeoJSON.

Given a network of GeoJSON `LineString`s, GeoJSON Path Finder will find the shortest path between two points in the network. This might be useful for automatic route searches in smaller networks, where setting up a real route planner like OSRM is too much work,
or you simply need to do everything on the client.

See the [GeoJSON Path Finder demo](https://www.liedman.net/geojson-path-finder/).

## Installing

```
npm install --save geojson-path-finder
```

## API

Create a path finding object:

```javascript
var PathFinder = require('geojson-path-finder'),
    geojson = require('./network.json');

var pathFinder = new PathFinder(geojson);
```

The GeoJSON object should be a `FeatureCollection` of `LineString` features. The network will be built
into a topology, so that lines that start and end, or cross, at the same coordinate are joined such that
you can find a path from one feature to the other.

To find the shortest path between two coordinates:

```javascript
var path = pathFinder.findPath(start, finish);
```

Where `start` and `finish` are two GeoJSON `point` features.

If a route can be found, an object with two properties: `path` and `weight` is returned, where `path` 
is the coordinates the path runs through, and `weight` is the total weight (distance in kilometers, if you use the default weight function) of the path.

### `PathFinder` options

The `PathFinder` constructor takes an optional seconds parameter containing `options` that you can
use to control the behaviour of the path finder. Available options:

* `weightFn` controls how the weight (or cost) of travelling between two vertices is calculated;
  by default, the geographic distance between the coordinates is calculated and used as weight;
  see [Weight functions](#weight-functions) below for details
* `precision` (default `1e-5`) controls the tolerance for how close vertices in the GeoJSON can be
  before considered being the same vertice; you can say that coordinates closer than this will be
  snapped together into one coordinate
* `edgeDataReduceFn` can optionally be used to store data present in the GeoJSON on each edge of 
  the routing graph; typically, this can be used for storing things like street names; if specified,
  the reduced data is present on found paths under the `edgeDatas` property
* `edgeDataSeed` is the seed used when reducing edge data with the `edgeDataReduceFn` above

## Weight functions

By default, the _cost_ of going from one node in the network to another is determined simply by
the geographic distance between the two nodes. This means that, by default, shortest paths will be found.
You can however override this by providing a cost calculation function through the `weightFn` option:

```javascript
var pathFinder = new PathFinder(geojson, {
weightFn: function(a, b, props) {
var dx = a[0] - b[0];
var dy = a[1] - b[1];
return Math.sqrt(dx * dx + dy * dy);
}
});
```

The weight function is passed two coordinate arrays (in GeoJSON axis order), as well as the feature properties
that are associated with this feature, and should return either:

* a numeric value for the cost of travelling between the two coordinates; in this case, the cost is assumed
  to be the same going from `a` to `b` as going from `b` to `a`
* an object with two properties: `forward` and `backward`; in this case,
  `forward` denotes the cost of going from `a` to `b`, and
  `backward` the cost of going from `b` to `a`; setting either
  to `0`, `null` or `undefined` will prevent taking that direction,
  the segment will be a oneway.
