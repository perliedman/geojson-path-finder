import explode from '@turf/explode'
import roundCoord from './round-coord'

function geoJsonReduce (geojson, fn, seed) {
  if (geojson.type === 'FeatureCollection') {
    return geojson.features.reduce(function reduceFeatures (a, f) {
      return geoJsonReduce(f, fn, a)
    }, seed)
  } else {
    return fn(seed, geojson)
  }
}

function geoJsonFilterFeatures (geojson, fn) {
  var features = []
  if (geojson.type === 'FeatureCollection') {
    features = features.concat(geojson.features.filter(fn))
  }

  return {
    type: 'FeatureCollection',
    features: features
  }
}

function isLineString (f) {
  return f.geometry.type === 'LineString'
}

export default function topology (geojson, options) {
  options = options || {}
  var keyFn = options.keyFn || function defaultKeyFn (c) {
    return c.join(',')
  }
  var precision = options.precision || 1e-5

  var lineStrings = geoJsonFilterFeatures(geojson, isLineString)
  var explodedLineStrings = explode(lineStrings)
  var vertices = explodedLineStrings.features.reduce(function buildTopologyVertices (cs, f, i, fs) {
    var rc = roundCoord(f.geometry.coordinates, precision)
    cs[keyFn(rc)] = f.geometry.coordinates

    if (i % 1000 === 0 && options.progress) {
      options.progress('topo:vertices', i, fs.length)
    }

    return cs
  }, {})
  var edges = geoJsonReduce(lineStrings, function buildTopologyEdges (es, f, i, fs) {
    f.geometry.coordinates.forEach(function buildLineStringEdges (c, i, cs) {
      if (i > 0) {
        var k1 = keyFn(roundCoord(cs[i - 1], precision))
        var k2 = keyFn(roundCoord(c, precision))
        es.push([k1, k2, f.properties])
      }
    })

    if (i % 1000 === 0 && options.progress) {
      options.progress('topo:edges', i, fs.length)
    }

    return es
  }, [])

  return {
    vertices: vertices,
    edges: edges
  }
}
