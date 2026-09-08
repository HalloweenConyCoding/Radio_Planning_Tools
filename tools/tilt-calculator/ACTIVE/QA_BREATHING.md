# Wave breathing revision QA

Date: 2026-09-08

## Scope

- Revised only the existing `.wave-field-far::before` and `.wave-field-mid::before` ambient groups. The far group now uses an out-of-phase 7s full scale-opacity cycle; the mid group uses an 8s inverse cycle.
- Ambient wave motion is visibly bounded in source to `scale(0.94)`–`scale(1.06)` with opacity `0.68`–`1` / `0.72`–`1`. Outer parallax/pointer transforms remain on the field wrappers, so breathing does not overwrite scroll or pointer response.
- Foreground inputs, photo intro overlay, canvas, and application logic were not changed. Reduced-motion and hidden-tab pause selectors remain active; no continuous JavaScript frame loop was added.

## Verification

- CSS static checks confirm both breathing selectors target the new wave groups, durations are exactly 7s and 8s, keyframes are full 0%/50%/100% cycles rather than `alternate`, and reduced/hidden pause selectors cover both groups.
- Node syntax check passes for the unchanged presentation script. Fresh baseline/final calculator DOM checks remain identical for Macro, Small, building distance `100`, and invalid height `-2`.
- Intro behavior remains covered by `QA_VISUALIZATION_INTRO.md`; exact inline scripts, input tags, radios, onclick, and canvas `800x500` contract remain unchanged.
- `git diff --check` and active-folder whitespace checks pass. No shared-library edits were made.

## Limitation

- Source inspection found no definite root cause for the earlier report that ambient motion appeared static. Browser review remains blocked by the established local-file/localhost URL security policy, so breathing visibility and perceived smoothness are not claimed visually verified and no frame-rate claim is made.
