# Stage 1 QA evidence

Date: 2026-09-07

## Baseline

Original untracked files are preserved in `.baseline-stage1/` before Stage 1 edits. SHA-256 values are recorded in `.baseline-stage1/SHA256SUMS`.

- HTML: `ff2599e5a91281a2dd20efe1586a29bcbda69f5a2aae0ca40a0f034030f0cc81`
- CSS: `c1585301bff179d001071bb1f488a722731ad5c3d3007bf43664b42617d8902f`

## Protected contracts

- Extracted inline application script is byte-for-byte identical to baseline, 12,691 bytes, SHA-256 `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.
- Node syntax check passes for the extracted inline script.
- Protected IDs, Macro/Small radio names and values, input defaults and steps, `onclick="calculate()"`, `#results`, and intrinsic `#plot` dimensions (`800x500`) are present.
- Shiny Text CSS/JS use `../../../library/text/shiny_text/`; the title hook starts with an empty `data-shiny-text` attribute and is configured for an 8 second sweep. Reduced motion restores solid ink text.

## Runtime cases

Browser smoke checks used the local static server at `http://127.0.0.1:8765/tools/tilt-calculator/ACTIVE/cell_coverage_calculator.html`.

- Default Macro: baseline and Stage 1 both return Upper `1080.10 m`, Main `377.19 m`, Lower `227.60 m`.
- Small Cell switch: defaults become HA `30`, mechanical/electrical tilt `0/0`, VBW/HBW `30/30`, building height `50`; result includes Upper upward, Main horizontal, and Lower ground landing at `111.96 m`.
- Macro with building distance `100 m`: result reports front heights `29.94 m`, `24.25 m`, `18.50 m`, plus beam width `130.38 m`.
- Invalid antenna height `-2`: existing handler remains unchanged and presents `Antenna height must be a positive number.` without replacing the prior result.

## Independent non-browser validation

- Astra's Node DOM harness compared the original baseline and final HTML for default Macro, Small switch, Macro with building distance `100 m`, and invalid antenna height `-2`; all outputs were identical. The draw function was stubbed, so this evidence makes no canvas runtime claim.
- The harness also matched all original inline scripts plus exact protected input and canvas tags. No-index `git diff --check` produced no whitespace errors.

## Browser layout evidence

- Desktop 1440px viewport geometry was captured before the final paired-grid readability adjustment: content width `1208px`; canvas display size `763.6x477.25px` with intrinsic `800x500`; calculate action visible within the first viewport. Treat this as pre-final layout evidence, not final visual approval.
- Final desktop visual review and mobile 390px screenshot capture remain pending. The in-app browser viewport override was unavailable in this execution context, and the browser's direct local-file URL was blocked by URL security policy. Static responsive rules are present for `900px` and `680px`, including one-column stacking, full-width inputs, and canvas max-width scaling.
- Browser console output was not emitted by the in-app browser session. The short-lived local server returned 200 for the edited page, stylesheet, Shiny Text assets, and image; the only observed 404s were the expected favicon request and the copied baseline page's relocated image path. The local server was stopped after review.

## Stage 1 handoff

Stage 1 implementation and checks are complete. Pause here for approval. On resume, read this plan and QA file, inspect current edits, and begin only the separately approved Stage 2 interaction/depth work. Stage 3 responsive polish and final verification remain pending.

## Targeted title correction

- 2026-09-07: User approved a bounded Stage 1 title correction. Document title and visible version now read `V7`.
- The local title sweep keeps `data-shiny-speed="8"` and uses graphite base, brighter cobalt shoulders, and pale silver/icy-blue highlight. Reduced motion still resolves to solid ink. Shared Shiny Text files remain read-only.
