# Visualization intro QA

Date: 2026-09-08

## Scope

- Moved the existing `../../../images/Tilt_Calculation.png` from the masthead into an absolute `.canvas-intro` overlay inside `.canvas-wrapper`; no duplicate image remains.
- The overlay is pointer-transparent, contained without reflow, and fades over 320ms. The `800x500` canvas remains present and drawable below it from initial load.
- A separate presentation-only `MutationObserver` dismisses the overlay after `#results` becomes nonempty. Invalid input does not mutate empty results and leaves the intro visible. The observer stays active through reduced-motion toggles; a microtask click fallback handles environments without `MutationObserver`.
- Missing or cached-failed images receive a graceful hidden state. Reduced motion removes the fade transition while preserving immediate dismissal behavior.

## Verification

- Node syntax check passes for `tilt_calculator_motion.js`.
- Intro DOM stubs pass: initial overlay visible; valid nonempty results dismiss once; invalid/no-result state does not dismiss; reduced-motion mode dismisses immediately after valid output; no-`MutationObserver` click/microtask fallback dismisses after the existing click handler; cached image failure hides the overlay.
- Fresh baseline/final DOM calculator harness passes for Macro, Small, building distance `100`, and invalid height `-2`; output and alert behavior match exactly.
- Exact original inline scripts, input tags, radios, `onclick`, and canvas tag remain byte-for-byte/contract identical. The one existing image source is present exactly once.
- CSS balance, fade duration, pointer transparency, canvas positioning, responsive containment, and active-folder whitespace checks pass.

## Limitations

- Browser visual review remains blocked by the established local-file/localhost URL security policy. No browser or localhost workaround was used; fade perception, image framing, and frame smoothness remain for final user review.
- Shared Shiny Text assets and application/analytics logic remain untouched.
