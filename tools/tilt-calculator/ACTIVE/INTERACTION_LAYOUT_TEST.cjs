const assert = require('assert/strict');
const fs = require('fs');
const vm = require('vm');

const dir = __dirname;
const html = fs.readFileSync(`${dir}/cell_coverage_calculator.html`, 'utf8');
const style = fs.readFileSync(`${dir}/cell_coverage_calculator_style.css`, 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .find((script) => script.includes('function calculate()'));

assert.doesNotMatch(html, /class="calc-wrapper"/, 'manual calculator button should be removed');
assert.doesNotMatch(html, /id="plot-beam"/, 'manual map button should be removed');
assert.match(html, /class="dashboard-grid workspace-shell"/, 'dashboard should become the scroll shell');
assert.match(html, /class="workspace-column visual-column"/, 'visuals should have their own scroll column');
assert.match(html, /id="readme" class="panel info-panel reveal-section"/, 'documentation should remain in the visual column');
assert.match(html, /id="plot-transition"/, 'profile drawing should have a transition surface');
assert.match(style, /\.app-header\s*\{[\s\S]*position:\s*sticky;/, 'page header should remain pinned');
assert.match(style, /\.control-panel\s*\{[\s\S]*overflow-y:\s*auto;/, 'parameter column should scroll independently');
assert.match(style, /\.workspace-column\s*\{[\s\S]*overflow-y:\s*auto;/, 'visual column should scroll independently');
assert.match(source, /function scheduleCalculation\(\)/, 'calculator input should schedule recalculation');
assert.match(source, /function transitionMapOverlays\(/, 'map overlays should have a transition path');

class Element {
  constructor(value = '') {
    this.value = value;
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.listeners = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
  }

  addEventListener(type, callback) {
    (this.listeners[type] ||= []).push(callback);
  }

  dispatch(type) {
    for (const callback of this.listeners[type] || []) callback({ target: this });
  }
}

function canvasElement() {
  const element = new Element();
  const context = {
    clearRect() {},
    setLineDash() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    arc() {},
    fill() {},
    fillText() {},
    drawImage() {},
    createLinearGradient() { return { addColorStop() {} }; }
  };
  element.width = 800;
  element.height = 500;
  element.getContext = () => context;
  return element;
}

const defaults = {
  ha: '33', mtilt: '2', etilt: '3', vbw: '6.5', hbw: '66',
  bdistance: '', bheight: '50', bdepth: '30'
};
const fields = Object.fromEntries(Object.entries(defaults).map(([id, value]) => [id, new Element(value)]));
fields.results = new Element();
fields['calculation-status'] = new Element();
fields['map-status'] = new Element();
fields.plot = canvasElement();
fields['plot-transition'] = canvasElement();
fields['map-coordinates'] = new Element('13.98937472, 100.61781242');
fields['map-azimuth'] = new Element('0');
fields['beam-map'] = new Element();

const document = {
  getElementById(id) { return fields[id]; },
  querySelector(selector) {
    if (selector === 'input[name="siteType"]:checked') return { value: 'Macro' };
    return new Element();
  },
  querySelectorAll() { return []; }
};
const alerts = [];
const context = {
  document,
  alert(message) { alerts.push(message); },
  requestAnimationFrame(callback) { callback(); return 0; },
  cancelAnimationFrame() {},
  console
};
vm.createContext(context);
vm.runInContext(source, context, { filename: `${dir}/cell_coverage_calculator.html` });

for (const id of Object.keys(defaults)) {
  assert.ok(fields[id].listeners.input?.length, `${id} should recalculate on input`);
}
assert.ok(fields['map-coordinates'].listeners.input?.length, 'map coordinates should redraw on input');

fields.mtilt.value = '3';
fields.mtilt.dispatch('input');
assert.notEqual(fields.results.innerHTML, '', 'valid calculator input should publish results immediately');
assert.equal(alerts.length, 0, 'valid calculator input should not alert');

fields.ha.value = '';
fields.ha.dispatch('input');
assert.equal(fields.results.innerHTML, '', 'invalid input should clear old results');
assert.notEqual(fields['calculation-status'].textContent, '', 'invalid input should show inline validation');
assert.equal(alerts.length, 0, 'typing an invalid intermediate value should not alert');

fields.ha.value = '33';
fields.ha.dispatch('input');
assert.notEqual(fields.results.innerHTML, '', 'valid input should recover without a button');
assert.equal(fields['calculation-status'].textContent, '', 'successful recovery should clear validation');

console.log('PASS interaction and layout contract');
