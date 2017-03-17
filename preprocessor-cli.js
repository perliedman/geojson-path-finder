#!/usr/bin/env node

var preprocess = require('./preprocessor');
var fs = require('fs');
var weightFn = process.argv[4] ? require(process.argv[4]) : null;
var precision = Number(process.argv[5]);

var geojson = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
var graph = preprocess(geojson, {
    weightFn: weightFn,
    precision: precision
});
fs.writeFileSync(process.argv[3], JSON.stringify(graph), 'utf-8');
