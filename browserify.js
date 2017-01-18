// Runs from npm install
var inFile = './src/module.js';
var outFile = './mongolocal.min.js';
var standalone = 'mongolocal';
var mapFile = standalone + '.js.map';

var fs = require('fs');
var browserify = require('browserify');

var b = browserify({standalone: standalone, debug: true});
b.add(inFile);

b.plugin('minifyify', {map: mapFile});

b.ignore('request');
b.bundle(function (err, src, map) {
	fs.writeFileSync(mapFile, map);
}).pipe(fs.createWriteStream(outFile));