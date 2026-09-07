import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(root, 'radial-particle-loader.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'radial-particle-loader.css'), 'utf8');

function check(condition, message) {
  assert.ok(condition, message);
}

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }

  removeProperty(name) {
    this.values.delete(name);
  }
}

class FakeNode {
  constructor(documentRef, tagName, contextAvailable = true) {
    this.ownerDocument = documentRef;
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = new FakeStyle();
    this.dataset = {};
    this.textContent = '';
    this.hidden = false;
    this.contextAvailable = contextAvailable;
    this._rect = { width: 110, height: 110, top: 0, right: 110, bottom: 110, left: 0 };
    this.context = {
      clearCalls: 0,
      clearRectCalls: [],
      arcCalls: [],
      fillStyles: [],
      setTransformCalls: [],
      clearRect: (...args) => {
        this.context.clearCalls += 1;
        this.context.clearRectCalls.push(args);
      },
      setTransform: (...args) => { this.context.setTransformCalls.push(args); },
      beginPath() {},
      arc: (...args) => { this.context.arcCalls.push(args); },
      fill() { this.fillStyles.push(this._fillStyle); },
      set fillStyle(value) { this._fillStyle = value; },
      get fillStyle() { return this._fillStyle; }
    };
  }

  set innerHTML(value) {
    if (value === '') {
      this.children.forEach((child) => { child.parentNode = null; });
      this.children = [];
    }
  }

  get innerHTML() {
    return '';
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter((entry) => entry !== listener));
  }

  dispatchEvent(event) {
    (this.listeners.get(event.type) || []).slice().forEach((listener) => listener(event));
  }

  getContext(type) {
    return type === '2d' && this.contextAvailable ? this.context : null;
  }

  getBoundingClientRect() {
    return this._rect;
  }
}

function createFakeEnvironment({ reducedMotion = false, contextAvailable = true } = {}) {
  const rafQueue = new Map();
  const cancelledFrames = [];
  const mediaListeners = [];
  let nextFrameId = 0;
  let intersectionCallback = null;

  const windowRef = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    listeners: new Map(),
    requestAnimationFrame(callback) {
      const id = ++nextFrameId;
      rafQueue.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      cancelledFrames.push(id);
      rafQueue.delete(id);
    },
    matchMedia() {
      return {
        matches: reducedMotion,
        addEventListener(type, listener) {
          if (type === 'change') mediaListeners.push(listener);
        },
        removeEventListener(type, listener) {
          const index = mediaListeners.indexOf(listener);
          if (index >= 0) mediaListeners.splice(index, 1);
        }
      };
    },
    IntersectionObserver: class FakeIntersectionObserver {
      constructor(callback) {
        intersectionCallback = callback;
        this.disconnected = false;
        this.observed = null;
      }

      observe(node) {
        this.observed = node;
      }

      disconnect() {
        this.disconnected = true;
      }
    }
  };

  const documentRef = {
    hidden: false,
    defaultView: windowRef,
    listeners: new Map(),
    createElement(tagName) {
      return new FakeNode(documentRef, tagName, contextAvailable);
    }
  };
  documentRef.body = new FakeNode(documentRef, 'body');

  windowRef.document = documentRef;
  const host = new FakeNode(documentRef, 'div', contextAvailable);

  function runNextFrame(timestamp) {
    const entry = rafQueue.entries().next().value;
    if (!entry) return false;
    rafQueue.delete(entry[0]);
    entry[1](timestamp);
    return true;
  }

  function dispatchDocument(type) {
    (documentRef.listeners.get(type) || []).slice().forEach((listener) => listener({ type }));
  }

  documentRef.addEventListener = function addEventListener(type, listener) {
    const list = documentRef.listeners.get(type) || [];
    list.push(listener);
    documentRef.listeners.set(type, list);
  };
  documentRef.removeEventListener = function removeEventListener(type, listener) {
    const list = documentRef.listeners.get(type) || [];
    documentRef.listeners.set(type, list.filter((entry) => entry !== listener));
  };

  return {
    documentRef,
    host,
    windowRef,
    rafQueue,
    cancelledFrames,
    mediaListeners,
    runNextFrame,
    dispatchDocument,
    setIntersection(isIntersecting) {
      if (intersectionCallback) intersectionCallback([{ isIntersecting }]);
    }
  };
}

function loadApi(environment) {
  const sandbox = {
    console,
    document: environment.documentRef,
    window: environment.windowRef,
    performance: { now: () => 0 }
  };
  environment.windowRef.window = environment.windowRef;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'radial-particle-loader.js' });
  return sandbox.window.ConyRadialParticleLoader;
}

assert.match(source, /ConyRadialParticleLoader/);
assert.match(source, /DEFAULT_PARTICLE_COUNT\s*=\s*220/);
assert.match(source, /DEFAULT_SPEED\s*=\s*1\.5/);
assert.match(source, /effectiveMorphCycle[\s\S]*morphCycle\s*\/\s*speed/);
assert.match(source, /var motionTime = time\s*\*\s*speed/);
assert.match(source, /getMorphProgress\(time, morphCycle\)/);
assert.doesNotMatch(source, /getElementById|id\s*=\s*['"]particles/);
assert.doesNotMatch(`${source}\n${css}`, /react|vite|npm|cdn/i);
assert.match(css, /\.cony-radial-particle-loader\s*\{/);
assert.match(css, /width:\s*110px/);
assert.match(css, /height:\s*110px/);

{
  const environment = createFakeEnvironment();
  const api = loadApi(environment);
  assert.equal(typeof api.create, 'function');
  assert.equal(api.create(null), null);
  assert.equal(api.create({}), null);
  assert.equal(api.testing.particleCount, 220);
  assert.equal(api.testing.speed, 1.5);
  assert.equal(api.testing.motionMultiplier, 1.5);
  assert.equal(api.testing.morphCycle, 7000);
  assert.equal(api.testing.morphCycleMs, 7000 / 1.5);
  assert.equal(JSON.stringify(api.testing.normalizeOptions({})), JSON.stringify({
    particleCount: 220,
    size: 110,
    speed: 1.5,
    morphCycle: 7000,
    effectiveMorphCycle: 7000 / 1.5,
    palette: api.testing.defaultPalette
  }));
  const malformed = api.testing.normalizeOptions({
    particleCount: 0,
    size: -10,
    speed: 'fast',
    morphCycle: null,
    palette: 'not-a-palette'
  });
  assert.equal(malformed.particleCount, 220);
  assert.equal(malformed.size, 110);
  assert.equal(malformed.speed, 1.5);
  assert.equal(malformed.morphCycle, 7000);
  assert.equal(JSON.stringify(malformed.palette), JSON.stringify(api.testing.defaultPalette));
  const configured = api.testing.normalizeOptions({
    particleCount: 3,
    size: 160,
    speed: 2,
    morphCycle: 8000,
    colors: [[9, 8, 7]]
  });
  assert.equal(configured.particleCount, 3);
  assert.equal(configured.size, 160);
  assert.equal(configured.speed, 2);
  assert.equal(configured.morphCycle, 8000);
  assert.equal(configured.effectiveMorphCycle, 4000);
  assert.equal(JSON.stringify(configured.palette), JSON.stringify([[9, 8, 7]]));
  const partiallyValidPalette = api.testing.normalizeOptions({
    palette: [[9, 8, 7], [300, 8, 7], [1, '2', 3]]
  });
  assert.equal(JSON.stringify(partiallyValidPalette.palette), JSON.stringify([[9, 8, 7]]));
}

{
  const environment = createFakeEnvironment();
  environment.host.setAttribute('aria-label', 'Saving changes');
  const api = loadApi(environment);
  const handle = api.create(environment.host);
  const rootNode = environment.host.children[0];
  const canvas = rootNode.children[0];
  const label = rootNode.children[1];
  assert.equal(typeof handle.pause, 'function');
  assert.equal(typeof handle.resume, 'function');
  assert.equal(typeof handle.destroy, 'function');
  assert.equal(typeof handle.isRunning, 'function');
  assert.equal(rootNode.className, 'cony-radial-particle-loader');
  assert.equal(canvas.getAttribute('role'), 'img');
  assert.equal(canvas.getAttribute('aria-label'), 'Saving changes');
  assert.equal(label.textContent, 'Saving changes...');
  assert.equal(canvas.width, 110);
  assert.equal(canvas.height, 110);
  assert.ok(canvas.context.arcCalls.length > 0, 'create renders the first frame');
  assert.equal(handle.isRunning(), true);
  assert.equal(environment.rafQueue.size, 1);

  handle.pause();
  assert.equal(handle.isRunning(), false);
  assert.equal(environment.rafQueue.size, 0);
  assert.ok(environment.cancelledFrames.length > 0);
  handle.resume();
  assert.equal(handle.isRunning(), true);
  assert.equal(environment.rafQueue.size, 1);

  environment.documentRef.hidden = true;
  environment.dispatchDocument('visibilitychange');
  assert.equal(handle.isRunning(), false);
  environment.documentRef.hidden = false;
  environment.dispatchDocument('visibilitychange');
  assert.equal(handle.isRunning(), true);
  environment.setIntersection(false);
  assert.equal(handle.isRunning(), false);
  environment.setIntersection(true);
  assert.equal(handle.isRunning(), true);

  const frameCountBefore = canvas.context.clearCalls;
  check(environment.runNextFrame(100), 'a scheduled frame should run');
  check(canvas.context.clearCalls > frameCountBefore, 'running loader should render frames');

  handle.destroy();
  assert.equal(environment.host.children.length, 0);
  assert.equal(environment.rafQueue.size, 0);
  assert.equal(environment.documentRef.listeners.get('visibilitychange')?.length || 0, 0);
  assert.equal(environment.mediaListeners.length, 0);
}

{
  const environment = createFakeEnvironment();
  const api = loadApi(environment);
  const handle = api.create(environment.host, {
    particleCount: 3,
    size: 160,
    speed: 2,
    morphCycle: 8000,
    palette: [[1, 2, 3]]
  });
  const canvas = environment.host.children[0].children[0];
  assert.equal(canvas.width, 160);
  assert.equal(canvas.height, 160);
  assert.equal(JSON.stringify(canvas.context.clearRectCalls[0]), JSON.stringify([0, 0, 160, 160]));
  assert.equal(canvas.context.arcCalls.length, 3);
  assert.ok(canvas.context.fillStyles.every((value) => value.startsWith('rgba(1, 2, 3, ')));
  assert.equal(api.testing.normalizeOptions({ speed: 2, morphCycle: 8000 }).effectiveMorphCycle, 4000);
  handle.destroy();
}

{
  const environment = createFakeEnvironment({ reducedMotion: true });
  const api = loadApi(environment);
  const handle = api.create(environment.host, { ariaLabel: 'Saving changes now', label: 'Working...' });
  const canvas = environment.host.children[0].children[0];
  assert.equal(handle.isRunning(), false);
  assert.equal(environment.rafQueue.size, 0);
  assert.equal(canvas.getAttribute('aria-label'), 'Saving changes now');
  assert.equal(environment.host.children[0].children[1].textContent, 'Working...');
  handle.resume();
  assert.equal(environment.rafQueue.size, 0);
  handle.destroy();
}

{
  const environment = createFakeEnvironment({ contextAvailable: false });
  const api = loadApi(environment);
  const handle = api.create(environment.host);
  assert.ok(handle, 'missing 2D context should return a safe handle');
  assert.equal(handle.isRunning(), false);
  assert.equal(environment.rafQueue.size, 0);
  handle.destroy();
  assert.equal(environment.host.children.length, 0);
}

console.log('radial-particle-loader.test: passed');
