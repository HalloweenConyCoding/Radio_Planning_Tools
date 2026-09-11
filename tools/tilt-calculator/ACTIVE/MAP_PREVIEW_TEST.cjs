const assert = require('assert/strict');
const fs = require('fs');
const vm = require('vm');

const htmlPath = __dirname + '/cell_coverage_calculator.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const style = fs.readFileSync(__dirname + '/cell_coverage_calculator_style.css', 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((script) => script.includes('function calculate()'));

const document = {
  getElementById() { return { value: '', innerHTML: '' }; },
  querySelector() { return { value: 'Macro' }; },
  querySelectorAll() { return []; }
};
const context = { document, alert() {}, console };
vm.createContext(context);
vm.runInContext(source, context, { filename: htmlPath });

assert.equal(typeof context.buildMapBeamSegments, 'function', 'map segment helper should be available');
assert.equal(typeof context.buildMapCoverageSector, 'function', 'coverage sector helper should be available');
assert.equal(typeof context.parseMapCoordinatePair, 'function', 'coordinate pair parser should be available');
assert.equal(typeof context.buildMapCoverageGradientLayers, 'function', 'coverage gradient helper should be available');
assert.equal(typeof context.getTiltMapColors, 'function', 'map color constants should be available');
assert.equal(typeof context.setMapLayerOpacity, 'function', 'map layer transition helper should be available');
assert.equal(typeof context.createTiltDirectionIcon, 'undefined', 'separate direction triangle should not be available');
assert.ok(!source.includes('directionMarker'), 'map preview should not add a separate direction marker');
assert.ok(!style.includes('tilt-map-direction-arrow'), 'direction triangle styling should be removed');
assert.ok(source.includes('TILT_MAP_COVERAGE_COLORS'), 'coverage gradient colors should remain available');

const fadingLayer = {
  options: { opacity: 0.95, fillOpacity: 0.2 },
  setStyle(style) { this.style = style; }
};
context.setMapLayerOpacity(fadingLayer, 0.25);
context.setMapLayerOpacity(fadingLayer, 1);
assert.equal(fadingLayer.style.opacity, 0.95, 'layer transition should preserve vector opacity');
assert.equal(fadingLayer.style.fillOpacity, 0.2, 'layer transition should preserve fill opacity');
assert.match(html, /<label for="map-coordinates">Coordinates \(lat, lng\)<\/label>/, 'map should expose one coordinate-pair label');
assert.match(html, /<input id="map-coordinates" type="text"[^>]*>/, 'map should expose one text coordinate-pair field');
assert.doesNotMatch(html, /id="map-latitude"|id="map-longitude"/, 'separate latitude and longitude fields should be removed');
assert.ok(source.includes('function handleMapInputChange()'), 'map input changes should use a shared redraw handler');
assert.ok(source.includes("['map-coordinates', 'map-azimuth']"), 'coordinate pair and azimuth should be the map input controls');
assert.ok(source.includes('scrollWheelZoom: false'), 'ordinary map wheel events should remain available to the right-column scroller');
assert.ok(source.includes('function handleMapWheel(event)'), 'modified map wheel zoom should use a dedicated handler');
assert.match(html, /Hold Ctrl\/Cmd while scrolling to zoom the map\./, 'map should explain modified-wheel zoom');
assert.ok(source.includes('function createTiltSiteIcon(azimuth = 0)'), 'antenna icon should accept the map azimuth');
assert.ok(source.includes('createTiltSiteIcon(mapInputs.azimuth)'), 'antenna icon should use the rendered beam azimuth');
assert.ok(style.includes('--tilt-map-azimuth'), 'antenna icon styling should expose an azimuth rotation');

assert.equal(JSON.stringify(context.parseMapCoordinatePair('13.98937472,100.61781242')), JSON.stringify({
  latitude: 13.98937472,
  longitude: 100.61781242
}));
assert.equal(JSON.stringify(context.parseMapCoordinatePair('-13.5 100.25')), JSON.stringify({
  latitude: -13.5,
  longitude: 100.25
}));
assert.equal(JSON.stringify(context.parseMapCoordinatePair('13.5 ,100.25')), JSON.stringify({
  latitude: 13.5,
  longitude: 100.25
}));
assert.equal(JSON.stringify(context.parseMapCoordinatePair('13.5 , 100.25')), JSON.stringify({
  latitude: 13.5,
  longitude: 100.25
}));
for (const input of ['', '13.5', '13.5,', '13.5,100.25,2', 'north,100.25']) {
  assert.equal(context.parseMapCoordinatePair(input), null, `invalid coordinate pair should be rejected: ${input}`);
}

const gradientLayers = context.buildMapCoverageGradientLayers({ lat: 0, lng: 0 }, 90, 60, 1000);
assert.equal(JSON.stringify(gradientLayers.map(({ color, distance }) => ({ color, distance }))), JSON.stringify([
  { color: '#ff4d5a', distance: 1000 },
  { color: '#ffe45e', distance: 670 },
  { color: '#32e875', distance: 340 }
]))
assert.equal(JSON.stringify(gradientLayers.map(({ points }) => points[0])), JSON.stringify([[0, 0], [0, 0], [0, 0]]), 'gradient layers should share the antenna origin');
assert.ok(gradientLayers[0].points[1][0] > 0 && gradientLayers[0].points[1][1] > 0, 'gradient layers should preserve the clockwise-left edge');
const gradientMidpoint = gradientLayers[0].points[Math.floor(gradientLayers[0].points.length / 2)];
assert.ok(Math.abs(gradientMidpoint[0]) < 0.001 && gradientMidpoint[1] > 0, 'gradient layers should preserve azimuth orientation');

assert.equal(JSON.stringify(context.getTiltMapColors()), JSON.stringify({
  lower: '#c7ff2f',
  main: '#ffc247',
  upper: '#35e6ff'
}));

const sector = context.buildMapCoverageSector({ lat: 0, lng: 0 }, 90, 60, 1000, 4);
assert.equal(JSON.stringify(sector[0]), JSON.stringify([0, 0]));
assert.ok(sector[1][0] > 0 && sector[1][1] > 0, 'sector should start on the clockwise-left edge of the entered azimuth');
assert.ok(Math.abs(sector[3][0]) < 0.001 && sector[3][1] > 0, 'sector midpoint should face the entered azimuth');
assert.ok(sector[5][0] < 0 && sector[5][1] > 0, 'sector should end on the clockwise-right edge of the entered azimuth');

const segments = context.buildMapBeamSegments({
  lower: { color: 'green', status: 'hit', surface: 'ground', hitPoint: { x: 100, y: 0 }, plotPoint: { x: 7, y: 9 } },
  main: { color: 'red', status: 'hit', surface: 'ground', hitPoint: { x: 240, y: 0 }, plotPoint: { x: 8, y: 9 } },
  upper: { color: 'blue', status: 'hit', surface: 'ground', hitPoint: { x: 420, y: 0 }, plotPoint: { x: 9, y: 9 } }
}, 500);

assert.equal(JSON.stringify(segments.map(({ key, startDistance, endDistance, groundDistance, hasGroundContact }) => ({
  key, startDistance, endDistance, groundDistance, hasGroundContact
}))), JSON.stringify([
  { key: 'lower', startDistance: 0, endDistance: 100, groundDistance: 100, hasGroundContact: true },
  { key: 'main', startDistance: 100, endDistance: 240, groundDistance: 240, hasGroundContact: true },
  { key: 'upper', startDistance: 240, endDistance: 420, groundDistance: 420, hasGroundContact: true }
]));

const noGround = context.buildMapBeamSegments({
  lower: { color: 'green', status: 'hit', surface: 'ground', hitPoint: { x: 80, y: 0 } },
  main: { color: 'red', status: 'no_forward_hit', surface: null, hitPoint: null, plotPoint: { x: 999, y: 999 } },
  upper: { color: 'blue', status: 'hit', surface: 'front', hitPoint: { x: 900, y: 30 } }
}, 500);

assert.equal(noGround[1].startDistance, 80);
assert.equal(noGround[1].endDistance, 500);
assert.equal(noGround[1].groundDistance, null);
assert.equal(noGround[1].hasGroundContact, false);
assert.equal(noGround[1].label, 'No ground contact');
assert.equal(noGround[2].startDistance, 500);
assert.equal(noGround[2].endDistance, 500);
assert.equal(noGround[2].groundDistance, null);
assert.equal(noGround[2].hasGroundContact, false);

console.log('PASS map preview beam segment contract');
