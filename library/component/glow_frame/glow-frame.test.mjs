import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(root, 'glow-frame.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'glow-frame.js'), 'utf8');
assert.match(css, /@property --cony-glow-frame-angle/);
assert.match(css, /@keyframes cony-glow-frame-sweep/);
assert.match(css, /--cony-glow-frame-angle:\s*360deg/);
assert.doesNotMatch(css, /transform\s*:\s*rotate/);
assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none/);
assert.match(css, /data-glow-mode="cursor"[\s\S]*?opacity:\s*var\(--cony-glow-frame-opacity,\s*0\)/);
assert.doesNotMatch(`${css}\n${js}`, /react|npm|cdn/i);

const listeners = new Map();
const styleValues = new Map();
const rootNode = {
  dataset: { glowMode: 'cursor' },
  style: { setProperty(name, value) { styleValues.set(name, value); }, removeProperty(name) { styleValues.delete(name); } },
  addEventListener(type, handler) { listeners.set(type, handler); },
  removeEventListener(type, handler) { assert.equal(listeners.get(type), handler); listeners.delete(type); },
  getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }; }
};
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const glowFrame = sandbox.window.ConyGlowFrame;
assert.equal(typeof glowFrame, 'object');
assert.equal(typeof glowFrame.mount, 'function');
const handle = glowFrame.mount(rootNode, { mode: 'cursor' });
assert.equal(typeof handle.destroy, 'function');
assert.ok(listeners.has('pointermove'));
listeners.get('pointermove')({ clientX: 2, clientY: 50 });
assert.ok(styleValues.has('--cony-glow-frame-angle'));
assert.ok(styleValues.has('--cony-glow-frame-opacity'));
listeners.get('pointerleave')();
assert.equal(styleValues.size, 0);
handle.destroy();
assert.equal(listeners.size, 0);
console.log('glow-frame.test: passed');
