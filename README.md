GeoJSON Path Finder
===================

[![Build status](https://travis-ci.org/perliedman/geojson-path-finder.png)](https://travis-ci.org/perliedman/geojson-path-finder)

Find shortest path through a network of GeoJSON.

Given a network of GeoJSON `LineString`s, GeoJSON Path Finder will find the shortest path between two points in the network. This might be useful for automatic route searches in smaller networks, where setting up a real route planner like OSRM is too much work,
or you simply need to do everything on the client.

See the [GeoJSON Path Finder demo](http://www.liedman.net/geojson-path-finder/).

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
var path = pathfinder.findPath(start, finish);
```

Where `start` and `finish` are two GeoJSON `point` features.

If a route can be found, an object with two properties: `path` and `weight` is returned, where `path` 
is the coordinates the path runs through, and `weight` is the total weight (distance) of the path.
