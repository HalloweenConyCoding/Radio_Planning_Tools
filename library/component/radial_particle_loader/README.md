# Cony Radial Particle Loader

Reusable, no-build vanilla canvas loader based on the radial sphere-to-cube particle prototype. It has no React, npm, CDN, server, or external dependency requirement.

## Copy and use

Load the local stylesheet and script, provide an element target, and create one loader instance:

```html
<link rel="stylesheet" href="radial-particle-loader.css">
<div id="save-loader" aria-label="Saving changes"></div>
<script src="radial-particle-loader.js"></script>
<script>
  const loader = window.ConyRadialParticleLoader.create(
    document.getElementById('save-loader'),
    {
      label: 'Saving changes...',
      ariaLabel: 'Saving changes',
      particleCount: 220,
      size: 110,
      palette: [
        [50, 220, 255],
        [255, 90, 190]
      ],
      morphCycle: 7000,
      speed: 1.5
    }
  );
</script>
```

`create(target, options)` returns `null` for an invalid target, or a handle with `pause()`, `resume()`, `destroy()`, and `isRunning()`.

Options:

- `label`: visible text. Defaults to `Saving changes...`; set `false` to hide it.
- `ariaLabel`: accessible canvas label. If omitted, an existing target `aria-label` is used before the visible label fallback.
- `particleCount`: particle count. Defaults to `220`.
- `size`: canvas surface size in CSS pixels. Defaults to `110`; non-positive, empty, null, boolean, or non-finite values use the default.
- `palette` or `colors`: RGB arrays such as `[[50, 220, 255], [255, 90, 190]]`. Values outside the RGB byte range or non-numeric entries are discarded; an empty or malformed palette uses the prototype palette.
- `morphCycle`: base/source sphere-to-cube cycle in milliseconds. Defaults to `7000`; the effective cycle is `morphCycle / speed`.
- `speed`: positive animation multiplier. Defaults to `1.5`; it scales rotation and morph motion together. Invalid values use `1.5`.

## Performance behavior

The renderer keeps one RAF loop per instance and stops scheduling frames while paused, while the document is hidden, or while the target is outside the viewport when `IntersectionObserver` is available. Destroying the handle cancels the RAF, disconnects observers, removes listeners, and clears the target content.

The first frame is rendered immediately. When `prefers-reduced-motion: reduce` is active, that first frame remains static and no continuous loop is started. With the defaults, the prototype's complete animation motion is `1.5x` faster: rotation rates are scaled and the 7-second base morph cycle becomes `4666.67ms`.
