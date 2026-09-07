# Stage 2 QA evidence

Date: 2026-09-07

## Scope

- Added presentation-only `tilt_calculator_motion.js`; the shared Shiny Text library remains read-only.
- Added a fixed, pointer-transparent three-layer editorial backdrop: a top grain layer (`-8px`), far paper plane (`-20px` additional, `-28px` total), mid contour/plane layer (`-62px` additional, `-70px` total), and near drafting layer (`-112px` additional, `-120px` total), with 136px overscan.
- Added a progressive reveal only to the lower documentation section. Parameter controls and the initial calculator remain visible by default, including when JavaScript fails.
- Added 180–200ms hover feedback for actual fine-pointer controls, with existing keyboard focus-visible states retained. Results and documentation copy have no false hover affordance.
- Normal scrolling is preserved through passive scroll/resize listeners and requestAnimationFrame scheduling. No wheel interception or scroll hijack was added.

## Verification

- `tilt_calculator_motion.js` passes the bundled Node syntax check.
- Plain Node DOM stubs pass: below-viewport reveal defers; initially visible reveal stays visible; no-IntersectionObserver fallback reveals content; observer-construction failure reveals content; reduced-motion initial state and runtime toggle keep content visible and remove motion-ready state.
- The same stubs verify distinct top/far/mid/near layer shifts at full scroll progress, full-document normalization, and bounded near-layer travel.
- Both original inline scripts remain byte-for-byte identical to `.baseline-stage1/cell_coverage_calculator.html` (analytics script and 12,691-byte application script). Protected input/canvas tags and the single external motion script link are intact.
- Stage 1 calculator outputs and protected contract evidence remain in `QA_STAGE1.md`.

## Limitations and handoff

- Browser visual confirmation remains pending. Per the established browser policy, no localhost/file workaround or further browser automation was used in Stage 2. The user should review desktop and mobile motion, hover, and reduced-motion appearance.
- Stage 2 is complete and awaiting review. Final visual confirmation of the stronger layered composition remains pending. Stage 3 responsive polish and final verification remain pending explicit approval.

## Ambient/component refinement

Date: 2026-09-08

- Work resumed from clean tracked `HEAD98d6e01` after the prior Stage 2 commit. The idle CSS drift and component feedback code were already saved; this resumed pass validated that code and updated the evidence, rather than claiming new code edits. It confirms exactly two recognizable paper plane pseudo-elements, 26s and 22s, with 9–10px motion and intact outer parallax transforms.
- Calculate arrow feedback is keyboard-equivalent across focus/press and fine-pointer hover. Results use one neutral 240ms `results-updated` cue driven by a presentation-only `MutationObserver`; result content and inline output HTML are never changed.
- Node stubs verify one cue per coalesced mutation batch, rapid update timer cancellation, hidden-state ambient pause and pending-frame cancellation, reduced-motion initialization/toggle cleanup, and observer recreation after motion resumes.
- Astra independently reran the Node VM stubs and confirmed the same behavior: batched results produce one timer, rapid callbacks replace the prior timer, hidden visibility clears timer/class and pauses ambient motion, hidden callbacks produce no cue, visibility resume allows cues, and reduced-motion toggling disconnects observers, clears cues, and removes scroll handling.
- Idle drift is disabled by reduced-motion CSS/class state and ambient animations pause when the document is hidden. Browser visual confirmation remains pending under the established URL security policy. Stage 3 remains paused.
