import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(root, 'capture-picture.js');
const readmePath = path.join(root, 'README.md');
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';
const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';

assert.ok(readme, 'capture-picture README is missing');
assert.match(readme, /Cony Capture/i);
assert.match(readme, /window\.ConyCapture/);
assert.match(readme, /file:\/\/\//i);

assert.ok(source, 'capture-picture.js is missing');
assert.match(source, /ConyCapture/);
assert.doesNotMatch(source, /html2canvas|cdn|npm|getDisplayMedia/i);

let objectUrlCounter = 0;
let pendingClipboardWrite = null;
const createdUrls = [];
const revokedUrls = [];
const clickedDownloads = [];
const timeouts = [];
const clearedTimeouts = [];

class FakeBlob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
}

class FakeClipboardItem {
  constructor(items) {
    this.items = items;
  }
}

class FakeImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this._src = '';
  }

  set src(value) {
    this._src = value;
    queueMicrotask(() => {
      if (String(value).includes('fail-image')) {
        if (typeof this.onerror === 'function') this.onerror(new Error('image failed'));
        return;
      }
      if (typeof this.onload === 'function') this.onload();
    });
  }

  get src() {
    return this._src;
  }
}

function createCanvas() {
  return {
    width: 0,
    height: 0,
    drawCalls: [],
    getContext(type) {
      if (type !== '2d') return null;
      return {
        scale: (x, y) => this.drawCalls.push(['scale', x, y]),
        fillRect: (x, y, w, h) => this.drawCalls.push(['fillRect', x, y, w, h]),
        drawImage: (...args) => this.drawCalls.push(['drawImage', ...args]),
        set fillStyle(value) {
          this._fillStyle = value;
        },
        get fillStyle() {
          return this._fillStyle;
        }
      };
    },
    toBlob(callback, type) {
      callback(new FakeBlob(['png'], { type: type || 'image/png' }));
    }
  };
}

const document = {
  body: {
    appendChild(node) {
      node.parentNode = this;
      return node;
    },
    removeChild(node) {
      node.parentNode = null;
      return node;
    }
  },
  createElement(tagName) {
    if (tagName === 'canvas') {
      return createCanvas();
    }
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click() {
          clickedDownloads.push({ href: this.href, download: this.download });
        }
      };
    }
    return { tagName: String(tagName).toUpperCase() };
  }
};

const sandbox = {
  console,
  Blob: FakeBlob,
  ClipboardItem: FakeClipboardItem,
  Image: FakeImage,
  URL: {
    createObjectURL(blob) {
      const url = `blob:cony-capture-${++objectUrlCounter}`;
      createdUrls.push({ url, blob });
      return url;
    },
    revokeObjectURL(url) {
      revokedUrls.push(url);
    }
  },
  navigator: {
    clipboard: {
      write(items) {
        return new Promise((resolve, reject) => {
          pendingClipboardWrite = { items, resolve, reject };
        });
      }
    }
  },
  document,
  setTimeout(callback, delay) {
    const id = timeouts.length + 1;
    timeouts.push({ id, callback, delay });
    return id;
  },
  clearTimeout(id) {
    clearedTimeouts.push(id);
  },
  queueMicrotask,
  window: {}
};

sandbox.window.window = sandbox.window;
sandbox.window.document = document;
sandbox.window.navigator = sandbox.navigator;
sandbox.window.URL = sandbox.URL;
sandbox.window.Blob = FakeBlob;
sandbox.window.ClipboardItem = FakeClipboardItem;
sandbox.window.Image = FakeImage;
sandbox.window.setTimeout = sandbox.setTimeout;
sandbox.window.clearTimeout = sandbox.clearTimeout;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'capture-picture.js' });

const api = sandbox.window.ConyCapture;
assert.equal(typeof api, 'object');
assert.equal(typeof api.svgStringToPngBlob, 'function');
assert.equal(typeof api.writePngToClipboard, 'function');
assert.equal(typeof api.downloadPngBlob, 'function');
assert.equal(typeof api.copyOrDownloadPng, 'function');

const blob = await api.svgStringToPngBlob('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"></svg>', {
  width: 10,
  height: 20,
  scale: 3,
  background: '#050812'
});
assert.equal(blob.type, 'image/png');
assert.ok(createdUrls.some((entry) => entry.blob.type === 'image/svg+xml;charset=utf-8'));
assert.ok(revokedUrls.includes('blob:cony-capture-1'));

const clipboardPromise = api.writePngToClipboard(blob, { timeoutMs: 5000 });
assert.equal(timeouts.at(-1)?.delay, 5000);
pendingClipboardWrite.resolve();
await clipboardPromise;
assert.ok(clearedTimeouts.length > 0);
assert.equal(pendingClipboardWrite.items[0] instanceof FakeClipboardItem, true);

const timedOutPromise = api.writePngToClipboard(blob, { timeoutMs: 5000 });
const timeoutEntry = timeouts.at(-1);
timeoutEntry.callback();
await assert.rejects(timedOutPromise, /timed out/i);
pendingClipboardWrite = null;

api.downloadPngBlob(blob, { filename: 'investment-port.png' });
assert.deepEqual(clickedDownloads.at(-1), {
  href: 'blob:cony-capture-2',
  download: 'investment-port.png'
});

pendingClipboardWrite = null;
const fallbackPromise = api.copyOrDownloadPng(blob, {
  filename: 'fallback.png',
  timeoutMs: 5000
});
const fallbackTimeout = timeouts.at(-1);
fallbackTimeout.callback();
const fallbackResult = await fallbackPromise;
assert.equal(fallbackResult.method, 'download');
assert.equal(fallbackResult.status, 'downloaded');
assert.deepEqual(clickedDownloads.at(-1), {
  href: 'blob:cony-capture-3',
  download: 'fallback.png'
});

console.log('capture-picture.test: passed');
