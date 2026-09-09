const assert = require('assert/strict');
const fs = require('fs');
const vm = require('vm');

const htmlPath = __dirname + '/cell_coverage_calculator.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((script) => script.includes('function calculate()'));

const base = {
  ha: '33',
  mtilt: '2',
  etilt: '3',
  vbw: '6.5',
  hbw: '66',
  bdistance: '',
  bheight: '50',
  bdepth: '30'
};

function makeCanvas() {
  const calls = [];
  const context = {
    calls,
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    setLineDash(...args) { calls.push(['setLineDash', ...args]); },
    beginPath(...args) { calls.push(['beginPath', ...args]); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    stroke(...args) { calls.push(['stroke', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    strokeRect(...args) { calls.push(['strokeRect', ...args]); },
    arc(...args) { calls.push(['arc', ...args]); },
    fill(...args) { calls.push(['fill', ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); },
    createLinearGradient(...args) {
      calls.push(['createLinearGradient', ...args]);
      return { addColorStop(...stopArgs) { calls.push(['addColorStop', ...stopArgs]); } };
    }
  };
  return { width: 800, height: 500, getContext: () => context, context };
}

function run(overrides = {}, prior = '', siteType = 'Macro') {
  const values = { ...base, ...overrides };
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value: String(value) }]));
  fields.results = { innerHTML: prior };
  fields.plot = makeCanvas();
  const alerts = [];
  const document = {
    getElementById(id) { return fields[id]; },
    querySelector() { return { value: siteType }; },
    querySelectorAll() { return []; }
  };
  const context = { document, alert: (message) => alerts.push(message), console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: htmlPath });
  const actualDraw = context.draw;
  let drawArgs = null;
  context.draw = (...args) => {
    drawArgs = args;
    return actualDraw(...args);
  };
  context.calculate();
  return { values, fields, alerts, drawArgs, canvas: fields.plot, context };
}

function textOf(result) {
  return result.fields.results.innerHTML
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function beam(result, name) {
  assert.ok(result.drawArgs, `expected a draw for ${name}`);
  return result.drawArgs[1][name];
}

function assertFiniteCanvas(result, label) {
  for (const [name, call] of result.canvas.context.calls.entries()) {
    for (const value of call.slice(1)) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${label}: canvas call ${name} has ${value}`);
    }
  }
}

function assertNear(actual, expected, epsilon, label) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} ≠ ${expected}`);
}

function testBaselineAndFrontControls() {
  const baseline = run();
  assert.equal(baseline.alerts.length, 0);
  assertNear(beam(baseline, 'upper').hitPoint.x, 1080.0987026, 1e-6, 'baseline upper');
  assertNear(beam(baseline, 'main').hitPoint.x, 377.19172599, 1e-6, 'baseline main');
  assertNear(beam(baseline, 'lower').hitPoint.x, 227.603, 0.01, 'baseline lower');

  const front = run({ bdistance: '100' });
  assertNear(beam(front, 'upper').hitPoint.y, 29.9447, 1e-4, 'front upper');
  assertNear(beam(front, 'main').hitPoint.y, 24.2511, 1e-4, 'front main');
  assertNear(beam(front, 'lower').hitPoint.y, 18.5007, 1e-4, 'front lower');
  assert.match(textOf(front), /Projected face width/);
}

function testRoofAndDepth() {
  const roof = run({ ha: 30, mtilt: 30, etilt: 0, vbw: 10, hbw: 60, bdistance: 10, bheight: 20, bdepth: 20 });
  assert.equal(beam(roof, 'upper').surface, 'roof');
  assert.equal(beam(roof, 'main').surface, 'roof');
  assert.equal(beam(roof, 'lower').surface, 'roof');
  assertNear(beam(roof, 'upper').hitPoint.x, 21.4451, 1e-4, 'roof upper');
  assertNear(beam(roof, 'main').hitPoint.x, 17.3205, 1e-4, 'roof main');
  assertNear(beam(roof, 'lower').hitPoint.x, 14.2815, 1e-4, 'roof lower');

  const shallow = run({ ha: 30, mtilt: 30, etilt: 0, vbw: 10, hbw: 60, bdistance: 10, bheight: 20, bdepth: 5 });
  assert.equal(beam(shallow, 'upper').surface, 'ground');
  assert.equal(beam(shallow, 'main').surface, 'ground');
  assert.equal(beam(shallow, 'lower').surface, 'roof');
}

function testFrontHeightAndCorners() {
  const short = run({ ha: 30, mtilt: 0, etilt: 0, vbw: 30, hbw: 30, bdistance: 100, bheight: 10, bdepth: 30 });
  assert.equal(beam(short, 'upper').status, 'no_forward_hit');
  assert.equal(beam(short, 'main').status, 'no_forward_hit');
  assert.equal(beam(short, 'lower').surface, 'front');
  assertNear(beam(short, 'lower').hitPoint.y, 3.2051, 1e-4, 'short lower front');
  assert.match(textOf(short), /Projected face width at main-beam height: unavailable/);

  const tall = run({ ha: 30, mtilt: 0, etilt: 0, vbw: 30, hbw: 30, bdistance: 100, bheight: 50, bdepth: 30 });
  assert.equal(beam(tall, 'main').surface, 'front');
  assertNear(beam(tall, 'main').hitPoint.y, 30, 1e-8, 'tall horizontal front');

  const roofCorner = run({ ha: 30, mtilt: 45, etilt: 0, vbw: 1, hbw: 30, bdistance: 10, bheight: 20, bdepth: 20 });
  assert.equal(beam(roofCorner, 'main').surface, 'front');
  assertNear(beam(roofCorner, 'main').hitPoint.x, 10, 1e-8, 'front-roof corner x');
  assertNear(beam(roofCorner, 'main').hitPoint.y, 20, 1e-8, 'front-roof corner y');

  const groundCorner = run({ ha: 30, mtilt: 45, etilt: 0, vbw: 1, hbw: 30, bdistance: 30, bheight: 20, bdepth: 20 });
  assert.equal(beam(groundCorner, 'main').surface, 'front');
  assertNear(beam(groundCorner, 'main').hitPoint.y, 0, 1e-8, 'front-ground corner y');
  const before = run({ ha: 30, mtilt: 45, etilt: 0, vbw: 1, hbw: 30, bdistance: 30 - 1e-6, bheight: 20, bdepth: 20 });
  const after = run({ ha: 30, mtilt: 45, etilt: 0, vbw: 1, hbw: 30, bdistance: 30 + 1e-6, bheight: 20, bdepth: 20 });
  assert.equal(beam(before, 'main').surface, 'front');
  assert.equal(beam(after, 'main').surface, 'ground');
}

function testValidationAndClearing() {
  const invalidCases = [
    { mtilt: '', bdistance: '100' }, { vbw: '', bdistance: '100' }, { hbw: '', bdistance: '100' },
    { bheight: '', bdistance: '100' }, { bdepth: '', bdistance: '100' }, { bdistance: '-10' },
    { bdistance: '0' }, { bdistance: '100', bdepth: '-30' }, { vbw: '-6.5' },
    { bdistance: '100', hbw: '-60' }, { bdistance: '100', hbw: '180' },
    { mtilt: '100', etilt: '0', vbw: '10' }, { mtilt: '90', etilt: '0', vbw: '6' },
    { ha: '-1' }
  ];
  for (const overrides of invalidCases) {
    const result = run(overrides);
    assert.equal(result.drawArgs, null, `invalid input drew: ${JSON.stringify(overrides)}`);
    assert.ok(result.alerts.length > 0, `invalid input was not rejected: ${JSON.stringify(overrides)}`);
    assert.equal(result.fields.results.innerHTML, '', `invalid input retained results: ${JSON.stringify(overrides)}`);
    assert.ok(result.canvas.context.calls.some((call) => call[0] === 'clearRect'), 'invalid input did not clear canvas');
  }

  const valid = run();
  const invalid = run({ ha: '-1' }, valid.fields.results.innerHTML);
  assert.equal(invalid.fields.results.innerHTML, '');
  assert.equal(invalid.drawArgs, null);
}

function testBlankBuildingIsolation() {
  const baseline = run();
  const weirdIgnored = run({ bheight: '-100000000000000000000000000000000000000', bdepth: '1e309' });
  assert.equal(weirdIgnored.alerts.length, 0);
  for (const name of ['upper', 'main', 'lower']) {
    assert.equal(beam(weirdIgnored, name).surface, beam(baseline, name).surface);
    assertNear(beam(weirdIgnored, name).hitPoint.x, beam(baseline, name).hitPoint.x, 1e-8, `blank building ${name}`);
  }
}

function testWidthAvailability() {
  const groundFirst = run({ ha: 30, mtilt: 30, etilt: 0, vbw: 10, hbw: 60, bdistance: 100, bheight: 20, bdepth: 30 });
  assert.equal(groundFirst.drawArgs[1].main.surface, 'ground');
  assert.match(textOf(groundFirst), /Projected face width at main-beam height: unavailable/);
  assert.doesNotMatch(textOf(groundFirst), /Projected face width at main-beam height: [0-9]/);

  const validFace = run({ ha: 100, mtilt: 30, etilt: 0, vbw: 10, hbw: 60, bdistance: 100, bheight: 80, bdepth: 30 });
  assert.equal(beam(validFace, 'main').surface, 'front');
  assert.match(textOf(validFace), /Projected face width at main-beam height: /);
}

function testNoHitPlotAndDrawAdapter() {
  const upward = run({ mtilt: -10, etilt: 0, vbw: 6, bdistance: '' });
  for (const name of ['upper', 'main', 'lower']) {
    const ray = beam(upward, name);
    assert.equal(ray.hitPoint, null);
    assert.ok(ray.plotPoint && Number.isFinite(ray.plotPoint.x) && Number.isFinite(ray.plotPoint.y));
  }
  assertFiniteCanvas(upward, 'all-upward');
  const lines = upward.canvas.context.calls.filter((call) => call[0] === 'lineTo');
  assert.ok(lines.length >= 4, 'draw adapter did not draw finite clipped rays');
}

function testSiteTypeScalingAdapters() {
  const macro = run({}, '', 'Macro');
  const small = run({}, '', 'Small');
  assert.equal(macro.alerts.length, 0);
  assert.equal(small.alerts.length, 0);
  assertFiniteCanvas(macro, 'macro site');
  assertFiniteCanvas(small, 'small site');
  assert.equal(beam(macro, 'main').surface, beam(small, 'main').surface);
  assertNear(beam(macro, 'main').hitPoint.x, beam(small, 'main').hitPoint.x, 1e-8, 'site switch calculation');
}

function testOverflowIsInvalid() {
  const derivedAngleOverflow = run({ ha: '1e308', mtilt: '89.99999999999999', etilt: '0', vbw: '0.0000000000001', hbw: '60' });
  assert.equal(derivedAngleOverflow.drawArgs, null);
  assert.ok(derivedAngleOverflow.alerts.length > 0);

  const plotOverflow = run({ ha: '1e308', mtilt: '60', etilt: '0', vbw: '1', hbw: '60', bdistance: '100', bheight: '1.7e308', bdepth: '30' }, '', 'Small');
  assert.equal(plotOverflow.drawArgs, null);
  assert.ok(plotOverflow.alerts.length > 0);
  assert.equal(plotOverflow.fields.results.innerHTML, '');

  const groundOverflow = run({ ha: '1e308', mtilt: '1', etilt: '0', vbw: '0.1', hbw: '60' });
  assert.equal(groundOverflow.drawArgs, null);
  assert.ok(groundOverflow.alerts.length > 0);
}

function testDistantFrontTolerance() {
  const result = run({ ha: 30, mtilt: 0, etilt: 0, vbw: 6, hbw: 60, bdistance: 1000000, bheight: 29.9995, bdepth: 30 });
  assert.equal(result.alerts.length, 0);
  assert.equal(beam(result, 'main').status, 'no_forward_hit');
  assert.equal(beam(result, 'main').surface, null);
}

function testTinyHeightVerticalClip() {
  for (const siteType of ['Macro', 'Small']) {
    const result = run({ ha: '3e-306', mtilt: '-88', etilt: '0', vbw: '1', hbw: '60', bdistance: '' }, '', siteType);
    assert.equal(result.alerts.length, 0);
    assertFiniteCanvas(result, `${siteType} tiny-height clip`);
    for (const name of ['upper', 'main', 'lower']) {
      assert.equal(beam(result, name).hitPoint, null);
      assert.ok(Number.isFinite(beam(result, name).plotPoint.x));
      assert.ok(Number.isFinite(beam(result, name).plotPoint.y));
    }
  }
}

function testMatrixAndScaleInvariant() {
  let checked = 0;
  for (const ha of [10, 30, 50]) {
    for (const tilt of [-30, 0, 5, 30, 60]) {
      for (const distance of [5, 20, 100]) {
        for (const height of [5, 20, 40]) {
          for (const depth of [5, 30]) {
            const result = run({ ha, mtilt: tilt, etilt: 0, vbw: 10, hbw: 30, bdistance: distance, bheight: height, bdepth: depth });
            assert.equal(result.alerts.length, 0);
            for (const name of ['upper', 'main', 'lower']) {
              const ray = beam(result, name);
              assert.ok(['ground', 'front', 'roof'].includes(ray.surface) || ray.status === 'no_forward_hit');
              if (ray.hitPoint) assert.ok(Number.isFinite(ray.hitPoint.x) && Number.isFinite(ray.hitPoint.y));
            }
            assertFiniteCanvas(result, 'matrix');
            checked += 1;
          }
        }
      }
    }
  }
  assert.equal(checked, 270);

  const scaled = run({ ha: 60, mtilt: 30, etilt: 0, vbw: 10, hbw: 30, bdistance: 20, bheight: 40, bdepth: 30 });
  const original = run({ ha: 30, mtilt: 30, etilt: 0, vbw: 10, hbw: 30, bdistance: 10, bheight: 20, bdepth: 15 });
  for (const name of ['upper', 'main', 'lower']) {
    assert.equal(beam(scaled, name).surface, beam(original, name).surface);
    if (beam(original, name).hitPoint) {
      assertNear(beam(scaled, name).hitPoint.x / beam(original, name).hitPoint.x, 2, 1e-8, `${name} scale x`);
      assertNear(beam(scaled, name).hitPoint.y / beam(original, name).hitPoint.y, 2, 1e-8, `${name} scale y`);
    }
  }
}

const tests = [
  testBaselineAndFrontControls,
  testRoofAndDepth,
  testFrontHeightAndCorners,
  testValidationAndClearing,
  testBlankBuildingIsolation,
  testWidthAvailability,
  testNoHitPlotAndDrawAdapter,
  testSiteTypeScalingAdapters,
  testOverflowIsInvalid,
  testDistantFrontTolerance,
  testTinyHeightVerticalClip,
  testMatrixAndScaleInvariant
];

for (const test of tests) {
  test();
  console.log(`PASS ${test.name}`);
}
console.log(`PASS ${tests.length} calculation logic suites`);
