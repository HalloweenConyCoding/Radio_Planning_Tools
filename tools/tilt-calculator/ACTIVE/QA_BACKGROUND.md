# Final background revision QA

Date: 2026-09-08

## Scope

- Replaced the prior cream/rectangle backdrop with three lightweight CSS layers: cropped radio-wave arcs, pale-blue translucent beam wedges, and sparse graphite/cobalt drafting marks.
- Kept the dashboard as the continuous, lightly opaque calculator working surface; masthead, outer margins, and section gaps continue to expose the background composition.
- Added presentation-only scroll and fine-pointer response in `tilt_calculator_motion.js`. One requestAnimationFrame scheduler handles both inputs; scroll range and viewport dimensions are cached and refreshed on resize/ResizeObserver callbacks.
- Ambient motion is limited to two nested wave shapes at 13s and 16s with bounded 22px translation. Hidden/reduced states pause or clear dynamic transforms; reduced motion leaves the static composition visible.

## Verification

- Node syntax checks pass for both extracted original inline scripts and `tilt_calculator_motion.js`.
- Fresh baseline/final DOM harness checks pass for Macro, Small switch, building distance `100`, and invalid height `-2`; results and alert behavior match exactly. Drawing is stubbed, so this gives no canvas runtime claim.
- Fresh scheduler stubs pass: scroll plus pointer events coalesce to one RAF, pointer frames perform zero layout reads, ResizeObserver refreshes dimensions and schedules an update, fine-pointer media changes remove listeners and zero offsets, and hidden/reduced states cancel RAFs and clear all transforms. No perpetual RAF remains.
- Exact baseline comparisons pass for both inline scripts, all input tags, and the intrinsic 800x500 canvas tag. V7 title/Shiny 8s hook and local library paths remain present.
- Static source checks pass for one RAF scheduler, passive scroll/resize/pointer listeners, cached dimensions, pointer clamping, reduced/hidden cleanup, no perpetual RAF loop, no blur/filter/backdrop-filter, and no background scheduler transforms on foreground controls or the canvas.
- CSS braces and active-folder whitespace checks pass. Shared Shiny Text assets remain untouched.

## Limitations and handoff

- Browser visual confirmation remains unavailable under the established local-file/localhost URL security policy. No browser, localhost workaround, or alternative automation was used, so final desktop/mobile composition, motion visibility, and perceived smoothness still require user review.
- The earlier user-observed lack of visible idle motion is addressed by the new wave-field ambient shapes in source, but visual visibility and smoothness are not claimed verified.
- Stage 3 responsive safeguards remain in place; no application logic, analytics, IDs, defaults, radios, onclick, or canvas intrinsic dimensions were changed.
