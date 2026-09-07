# TILT_CAL editorial redesign proposal

Status: Stage 3 implementation complete and awaiting final user visual review. Idle-motion visibility issue is recorded and deferred by user; Stage 3 remains the final implementation stage.

## Approval and dispatch log

- 2026-09-07: User approved the overall light editorial direction and Stage 1 scope. ORIN dispatched implementation to Luna under Astra supervision.
- 2026-09-07: User approved Stage 2 with “nice go”. ORIN dispatched Stage 2 implementation to Luna under Astra supervision. Stage 3 remains pending.
- 2026-09-07: User requested a targeted Stage 2 background correction: replace the nearly invisible cream layer with visible multilayer editorial components moving at distinct bounded scroll rates. Correction is approved within Stage 2; no browser work is authorized under the existing URL security block.
- 2026-09-07: User approved a bounded Stage 2 ambient/refinement pass: add calm idle drift to at most two decorative layers, pause it when hidden or reduced, add calculate arrow feedback and a neutral one-shot results update cue, and keep Stage 3 paused.
- 2026-09-08: User approved Stage 3 (“continue Stage3”) and explicitly deferred the user-observed lack of visible idle motion. ORIN dispatched responsive polish and final static verification to Luna under Astra supervision; no idle-motion tuning is included in this stage.
- Scope guard: edit only `cell_coverage_calculator.html`, `cell_coverage_calculator_style.css`, presentation-only `tilt_calculator_motion.js`, this plan, and Stage 1/Stage 2 QA/baseline artifacts within `ACTIVE`.
- Stage 2 checklist before implementation: preserve Stage 1 edits and baseline; keep all original inline analytics/application scripts byte-for-byte unchanged; preserve IDs, input defaults/steps, radios, `onclick="calculate()"`, `#results`, and 800x500 canvas; add only presentation-only motion behavior; keep content visible if JS fails; respect reduced motion and normal scrolling; add actual-control hover/focus states without false result/documentation affordances.
- Stage 2 completion gate: verify motion script syntax and DOM contracts, exercise reduced-motion and observer/scheduling fallback stubs, record browser visual review limitation, then pause for Stage 3 approval.
- Stage 2 correction checklist before implementation: preserve V7 title/shiny8s and Stage 1 baseline; keep all original inline scripts byte-for-byte unchanged; retain passive normal scroll; add 2–3 visible pointer-transparent background layers with distinct rates, safe overscan, and no text obstruction; keep reduced-motion composition static; verify layer shifts and limits with stubs.
- Stage 2 ambient checklist before implementation: compose idle drift on nested decorative pseudo-elements so parallax transforms remain intact; cap idle motion to two background layers and a few pixels over 18–30 seconds; pause on hidden/reduced states; keep button feedback keyboard-equivalent; observe `#results` presentation-only with one coalesced neutral cue and no output mutation; verify observer cleanup and preference/visibility toggles.
- Stage 3 checklist before implementation: preserve V7/Shiny 8s, Stage 1/2 visual direction, all inline scripts, exact input/radio defaults and steps, `onclick`, and 800x500 canvas; fix <=390/320 masthead and switch containment; preserve tablet field pairs; ensure mobile numeric text is at least 16px and touch targets/focus remain clear; wrap long results; keep canvas aspect ratio/scaling and overflow safe; record idle visibility as unresolved/deferred; run static/Node DOM and contract checks without browser claims.
- Stage 1 checklist before implementation: preserve/hash originals; capture default result; keep inline app script byte-for-byte unchanged; preserve IDs, input defaults/steps, radios, `onclick="calculate()"`, `#results`, and 800x500 canvas; add local Shiny Text hook; implement editorial tokens, typography, hierarchy, responsive foundation, and basic focus usability.
- Stage 1 completion gate: capture desktop 1440px and mobile 390px screenshots, inspect overflow, verify representative Macro/Small/building/invalid-height behavior, record evidence below, then pause for Stage 2 approval.

## Scope and direction

Redesign only `cell_coverage_calculator.html`, `cell_coverage_calculator_style.css`, and presentation-only `tilt_calculator_motion.js` in this `ACTIVE` folder. Use a warm paper background, graphite text/surfaces, and cobalt as the primary signal/action color. The target is a minimal technical editorial layout: fewer enclosing cards, stronger type hierarchy, deliberate line separators, more vertical scrolling depth, responsive components, and restrained hover/focus reactions. Preserve the existing page identity and all calculator behavior.

Use the existing local Shiny Text library through portable relative paths:

- `../../../library/text/shiny_text/shiny_text.css`
- `../../../library/text/shiny_text/shiny_text.js`

The title hook should use an empty `data-shiny-text` attribute on the title element. The library initializes on load; a non-empty `data-shiny-text` value is treated as replacement text and can overwrite the title. Configure a slow 7–9 second sweep, with local reduced-motion CSS leaving solid readable text.

## Protected DOM and behavior contracts

- Keep the inline application script byte-for-byte unchanged during visual work.
- Keep `toRadians`, `getSelectedSiteType`, `calculate`, and `draw` available as currently defined.
- Keep input IDs `ha`, `mtilt`, `etilt`, `vbw`, `hbw`, `bdistance`, `bheight`, and `bdepth`; their number/optional behavior and defaults remain unchanged.
- Keep the site radios named `siteType`, with IDs `macro`/`small`, values `Macro`/`Small`, and the existing change handler behavior.
- Keep `#results` as the calculation output target; existing inline beam colors must remain valid for the current CSS overrides.
- Keep `#plot` as the canvas target with intrinsic `width="800"` and `height="500"`; CSS may scale its display size responsively without changing those attributes.
- The clickable `.calc-wrapper` may become a semantic `<button>` for keyboard/accessibility quality only if its `onclick="calculate()"` contract is preserved exactly and the script is otherwise untouched.
- Keep `#left-panel`, `#right-panel`, `#main-container`, `#readme`, `#siteTypeSwitch`, and panel content available unless a purely presentational wrapper is required.

## Three implementation stages

### Stage 1 — editorial foundation (approval required before starting)

Capture a baseline of the untracked `ACTIVE` HTML/CSS and a known default-input result. Rework tokens, typography, page background, header/title treatment, section rhythm, separators, input styling, and responsive layout in the two target files. Reduce nested card treatment while keeping the parameters, visualization, results, and documentation sections clear. Add the local Shiny Text links/hook only as required for the title. Do not alter the inline app script. Review at desktop and narrow mobile widths, then pause for user approval.

### Stage 2 — interaction and depth (approval required before starting)

Add restrained hover/focus/active reactions for inputs, site switch, calculate action, result rows, and documentation links/sections. Improve scrolling depth with spacing and section transitions rather than decorative clutter. Keep keyboard focus-visible outlines and `prefers-reduced-motion` fallbacks. Validate that semantic button replacement, if used, still invokes `calculate()` and that radio switching still repopulates defaults/recalculates as before. Pause for user approval.

### Stage 3 — responsive polish and verification (approval required before starting)

Tune breakpoints, canvas scaling, long-result wrapping, mobile order, contrast, and title animation timing. Run structural checks, JavaScript syntax checking on the extracted inline script if practical, and a browser smoke check with default, Macro/Small switch, building-distance, and invalid-height cases. Compare the protected script and canvas attributes against the baseline. Report any browser-only limitation before final human review/commit.

## Baseline and resume notes

`ACTIVE` and the shared library files are currently untracked in Git. Avoid cleanup, reset, or overwrite operations. Before Stage 1, preserve a local baseline via checksums or a review copy, and record the baseline result from the current default inputs. The proposal itself is the only planning artifact in scope. On resume, read this file, verify current `git status --short`, inspect any existing edits, obtain Stage 1 approval, then route implementation to Luna under Astra supervision. After each stage, stop at the review gate and wait for the next approval.

## Review checklist

- Warm paper / graphite / cobalt palette remains readable and technical.
- Fewer cards and clearer rules create editorial hierarchy.
- Desktop, tablet, and narrow mobile layouts scan cleanly.
- Hover, focus, active, reduced-motion, and keyboard states are usable.
- Shiny title is local, slow, and does not replace title text.
- Calculator IDs, radio contracts, `#results`, `#plot`, canvas dimensions, and inline script behavior are preserved.
- Known input/output examples and invalid-height handling remain unchanged.

## Stage 1 completion evidence

- 2026-09-07: Stage 1 implementation completed in the two target files. Baseline copies and hashes are in `.baseline-stage1/`; detailed checks and runtime outputs are in `QA_STAGE1.md`.
- The inline application script remains byte-for-byte identical. Protected DOM/input/radio/canvas contracts remain present. Default Macro output matches baseline; Small, building-distance, and invalid-height cases were exercised.
- Desktop 1440px review captured clean 1208px content geometry and responsive canvas scaling. Mobile capture was unavailable through the in-app browser viewport override; responsive CSS is present and is a Stage 2 recheck item.
- Resume instructions: obtain explicit Stage 2 approval, reread this plan and `QA_STAGE1.md`, inspect existing edits, then route only Stage 2 interaction/depth work. Stage 3 remains pending.
- 2026-09-07 targeted correction: title/version updated to V7. Scoped title sweep now uses graphite base, cobalt shoulders, and a pale silver/icy-blue reflection while retaining the 8 second sweep and reduced-motion solid ink fallback. Stage 2 interaction/depth and Stage 3 responsive polish remain pending.

## Stage 2 completion evidence

- 2026-09-07: User approved Stage 2 (“nice go”). Added bounded paper grain/contour parallax, documentation-only progressive reveal, and actual-control hover/focus feedback. Details and Node stub evidence are in `QA_STAGE2.md`.
- Presentation motion is isolated in `tilt_calculator_motion.js`; normal scrolling remains passive, full-document progress drives distinct top/far/mid/near layer shifts of `-8px`, `-28px`, `-70px`, and `-120px` total, and the 136px layer overscan prevents edge exposure.
- Content remains visible if the motion script fails, IntersectionObserver is unavailable or throws, or reduced motion is enabled/toggled. The lower documentation section is the only progressive reveal target; keyboard focus within it forces visibility.
- Both original inline scripts, protected DOM/input/canvas contracts, and Stage 1 calculator behavior remain unchanged. No browser visual confirmation was performed under the established URL security policy.
- 2026-09-07 targeted Stage 2 background correction: strengthened the backdrop into visible grain, offset paper planes, cobalt contour arcs, and drafting ticks with distinct bounded rates. The stronger composition is awaiting user visual review; no Stage 3 work has started.
- 2026-09-08 targeted Stage 2 ambient refinement: added calm idle drift to exactly two nested paper shapes, paused on hidden/reduced states; added calculate arrow feedback and one neutral coalesced results cue with timer cleanup. Existing parallax composition remains intact. Node stubs pass; browser visual confirmation remains pending.
- Resume instructions: obtain explicit Stage 3 approval, reread this plan and `QA_STAGE2.md`, inspect current edits, then perform only Stage 3 responsive polish and final verification. Do not begin Stage 3 yet.

## Stage 3 completion evidence

- 2026-09-08: User approved Stage 3 and explicitly deferred the reported lack of visible idle motion. Responsive polish and final static verification are complete; detailed evidence is in `QA_STAGE3.md`.
- Tablet and mobile safeguards now cover paired fields at 681–900px, stacked 16px inputs with 44px touch targets below 680px, masthead/switch containment at 390px/320px, long-result wrapping, and aspect-safe canvas scaling.
- Both original inline scripts, exact input tags, exact canvas tag, V7/Shiny 8s title, and Stage 2 presentation behavior remain unchanged. CSS structure and Node syntax checks pass. Existing baseline-vs-final calculator harness evidence remains in `QA_STAGE1.md`.
- Browser visual confirmation remains unavailable under the established URL security policy, so final desktop/mobile appearance awaits user review. No idle-motion tuning or other work beyond Stage 3 responsive/accessibility polish was performed.
- Final resume state: review `QA_STAGE3.md` and the current `ACTIVE` files, then obtain final user visual sign-off. Stage 3 is complete; no further implementation stage is planned.
