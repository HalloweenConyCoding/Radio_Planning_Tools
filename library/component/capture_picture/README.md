# Cony Capture

Reusable vanilla PNG capture helper for local `file:///` pages.

## Files

- `capture-picture.js` - global `window.ConyCapture` API
- `capture-picture.test.mjs` - Node contract test

## API

```js
const pngBlob = await window.ConyCapture.svgStringToPngBlob(svgMarkup, {
  width: 1600,
  height: 2200,
  scale: 2,
  background: '#050812'
});

const renderedPng = await window.ConyCapture.domElementToPngBlob(document.querySelector('#investment-port-root'), {
  width: 1600,
  height: 2200,
  scale: 1,
  background: '#050812'
});

await window.ConyCapture.writePngToClipboard(pngBlob, { timeoutMs: 5000 });
window.ConyCapture.downloadPngBlob(pngBlob, { filename: 'investment-port.png' });
const result = await window.ConyCapture.copyOrDownloadPng(pngBlob, { filename: 'investment-port.png' });
```

`copyOrDownloadPng()` returns `{ method, status }` and falls back to download when PNG clipboard write is unavailable, rejected, or timed out.

`domElementToPngBlob()` is an optional best-effort rendered-UI path. It can reject under browser security or rendering limitations; page code should keep a deterministic SVG export fallback.

## Constraints

- Framework-free browser global
- Compatible with local `file:///` pages
- SVG-string raster path plus optional DOM/`foreignObject` best-effort capture; no `html2canvas`, CDN, or npm dependency
- Keep page-specific export rendering in the owning page script
