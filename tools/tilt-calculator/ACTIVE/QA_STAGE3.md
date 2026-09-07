# Stage 3 QA evidence

Date: 2026-09-08

## Scope

- Added responsive finishing rules only in `cell_coverage_calculator_style.css`; the final pass also permits the masthead title block to shrink and wrap cleanly inside the narrow flex header.
- Tablet widths from 681–900px retain paired parameter fields; widths <=680px stack fields, use 16px numeric inputs to avoid mobile browser zoom, and retain 44px input touch targets.
- Widths <=390px and <=340px tighten masthead/logo/status wrapping and switch containment for 390px/320px screens.
- Results use `overflow-wrap: anywhere`; the dashboard grid and panels permit flex/grid shrinkage, while the canvas wrapper stays width-constrained and keeps an 8:5 aspect ratio as the canvas scales to its container.
- Existing V7/Shiny 8s title, Stage 2 layered background, idle motion, and presentation script were left unchanged. The user observed no visible idle motion; that issue is explicitly deferred by the user.

## Verification

- CSS brace structure is balanced.
- Node syntax checks pass for both extracted original inline scripts and `tilt_calculator_motion.js`.
- Exact baseline comparisons pass for both inline scripts, all input tags, and the canvas tag. Application script SHA-256 remains `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.
- Static checks pass for V7/Shiny 8s, responsive breakpoints, tablet field pairs, mobile 16px inputs/44px targets, result wrapping, and canvas aspect ratio.
- A fresh baseline-vs-final Node DOM harness run compared Macro, Small switch, building distance `100`, and invalid height `-2`; all four outputs and the invalid-height alert/result preservation matched exactly. The draw function was stubbed, so this makes no canvas runtime claim.
- The idle/component refinement code was already present at clean `HEAD98d6e01` when this task resumed; this final pass validated the current files and updated handoff documentation without changing motion code.

## Limitations and handoff

- Browser visual confirmation remains unavailable under the established local-file/localhost URL security policy. No visual claim is made for the final desktop or mobile layout.
- Stage 3 implementation is complete and awaiting final user visual review. The deferred idle-motion visibility issue remains documented; no further idle-motion tuning was performed.
