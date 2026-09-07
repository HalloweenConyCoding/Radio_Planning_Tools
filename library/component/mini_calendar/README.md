# Cony Mini Calendar

Reusable vanilla date/time picker extracted from the ACTIVE Calendar month-grid and 24-hour wheel behavior.

## Files

- `mini-calendar.js` - global `window.ConyMiniCalendar` API
- `mini-calendar.css` - namespaced shared styling
- `usage.html` - local `file:///` example
- `mini-calendar.test.mjs` - Node contract test

## API

```js
const controller = window.ConyMiniCalendar.mount(host, {
  date: '2026-07-16',
  time: '23:59',
  min: null,
  max: null,
  onChange(value) {
    console.log(value.date, value.time, value.timestamp);
  }
});
```

`mount(host, options)` returns:

- `getValue()` -> `{ date, time, timestamp }`
- `setValue({ date, time })`
- `destroy()`

`options.date` must be `YYYY-MM-DD`. `options.time` must be `HH:MM` in 24-hour format or empty. `timestamp` stays `null` until both values are valid and within optional `min` / `max`.

## Constraints

- Framework-free browser global
- Compatible with local `file:///` pages
- No persistence, chart, workspace, or page-specific coupling
- `ConyMiniCalendar.testing` only exposes small helper functions used by the Node contract test
