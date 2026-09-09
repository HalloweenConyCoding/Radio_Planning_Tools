# Calculation logic QA

Date: 2026-09-09

## Scope

The calculation implementation keeps the existing page, controls, motion, defaults, and Macro/Small presentation scaling. The calculation now validates the complete supported domain, chooses the nearest forward ground/front/roof intersection, reports front width only when the main ray reaches the front face, clears stale state before invalid recalculation, and supplies separate finite clipping points for no-hit rays.

## Automated evidence

`CALCULATION_LOGIC_TEST.cjs` executes the inline `calculate()` entrypoint and the real `draw()` adapter against an instrumented canvas context. It covers:

- baseline ground distances and the existing building-front heights;
- roof hits and depth-dependent roof clearing;
- short-building horizontal clearance and tall-building front interception;
- exact front-roof and front-ground corners, plus points one micrometre on either side;
- missing, blank, negative, zero, 180-degree, backward, vertical, and invalid building inputs;
- ignored building height/depth while building distance is blank;
- width unavailable after ground, roof, or no front hit, and available at a reachable front face;
- valid-to-invalid recalculation clearing result text and canvas;
- finite canvas arguments for all-upward no-hit rays;
- finite arithmetic overflow rejection, including plot-bound overflow during the real draw path and ground-distance overflow;
- distant-building tolerance regression (a horizontal ray just above a far roof is not promoted to a front hit);
- tiny-height near-vertical no-hit rays clipped to finite world-height bounds in both site modes;
- the 270-case antenna/tilt/distance/height/depth matrix;
- geometric scale invariance.

Run with:

```text
node CALCULATION_LOGIC_TEST.cjs
```

Observed result: **12 calculation logic suites passed**.

## Browser handoff

The staged tests exercise the real calculation entrypoint and drawing adapter with finite-value assertions. The matrix checks finite categories and scale invariance; the independent 810-configuration oracle provides exhaustive expected-intersection comparison outside this focused harness. Supervisor verification also covered actual Macro→Small→Macro change-handler dispatch, default resets, automatic recalculation, and finite canvas arguments; browser spot checks covered baseline, roof, and horizontal cases. The original inspection remains historical evidence in `CALCULATION_LOGIC_INSPECTION.md`.
