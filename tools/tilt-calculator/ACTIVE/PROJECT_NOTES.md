# Tilt Calculator V7 project notes

Consolidated: 2026-09-11. This is the single Markdown record for the ACTIVE calculator.

## Current status

Calculation corrections and the staged UI redesign are implemented. On 2026-09-11, running `node tools/tilt-calculator/ACTIVE/CALCULATION_LOGIC_TEST.cjs` from the repository root passed all 13 calculation suites. This checks calculation and instrumented drawing behavior, not browser appearance or real RF propagation.

Keep executable tests separate: [calculation regression tests](CALCULATION_LOGIC_TEST.cjs) and [map preview tests](MAP_PREVIEW_TEST.cjs). The map preview test file is present in the working tree but was not run as part of this documentation consolidation.

## Problems, decisions, and verification

| Problem | Current decision / behavior | Evidence |
|---|---|---|
| F1: missed roof hits | Test ground, front, and roof; choose nearest valid intersection; building depth affects roof hits. | Roof/depth suite passes. |
| F2: imaginary horizontal wall hits | Front intersections must lie within building height. | Front-height and distant-front suites pass. |
| F3: invalid inputs accepted | Validate finite inputs, positive dimensions, and beam widths strictly between 0 and 180 degrees. Blank building distance disables the building. | Validation, blank-building, and overflow suites pass. |
| F4: backward landings | Backward rays are supported as short no-forward-hit drawing segments. Exact +90 degrees lands directly below the antenna; exact -90 degrees is upward with no landing. | Exact-vertical suite passes. |
| F5: width without face hit | Report antenna-local projected width only when the main ray first reaches the front face. | Width-availability suite passes. |
| F6: stale valid result after invalid input | Clear old results and canvas when recalculation is invalid. | Validation/clearing suite passes. |
| F7: non-finite no-hit drawing | Separate finite plotting endpoints from physical hit points. | No-hit, tiny-height, and overflow suites pass. |

The model uses flat ground and a rectangular building with a shared height datum. Main tilt is mechanical plus electrical; upper/lower angles subtract/add half VBW. The retained width convention is `2 * D * tan(HBW / 2) / cos(main angle)`. It is an antenna-local cut, not a full 3D coverage footprint. Front corners receive deterministic front-face classification.

## UI decisions and remaining review

- Preserve the V7 warm-paper, graphite, and cobalt calculator presentation, the slow title shine, responsive fields, and intrinsic 800×500 canvas.
- Presentation motion belongs in `tilt_calculator_motion.js`; calculations remain in `cell_coverage_calculator.html`.
- The approved reference-image intro dismisses after valid results. Reduced-motion and hidden-tab behavior are part of the presentation contract.
- Final desktop/mobile appearance, breathing visibility, intro fade, and perceived smoothness were not fully verified in the historical records. This consolidation does not establish new visual approval.
- The background evolved from paper planes to radio-wave fields; later 7s/8s breathing cycles supersede earlier drift timings.

## How to maintain this record

Update current status, decisions, unresolved issues, and dated verification here. Record actual test runs separately from historical claims. Preserve test code and baseline artifacts outside this document. Do not create another stage-specific Markdown handoff for the same calculator.

## Historical records

The ten source notes below are retained in full, with heading levels adjusted and references redirected within this file. Their dates, old bug reports, approvals, hashes, and limitations describe the state at that time, not necessarily today's code. Old pause/dispatch instructions and browser-policy statements are historical records, not current instructions.

Known superseded statements: the original inspection proposed rejecting vertical/backward rays; later support replaced that proposal. The plan-review statement that all vertical rays have no landing conflicts with the passing +90-degree ground-hit regression. Earlier UI QA intentionally preserved stale-result behavior before calculation fixes. Original source line numbers and hashes refer to historical files.

<a id="calculation-logic-plan-review"></a>

## Historical record: CALCULATION LOGIC PLAN REVIEW

### Calculation logic plan review

Date: 2026-09-09

This implementation records the approved correction scope from [CALCULATION LOGIC INSPECTION](#calculation-logic-inspection). The existing 2D flat-ground model, static page, UI, motion behavior, site defaults, and Macro/Small visual scaling remain in place.

#### Model and validation decisions

- Use one common ground datum. The main angle is mechanical tilt plus electrical tilt; upper and lower edges are main minus and plus half the vertical beam width.
- Require finite antenna height greater than zero; finite mechanical and electrical tilt; vertical and horizontal beam widths strictly between zero and 180 degrees.
- Treat blank building distance as “no building” and ignore building height and depth in both calculation and plotting in that state.
- When building distance is present, require finite positive distance, height, and depth. Zero and negative geometry is rejected.
- Require every derived angle to be finite. Angles exactly at ±90° are supported as vertical boundary rays; angles outside ±90° are treated as backward no-forward-hit rays and clipped to a short direction-only segment.
- Validate required derived values and arithmetic results. A finite raw input set that overflows a required intermediate or result is invalid/unrepresentable, rather than a no-hit result.

#### Intersection decisions

- Represent each ray with a forward 2D direction vector and generate ground, front-face, and roof candidates.
- Choose the nearest non-negative candidate. Front-face candidates are inclusive at the roof and ground boundaries and have deterministic priority at a shared front corner, so exact front-roof and front-ground corners are classified as front hits.
- Apply only narrow scale-aware tolerances local to the candidate surface and its dimensions. Candidate surfaces are not merged based on a distant ground parameter.
- A ray with no physical candidate returns no hit and retains its direction. No physical hit point is invented for plotting.
- Vertical and backward rays do not produce building/ground hits or end dots; backward rays use a short finite plot segment rather than extending across the canvas.

#### Width and rendering decisions

- Retain the current antenna-local lateral-cut convention: `W = 2 * D * tan(HBW / 2) / cos(main angle)`.
- Report a projected face width only when the main ray’s first intersection includes the front face, including the defined front-corner cases. Otherwise mark the width unavailable with a reason; this does not claim that no RF reaches the building.
- Publish the full result atomically. Invalid recalculation clears prior result text and the canvas before showing the validation alert.
- Give every no-hit direction an independent finite clipping endpoint for the canvas. No-hit rays have no physical landing dot or landing result.

#### Required regression coverage

The focused harness will exercise the real calculation entrypoint and draw adapter with an instrumented canvas. It covers baseline and building-face controls, roof and corner intersections, front-vs-roof-vs-ground ordering, horizontal, upward, exact vertical, and backward beams, all validation rows, overflow, width availability, valid-to-invalid clearing, both site switches, the 270-case matrix, finite no-hit plot coordinates, and scale-invariance checks where applicable.

<a id="calculation-logic-qa"></a>

## Historical record: CALCULATION LOGIC QA

### Calculation logic QA

Date: 2026-09-09

#### Scope

The calculation implementation keeps the existing page, controls, motion, defaults, and Macro/Small presentation scaling. The calculation now validates the complete supported domain, chooses the nearest forward ground/front/roof intersection, supports exact vertical boundary rays, clips backward rays as short no-forward-hit segments, reports front width only when the main ray reaches the front face, clears stale state before invalid recalculation, and supplies separate finite clipping points for no-hit rays.

#### Automated evidence

`CALCULATION_LOGIC_TEST.cjs` executes the inline `calculate()` entrypoint and the real `draw()` adapter against an instrumented canvas context. It covers:

- baseline ground distances and the existing building-front heights;
- roof hits and depth-dependent roof clearing;
- short-building horizontal clearance and tall-building front interception;
- exact front-roof and front-ground corners, plus points one micrometre on either side;
- missing, blank, negative, zero, 180-degree, backward, vertical, and invalid building inputs;
- ignored building height/depth while building distance is blank;
- width unavailable after ground, roof, or no front hit, and available at a reachable front face;
- valid-to-invalid recalculation clearing result text and canvas;
- finite canvas arguments for all-upward no-hit rays and backward rays;
- exact ±90° vertical boundary rays and >90° backward rays;
- finite arithmetic overflow rejection, including plot-bound overflow during the real draw path and ground-distance overflow;
- distant-building tolerance regression (a horizontal ray just above a far roof is not promoted to a front hit);
- tiny-height near-vertical no-hit rays clipped to finite world-height bounds in both site modes;
- the 270-case antenna/tilt/distance/height/depth matrix;
- geometric scale invariance.

Run with:

```text
node CALCULATION_LOGIC_TEST.cjs
```

Observed result: **13 calculation logic suites passed**.

#### Browser handoff

The staged tests exercise the real calculation entrypoint and drawing adapter with finite-value assertions. The matrix checks finite categories and scale invariance; the independent 810-configuration oracle provides exhaustive expected-intersection comparison outside this focused harness. Supervisor verification also covered actual Macro→Small→Macro change-handler dispatch, default resets, automatic recalculation, and finite canvas arguments; browser spot checks covered baseline, roof, and horizontal cases. The original inspection remains historical evidence in [CALCULATION LOGIC INSPECTION](#calculation-logic-inspection).

<a id="calculation-logic-inspection"></a>

## Historical record: CALCULATION LOGIC INSPECTION

### ACTIVE Cell Coverage Calculator — calculation logic inspection

Date: 2026-09-09  
Scope: calculation logic only. No HTML, JavaScript, CSS, or calculation implementation was changed.

#### Verdict

**Fix the geometry and validation before treating all reported intersections as reliable.** Ordinary downward ground intersections and valid front-face hits work in the checked cases. However, the current calculation misses roof hits, invents horizontal front-face hits above the roof, accepts invalid inputs, and reports a building width even when the modeled main beam never reaches that face.

The smallest suitable correction is to keep the existing straight-ray model, add complete input validation, and replace the separate angle branches with one nearest-surface intersection calculation. A new RF simulation engine is unnecessary for these defects.

#### Evidence and boundaries

Inspected [cell_coverage_calculator.html](cell_coverage_calculator.html), principally lines 194–310, plus the numerical values passed to `draw()` and the site-type handler. The calculation is inline; `tilt_calculator_motion.js` observes results for presentation and does not change the equations.

- Executed the **actual inline calculation script**, extracted without editing, in a temporary Node VM harness with input/result DOM stand-ins. Replaced only `draw()` with an argument recorder for the result tests.
- Ran 23 named input cases, plus one valid-then-invalid result-state sequence.
- Compared the main beam with an independently written ray/surface reference over **270 combinations**: antenna height 10/30/50 m; tilt −30/0/5/30/60°; building distance 5/20/100 m; height 5/20/40 m; depth 5/30 m. Results: **219 matches, 15 missed roof intersections, 36 false horizontal front hits, 0 other differences** in this limited matrix.
- Independently calculated the upper/main/lower reference intersections for the example cases below.
- This is source and numerical execution evidence, **not a browser/canvas rendering test**, RF field validation, or exhaustive proof.
- Calculation script SHA-256: `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.

All examples are synthetic. No personal workspace data was used.

#### Model used to judge the results

For the current 2D profile, take the antenna at `(0, HA)`, flat ground at `y = 0`, and the building as the rectangle `[D, D + depth] × [0, height]`. Positive tilt points downward; negative tilt points upward. Distances are horizontal metres, and all heights share the same ground datum.

Within that model:

```text
main angle  = mechanical tilt + electrical tilt
upper angle = main angle − VBW / 2
lower angle = main angle + VBW / 2
ray height at horizontal distance x = HA − x × tan(angle)
```

Those angle and ground-distance formulas are not themselves the main defect. The missing surface checks, invalid-domain handling, and interpretation of the results are.

#### Manual test setup

Open the ACTIVE `cell_coverage_calculator.html`. Choose **Macro Site first**, then enter the values. The site switch resets several fields, so do not switch it again after entering a test. Click **Calculate Coverage** after each case.

Use this baseline whenever a test says “baseline plus changes”:

| Field | Value |
|---|---:|
| Antenna Height | 33 m |
| Mechanical Tilt | 2° |
| Electrical Tilt | 3° |
| Vertical Beam Width | 6.5° |
| Horizontal Beam Width | 66° |
| Building Distance | **empty** |
| Building Height | 50 m |
| Building Depth | 30 m |

A baseline without a building correctly gives upper/main/lower ground distances **1080.10 / 377.19 / 227.60 m**. With Building Distance **100 m**, it correctly gives front-face heights **29.94 / 24.25 / 18.50 m**. Keep these as regression controls.

#### F1 — High: roof intersections are entirely missing

**Evidence:** lines 233–246 only test the front face, then choose ground. Building depth affects `maxX` at line 282 and the drawing, but never the collision calculation. A ray that clears the front edge can subsequently enter the roof.

##### Test A: all three rays hit the roof

| HA | Mechanical | Electrical | VBW | HBW | Building Distance | Building Height | Building Depth |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 | 30 | 0 | 10 | 60 | 10 | 20 | 20 |

The roof spans horizontal distance **10–30 m**.

| Ray | Angle | Current result | Expected first intersection |
|---|---:|---|---|
| Upper | 25° | Ground at 64.34 m | Roof at **x = 21.45 m, y = 20 m** |
| Main | 30° | Ground at 51.96 m | Roof at **x = 17.32 m, y = 20 m** |
| Lower | 35° | Ground at 42.84 m | Roof at **x = 14.28 m, y = 20 m** |

For example, main-ray roof distance is `(30 − 20) / tan(30°) = 17.320508 m`. It lies inside the roof interval, so the ground point is beyond the first obstruction.

##### Test A2: depth must change the answer

Repeat Test A with **Building Depth = 5 m**. The roof now spans **10–15 m**.

- Upper and main rays should clear the entire building and land on the ground at **64.34 m** and **51.96 m**.
- Lower ray should still hit the roof at **14.28 m**.
- Current implementation reports all three on the ground in both tests.

**Proposed logic:** include a roof candidate as well as front and ground candidates; choose the earliest valid intersection along the forward ray. Use depth in the roof interval check.

#### F2 — High: horizontal beams hit imaginary wall above the roof

**Evidence:** lines 267–271 declare a front hit whenever a building distance exists. This branch does not check building height.

##### Test B: horizontal main ray passes above a short building

| HA | Mechanical | Electrical | VBW | HBW | Building Distance | Building Height | Building Depth |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 | 0 | 0 | 30 | 30 | 100 | 10 | 30 |

Current main result: **“Main beam hits building front at 30.00 m height.”** The building is only 10 m tall.

Expected:

- Upper −15°: upward, clears the building, no forward surface hit.
- Main 0°: horizontal at 30 m, **clears the building**, no ground hit.
- Lower 15°: valid front hit at **3.21 m**.

Control: repeat with **Building Height = 50 m**. The horizontal main ray should then hit the front at **30.00 m**.

**Proposed logic:** a front hit requires `0 ≤ y_at_front ≤ building_height`, for horizontal, upward, and downward rays alike. A valid zero angle must be handled explicitly; invalid numbers must never enter this branch.

#### F3 — High: missing and invalid inputs produce successful-looking answers

**Evidence:** lines 195–208 parse every field but validate only antenna height. The inputs at lines 94–122 lack bounds; the calculation button at line 126 calls `calculate()` directly, rather than submitting a validating form. Native number-field syntax alone does not enforce the calculation's physical domain.

For each row below, restore the baseline, apply the changes, and calculate. “Empty” means delete the value completely.

| Changes from baseline | Observed current result | Required behavior |
|---|---|---|
| D = 100; Mechanical Tilt empty | All angles are `NaN°`, yet all rays “hit” at 33.00 m; width `NaN` | Reject missing tilt; return no valid calculation |
| D = 100; VBW empty | Upper/lower `NaN°` falsely hit at 33.00 m; main still computes | Reject missing VBW |
| D = 100; HBW empty | Valid face heights, width `NaN` | Reject required width input, or explicitly mark width unavailable under a defined partial-result policy |
| D = 100; Building Height empty | Rays silently bypass the unknown building and report ground | Require height for an enabled building |
| D = 100; Building Depth empty | Face text still appears, but `maxX` passed to `draw()` is `NaN` | Require depth when modeling a finite building; never pass non-finite geometry |
| D = −10 | Front hits at 33.31 / 33.87 / 34.45 m and positive width 13.04 m | Reject a building behind the origin under the forward-building model |
| D = 100; depth = −30 | Reports normal front hits for an invalid rectangle | Reject negative depth |
| VBW = −6.5 | Upper and lower angles/results are reversed | Reject negative beamwidth |
| D = 100; HBW = −60 | Prints positive width **115.91 m** because `abs()` hides the sign | Reject negative beamwidth before the formula |
| D = 100; HBW = 180 | Prints approximately **3.28 × 10¹⁸ m** width | Reject the divergent edge of this finite-width model |

For missing tilt/VBW, JavaScript comparisons `NaN > 0` and `NaN < 0` both return false. The final `else` therefore treats invalid input as horizontal. This is a verified branch error, not simply cosmetic `NaN` text.

**Proposed logic:** normalize empty optional building distance to `null`; validate required fields with `Number.isFinite`; validate domains before computing any result. Do not coerce missing values to zero or convert negative dimensions to positive using `abs()`.

Recommended simple contract:

- `HA > 0`; mechanical and electrical tilt finite, with signed tilt permitted.
- `0 < VBW < 180` and `0 < HBW < 180` for a finite beam-width model. If zero-width diagnostic rays are desired, define that as an explicit supported mode.
- Building disabled when distance is empty; ignore height/depth in calculations in that state.
- Enabled building: `D > 0`, height `> 0`, depth `> 0`, all finite. A zero-distance antenna-on-wall model needs separate geometry; do not silently treat it as an ordinary detached building.
- Validate derived angles and results as well as raw fields. Very large finite values can still overflow downstream.

#### F4 — High: unsupported angles yield backward ground “landings”

**Evidence:** line 228 uses only `angle > 0` before applying `HA / tan(angle)`. It does not establish whether the ray points forward or crosses the tangent singularity.

##### Test C: ray points behind the antenna

Baseline plus **Mechanical Tilt = 100°, Electrical Tilt = 0°, VBW = 10°**, building distance empty.

Current upper/main/lower distances: **−2.89 / −5.82 / −8.84 m**, labeled ordinary ground landings. The angles are 95/100/105° and point into the backward half-plane.

Boundary variant: Mechanical **90°**, Electrical **0°**, VBW **6°** gives 87/90/93° and distances **1.73 / 0.00 / −1.73 m**. The vertical main ray alone is meaningful, but the lower ray is backward.

**Proposed logic:** for the present forward-only calculator, validate **all three derived angles** in `−90° < angle < 90°`, and reject an unsupported beam envelope. Alternatively, explicitly support vertical/backward rays with a vector intersection model and correct labels. Do not clamp an invalid angle to a different direction or wrap it modulo 180°.

For supported nearly horizontal rays, preserve the finite calculation when numerically reliable; a large distance is not automatically an error in this flat-ground model. Separate numerical tolerance and display range from physical interception.

#### F5 — Medium: “Beam Width on Building” is calculated without a valid main-beam face hit

**Evidence:** lines 290–307 require only a non-empty building distance. The width is independent of whether the main ray hits the ground before the building, clears the roof, or hits the roof later.

##### Test D: all modeled rays hit ground before the building

| HA | Mechanical | Electrical | VBW | HBW | Building Distance | Building Height | Building Depth |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 | 30 | 0 | 10 | 60 | 100 | 20 | 30 |

Current ground distances: **64.34 / 51.96 / 42.84 m**. Yet it also prints **“Beam Width on Building: 133.33 m.”** The main-ray height at that plane is **−27.74 m**, below ground.

Test B also prints a width of **53.59 m** at a main-ray height above the short building.

**Expected:** no actual main-beam face-width result in these cases. A hypothetical projected width at distance D may be retained as a separately identified mathematical projection, with the reason it does not lie on the modeled face.

##### What is and is not wrong with the width formula

Under an **antenna-local horizontal cut through boresight**, with a perpendicular facade and no yaw, the current expression algebraically reduces to:

```text
width = 2 × D × tan(HBW / 2) / cos(main_angle)
```

within the supported forward domain. This is not automatically an incorrect trigonometric formula. It follows by rotating lateral edge rays about boresight and intersecting them with the facade plane. The code computes it indirectly through subtraction of two heights and division by `sin(angle)`, creating unnecessary cancellation risk and a special near-zero branch.

If HBW instead means a **world-horizontal azimuth opening**, the projection is:

```text
width = 2 × D × tan(HBW / 2)
```

The two definitions must not be interchanged silently. At D = 100 m, tilt = 30°, HBW = 60°, they give **133.33 m** and **115.47 m** respectively. To compare these with a reachable face, use HA = **100 m**, building height = **80 m**, depth = **30 m**, Electrical = **0°**, Mechanical = **30°**, VBW = **10°**; the main face height is **42.26 m**. This is a **model-definition decision**, not a verified wrong answer without that definition.

**Proposed logic:** retain the current local-cut convention unless the product definition says otherwise; state it, simplify its equation, and compute actual face width only when the corresponding cross-section reaches the face. Finite building width/yaw and a full 3D footprint are not available from the current inputs. Main-ray absence also does not prove that no other portion of a real antenna pattern reaches the building.

#### F6 — Medium: an invalid recalculation preserves the previous answer

**Evidence:** the antenna-height guard returns at lines 206–208, before results are cleared at line 220 and before `draw()` runs.

##### Test E: valid result followed by invalid height

1. Calculate the unmodified baseline. Main result is **377.19 m**.
2. Change Antenna Height to **−1** and calculate again.
3. Dismiss the height alert.

Current behavior: the old **377.19 m** answer remains, although the inputs no longer describe that calculation. The canvas also receives no new draw call.

**Proposed logic:** validation failure must return an explicit invalid result state. Clear prior output or identify it as a previous result with its original input snapshot. Never present an old result as if it belongs to rejected inputs. Compute a complete result object before replacing the current valid result.

#### F7 — Lower priority: “no finite landing” has no finite plot extent

This is a numerical-output contract issue, included because it follows directly from the calculation. It is not a visual redesign request.

**Evidence:** no-landing branches use `(landingX, landingY) = (0, HA)`; line 282 leaves `maxX = 0` if all rays miss and there is no building. Macro scaling divides by that at line 331, producing `Infinity`; line 413 then multiplies zero by infinity, producing `NaN` coordinates.

##### Test F: all rays go upward

Baseline plus **Mechanical Tilt = −10°, Electrical Tilt = 0°, VBW = 6°**, building distance empty.

The text correctly reports no landing for −13/−10/−7°. Recorded `maxX` is **0**, so the downstream coordinates are not finite. A zero-width, zero-tilt diagnostic case has the same extent issue if such a mode is permitted. Actual browser drawing behavior was not tested in this audit.

**Proposed logic:** return `hit: null` with a direction for rays that do not hit. Keep the physical result separate from a finite drawing window. Set a positive view extent independently; clip displayed rays to it without calling that artificial endpoint a landing.

#### Proposed calculation plan — documentation only

##### 1. Define the supported model and validate its inputs

Use the validation contract above and a shared ground datum. Keep mechanical + electrical tilt as the current profile-model approximation; this audit did not validate real 3D antenna pattern rotation. Reject unsupported geometry with a field-specific reason.

Choose explicit policies for zero-distance buildings, zero-width rays, and vertical/backward rays before supporting them. The smallest correction can reject these special configurations.

##### 2. Compute candidate intersections using a ray vector

For each upper/main/lower angle θ in radians:

```text
origin = (0, HA)
direction = (cos θ, −sin θ)
p(t) = origin + t × direction, t ≥ 0
```

Generate candidates for the supported forward model:

1. **Ground:** if `sin θ > 0`, `t = HA / sin θ`; point `(t cos θ, 0)`.
2. **Front:** if the building is enabled and `cos θ > 0`, `t = D / cos θ`; accept only if `0 ≤ HA − t sin θ ≤ building_height`.
3. **Roof:** for a downward ray starting at or above roof height, `t = (HA − building_height) / sin θ`; accept only when `t ≥ 0` and `D ≤ t cos θ ≤ D + depth`.
4. Reject non-finite candidates and choose the smallest nonnegative t. In this forward model a first hit on the rear wall from outside is not needed: any ray entering from the left crosses the front or roof first.
5. With no valid candidate, return no intersection and preserve the ray direction.

Use scale-aware tolerances for endpoint inclusion and near-equal candidate distances. A front/roof or front/ground corner should be classified consistently as a shared boundary, not selected unpredictably by floating-point rounding. Do not apply a large angular epsilon that turns a meaningful long-distance ray into a horizontal one.

##### 3. Return geometry separately from messages

Suggested conceptual result per beam:

```text
angleDegrees
status: hit | no_forward_hit | invalid | unsupported
surface: ground | front | roof | corner | null
hitPoint: {x, y} | null
rayParameter: t | null
reason
```

Keep unrounded values for calculations; round only when producing text. Do not encode physical absence with a fake zero-distance hit.

##### 4. Derive the width under the chosen convention

Use a direct, validated width expression. Associate it with the relevant main-beam height and interception result. Distinguish actual face intersection from an infinite-plane projection. Do not use `abs()` to repair invalid distances or widths. Reject or mark unbounded cases explicitly instead of printing enormous finite approximations to a singularity.

##### 5. Publish results atomically

Validate → compute all ray intersections → derive applicable widths → verify finite result fields → update the result state. A failed input set must not reuse unlabeled results from a previous set.

##### 6. Acceptance checks before any later implementation is considered complete

- Baseline ground and D = 100 m front-face controls remain unchanged.
- Test A hits all three roof points; A2 changes only the physically affected intersections.
- Test B main ray clears height 10 m and hits height 50 m.
- Every malformed/missing-input row is rejected or explicitly marked unavailable according to the contract; no `NaN` result masquerades as horizontal geometry.
- Test C produces explicit unsupported geometry under a forward-only contract.
- Test D does not report a reachable-face width; any hypothetical projection is identified as such.
- Test E cannot show an unlabeled stale answer after invalid input.
- Test F keeps valid no-hit results separate from a finite display extent.
- Add exact front-roof corner and front-ground corner cases, an upward ray into a taller building, and rays just above/below each boundary.
- Re-run the 270-case matrix; also assert that every accepted hit lies on its reported surface, has nonnegative forward distance, and occurs before any other valid candidate.
- Check scale invariance: multiplying all lengths by the same positive factor scales hit distances/heights and projected widths by that factor without changing hit classification. Confirm depth can change roof hits but never a preceding front hit.

#### Physical interpretation limit

This program models selected straight rays and a beamwidth projection. It does not calculate signal strength, diffraction, reflections, penetration, terrain variation, or a link-budget coverage threshold. A beam missing the drawn building is not proof of zero RF service there. Half-power beamwidth describes the angular separation at 3 dB below the pattern peak, rather than a hard signal cutoff; see the primary technical explanation in [Analog Devices, “Phased Array Antenna Patterns—Part 1,” Beamwidth section](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part1.html).

**Final verdict: fix-then-validate — the largest correctness gap is choosing ground after clearing the building front without checking the roof. No implementation was performed.**

<a id="redesign-plan"></a>

## Historical record: REDESIGN PLAN

### TILT_CAL editorial redesign proposal

Status: Final approved visualization intro behavior is implemented; visual fade/motion smoothness remains unverified because browser review is blocked.

#### Approval and dispatch log

- 2026-09-07: User approved the overall light editorial direction and Stage 1 scope. ORIN dispatched implementation to Luna under Astra supervision.
- 2026-09-07: User approved Stage 2 with “nice go”. ORIN dispatched Stage 2 implementation to Luna under Astra supervision. Stage 3 remains pending.
- 2026-09-07: User requested a targeted Stage 2 background correction: replace the nearly invisible cream layer with visible multilayer editorial components moving at distinct bounded scroll rates. Correction is approved within Stage 2; no browser work is authorized under the existing URL security block.
- 2026-09-07: User approved a bounded Stage 2 ambient/refinement pass: add calm idle drift to at most two decorative layers, pause it when hidden or reduced, add calculate arrow feedback and a neutral one-shot results update cue, and keep Stage 3 paused.
- 2026-09-08: User approved Stage 3 (“continue Stage3”) and explicitly deferred the user-observed lack of visible idle motion. ORIN dispatched responsive polish and final static verification to Luna under Astra supervision; no idle-motion tuning is included in this stage.
- 2026-09-08: User approved the final background revision: replace the failed cream/rectangle motif with visible radio-wave fields, beam wedges, drafting marks, stronger bounded parallax, and small fine-pointer response. ORIN dispatched the presentation-only revision to Luna under Astra supervision; the foreground calculator and protected application contracts remain unchanged.
- 2026-09-08: User approved moving the existing `Tilt_Calculation.png` reference image from the masthead into the visualization as a fixed intro overlay. It fades only after valid nonempty results, remains above the initial canvas without reflow, and has reduced-motion/missing-image fallbacks.
- 2026-09-08: User approved a bounded breathing revision after reporting the ambient waves appeared static: the existing two wave groups now use out-of-phase 7s/8s scale-opacity cycles, with hidden/reduced-motion pause safeguards retained. No JavaScript scheduler or foreground transforms changed.
- Scope guard: edit only `cell_coverage_calculator.html`, `cell_coverage_calculator_style.css`, presentation-only `tilt_calculator_motion.js`, this plan, and stage QA/baseline artifacts within `ACTIVE`.
- Stage 2 checklist before implementation: preserve Stage 1 edits and baseline; keep all original inline analytics/application scripts byte-for-byte unchanged; preserve IDs, input defaults/steps, radios, `onclick="calculate()"`, `#results`, and 800x500 canvas; add only presentation-only motion behavior; keep content visible if JS fails; respect reduced motion and normal scrolling; add actual-control hover/focus states without false result/documentation affordances.
- Stage 2 completion gate: verify motion script syntax and DOM contracts, exercise reduced-motion and observer/scheduling fallback stubs, record browser visual review limitation, then pause for Stage 3 approval.
- Stage 2 correction checklist before implementation: preserve V7 title/shiny8s and Stage 1 baseline; keep all original inline scripts byte-for-byte unchanged; retain passive normal scroll; add 2–3 visible pointer-transparent background layers with distinct rates, safe overscan, and no text obstruction; keep reduced-motion composition static; verify layer shifts and limits with stubs.
- Stage 2 ambient checklist before implementation: compose idle drift on nested decorative pseudo-elements so parallax transforms remain intact; cap idle motion to two background layers and a few pixels over 18–30 seconds; pause on hidden/reduced states; keep button feedback keyboard-equivalent; observe `#results` presentation-only with one coalesced neutral cue and no output mutation; verify observer cleanup and preference/visibility toggles.
- Stage 3 checklist before implementation: preserve V7/Shiny 8s, Stage 1/2 visual direction, all inline scripts, exact input/radio defaults and steps, `onclick`, and 800x500 canvas; fix <=390/320 masthead and switch containment; preserve tablet field pairs; ensure mobile numeric text is at least 16px and touch targets/focus remain clear; wrap long results; keep canvas aspect ratio/scaling and overflow safe; record idle visibility as unresolved/deferred; run static/Node DOM and contract checks without browser claims.
- Stage 1 checklist before implementation: preserve/hash originals; capture default result; keep inline app script byte-for-byte unchanged; preserve IDs, input defaults/steps, radios, `onclick="calculate()"`, `#results`, and 800x500 canvas; add local Shiny Text hook; implement editorial tokens, typography, hierarchy, responsive foundation, and basic focus usability.
- Stage 1 completion gate: capture desktop 1440px and mobile 390px screenshots, inspect overflow, verify representative Macro/Small/building/invalid-height behavior, record evidence below, then pause for Stage 2 approval.

#### Scope and direction

Redesign only `cell_coverage_calculator.html`, `cell_coverage_calculator_style.css`, and presentation-only `tilt_calculator_motion.js` in this `ACTIVE` folder. Use a warm paper background, graphite text/surfaces, and cobalt as the primary signal/action color. The target is a minimal technical editorial layout: fewer enclosing cards, stronger type hierarchy, deliberate line separators, more vertical scrolling depth, responsive components, and restrained hover/focus reactions. Preserve the existing page identity and all calculator behavior.

Use the existing local Shiny Text library through portable relative paths:

- `../../../library/text/shiny_text/shiny_text.css`
- `../../../library/text/shiny_text/shiny_text.js`

The title hook should use an empty `data-shiny-text` attribute on the title element. The library initializes on load; a non-empty `data-shiny-text` value is treated as replacement text and can overwrite the title. Configure a slow 7–9 second sweep, with local reduced-motion CSS leaving solid readable text.

#### Protected DOM and behavior contracts

- Keep the inline application script byte-for-byte unchanged during visual work.
- Keep `toRadians`, `getSelectedSiteType`, `calculate`, and `draw` available as currently defined.
- Keep input IDs `ha`, `mtilt`, `etilt`, `vbw`, `hbw`, `bdistance`, `bheight`, and `bdepth`; their number/optional behavior and defaults remain unchanged.
- Keep the site radios named `siteType`, with IDs `macro`/`small`, values `Macro`/`Small`, and the existing change handler behavior.
- Keep `#results` as the calculation output target; existing inline beam colors must remain valid for the current CSS overrides.
- Keep `#plot` as the canvas target with intrinsic `width="800"` and `height="500"`; CSS may scale its display size responsively without changing those attributes.
- The clickable `.calc-wrapper` may become a semantic `<button>` for keyboard/accessibility quality only if its `onclick="calculate()"` contract is preserved exactly and the script is otherwise untouched.
- Keep `#left-panel`, `#right-panel`, `#main-container`, `#readme`, `#siteTypeSwitch`, and panel content available unless a purely presentational wrapper is required.

#### Three implementation stages

##### Stage 1 — editorial foundation (approval required before starting)

Capture a baseline of the untracked `ACTIVE` HTML/CSS and a known default-input result. Rework tokens, typography, page background, header/title treatment, section rhythm, separators, input styling, and responsive layout in the two target files. Reduce nested card treatment while keeping the parameters, visualization, results, and documentation sections clear. Add the local Shiny Text links/hook only as required for the title. Do not alter the inline app script. Review at desktop and narrow mobile widths, then pause for user approval.

##### Stage 2 — interaction and depth (approval required before starting)

Add restrained hover/focus/active reactions for inputs, site switch, calculate action, result rows, and documentation links/sections. Improve scrolling depth with spacing and section transitions rather than decorative clutter. Keep keyboard focus-visible outlines and `prefers-reduced-motion` fallbacks. Validate that semantic button replacement, if used, still invokes `calculate()` and that radio switching still repopulates defaults/recalculates as before. Pause for user approval.

##### Stage 3 — responsive polish and verification (approval required before starting)

Tune breakpoints, canvas scaling, long-result wrapping, mobile order, contrast, and title animation timing. Run structural checks, JavaScript syntax checking on the extracted inline script if practical, and a browser smoke check with default, Macro/Small switch, building-distance, and invalid-height cases. Compare the protected script and canvas attributes against the baseline. Report any browser-only limitation before final human review/commit.

#### Baseline and resume notes

`ACTIVE` and the shared library files are currently untracked in Git. Avoid cleanup, reset, or overwrite operations. Before Stage 1, preserve a local baseline via checksums or a review copy, and record the baseline result from the current default inputs. The proposal itself is the only planning artifact in scope. On resume, read this file, verify current `git status --short`, inspect any existing edits, obtain Stage 1 approval, then route implementation to Luna under Astra supervision. After each stage, stop at the review gate and wait for the next approval.

#### Review checklist

- Warm paper / graphite / cobalt palette remains readable and technical.
- Fewer cards and clearer rules create editorial hierarchy.
- Desktop, tablet, and narrow mobile layouts scan cleanly.
- Hover, focus, active, reduced-motion, and keyboard states are usable.
- Shiny title is local, slow, and does not replace title text.
- Calculator IDs, radio contracts, `#results`, `#plot`, canvas dimensions, and inline script behavior are preserved.
- Known input/output examples and invalid-height handling remain unchanged.

#### Stage 1 completion evidence

- 2026-09-07: Stage 1 implementation completed in the two target files. Baseline copies and hashes are in `.baseline-stage1/`; detailed checks and runtime outputs are in [QA STAGE1](#qa-stage1).
- The inline application script remains byte-for-byte identical. Protected DOM/input/radio/canvas contracts remain present. Default Macro output matches baseline; Small, building-distance, and invalid-height cases were exercised.
- Desktop 1440px review captured clean 1208px content geometry and responsive canvas scaling. Mobile capture was unavailable through the in-app browser viewport override; responsive CSS is present and is a Stage 2 recheck item.
- Resume instructions: obtain explicit Stage 2 approval, reread this plan and [QA STAGE1](#qa-stage1), inspect existing edits, then route only Stage 2 interaction/depth work. Stage 3 remains pending.
- 2026-09-07 targeted correction: title/version updated to V7. Scoped title sweep now uses graphite base, cobalt shoulders, and a pale silver/icy-blue reflection while retaining the 8 second sweep and reduced-motion solid ink fallback. Stage 2 interaction/depth and Stage 3 responsive polish remain pending.

#### Stage 2 completion evidence

- 2026-09-07: User approved Stage 2 (“nice go”). Added bounded paper grain/contour parallax, documentation-only progressive reveal, and actual-control hover/focus feedback. Details and Node stub evidence are in [QA STAGE2](#qa-stage2).
- Presentation motion is isolated in `tilt_calculator_motion.js`; normal scrolling remains passive, full-document progress drives distinct top/far/mid/near layer shifts of `-8px`, `-28px`, `-70px`, and `-120px` total, and the 136px layer overscan prevents edge exposure.
- Content remains visible if the motion script fails, IntersectionObserver is unavailable or throws, or reduced motion is enabled/toggled. The lower documentation section is the only progressive reveal target; keyboard focus within it forces visibility.
- Both original inline scripts, protected DOM/input/canvas contracts, and Stage 1 calculator behavior remain unchanged. No browser visual confirmation was performed under the established URL security policy.
- 2026-09-07 targeted Stage 2 background correction: strengthened the backdrop into visible grain, offset paper planes, cobalt contour arcs, and drafting ticks with distinct bounded rates. The stronger composition is awaiting user visual review; no Stage 3 work has started.
- 2026-09-08 targeted Stage 2 ambient refinement: added calm idle drift to exactly two nested paper shapes, paused on hidden/reduced states; added calculate arrow feedback and one neutral coalesced results cue with timer cleanup. Existing parallax composition remains intact. Node stubs pass; browser visual confirmation remains pending.
- Resume instructions: obtain explicit Stage 3 approval, reread this plan and [QA STAGE2](#qa-stage2), inspect current edits, then perform only Stage 3 responsive polish and final verification. Do not begin Stage 3 yet.

#### Stage 3 completion evidence

- 2026-09-08: User approved Stage 3 and explicitly deferred the reported lack of visible idle motion. Responsive polish and final static verification are complete; detailed evidence is in [QA STAGE3](#qa-stage3).
- Tablet and mobile safeguards now cover paired fields at 681–900px, stacked 16px inputs with 44px touch targets below 680px, masthead/switch containment at 390px/320px, long-result wrapping, and aspect-safe canvas scaling.
- Both original inline scripts, exact input tags, exact canvas tag, V7/Shiny 8s title, and Stage 2 presentation behavior remain unchanged. CSS structure and Node syntax checks pass. Existing baseline-vs-final calculator harness evidence remains in [QA STAGE1](#qa-stage1).
- Browser visual confirmation remains unavailable under the established URL security policy, so final desktop/mobile appearance awaits user review. No idle-motion tuning or other work beyond Stage 3 responsive/accessibility polish was performed.
- Final resume state: review [QA STAGE3](#qa-stage3) and the current `ACTIVE` files, then obtain final user visual sign-off. Stage 3 is complete; no further implementation stage is planned.

#### Final background revision evidence

- 2026-09-08: Replaced the prior paper-plane/rectangle backdrop with three pointer-transparent radio-wave layers: cropped cobalt and graphite arcs, translucent pale-blue beam wedges, and sparse drafting marks. The dashboard alone receives a lightly opaque continuous working surface so the masthead, margins, and section gaps still expose the background.
- Scroll and fine-pointer updates share one event-driven requestAnimationFrame scheduler. Scroll range and viewport dimensions are cached and refreshed on resize/ResizeObserver callbacks; pointer offsets are clamped to 6px and scaled by layer. No perpetual loop, scroll hijack, blur/filter, or large animated background is used.
- Exactly two bounded ambient shape animations run at 13s and 16s with 22px maximum translation; hidden and reduced-motion states pause or clear transforms, and reduced motion leaves the static radio-wave composition visible. The existing results cue and title sweep remain intact.
- Final syntax, DOM contract, and presentation scheduler checks are recorded in [QA BACKGROUND](#qa-background). Browser visual review remains blocked by the established local-file/localhost URL security policy, so the final composition still requires user visual confirmation. Stage 3 responsive polish remains retained; no further stage is planned.

#### Visualization intro evidence

- 2026-09-08: The single existing `Tilt_Calculation.png` image now lives inside `.canvas-wrapper` as `.canvas-intro`; the top masthead image placement was removed. The canvas remains intrinsic `800x500` and visible underneath the absolute overlay.
- A separate presentation-only observer watches `#results` for nonempty output. Invalid input leaves the empty-results intro visible; valid output adds a one-way dismissal class. A microtask click fallback covers environments without `MutationObserver`, and cached image failures hide the overlay without leaving a broken icon.
- Final intro behavior checks are recorded in [QA VISUALIZATION INTRO](#qa-visualization-intro). Browser visual confirmation and measured frame smoothness remain pending under the established security policy.

#### Final breathing revision evidence

- 2026-09-08: Source inspection found the wave selectors correctly targeted the new `::before` groups; no definite runtime root cause for the earlier static appearance was established. Replaced the prior long alternating drift with clear full breathing cycles: `waveFarBreath` 7s and `waveMidBreath` 8s, out of phase, each using only bounded `transform: scale()` and opacity.
- Reduced-motion and `ambient-paused` selectors still target both breathing groups; outer scroll/pointer transforms and foreground calculator/photo/canvas behavior remain unchanged. Verification is recorded in [QA BREATHING](#qa-breathing); browser visual visibility and smoothness remain unverified.

<a id="qa-stage1"></a>

## Historical record: QA STAGE1

### Stage 1 QA evidence

Date: 2026-09-07

#### Baseline

Original untracked files are preserved in `.baseline-stage1/` before Stage 1 edits. SHA-256 values are recorded in `.baseline-stage1/SHA256SUMS`.

- HTML: `ff2599e5a91281a2dd20efe1586a29bcbda69f5a2aae0ca40a0f034030f0cc81`
- CSS: `c1585301bff179d001071bb1f488a722731ad5c3d3007bf43664b42617d8902f`

#### Protected contracts

- Extracted inline application script is byte-for-byte identical to baseline, 12,691 bytes, SHA-256 `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.
- Node syntax check passes for the extracted inline script.
- Protected IDs, Macro/Small radio names and values, input defaults and steps, `onclick="calculate()"`, `#results`, and intrinsic `#plot` dimensions (`800x500`) are present.
- Shiny Text CSS/JS use `../../../library/text/shiny_text/`; the title hook starts with an empty `data-shiny-text` attribute and is configured for an 8 second sweep. Reduced motion restores solid ink text.

#### Runtime cases

Browser smoke checks used the local static server at `http://127.0.0.1:8765/tools/tilt-calculator/ACTIVE/cell_coverage_calculator.html`.

- Default Macro: baseline and Stage 1 both return Upper `1080.10 m`, Main `377.19 m`, Lower `227.60 m`.
- Small Cell switch: defaults become HA `30`, mechanical/electrical tilt `0/0`, VBW/HBW `30/30`, building height `50`; result includes Upper upward, Main horizontal, and Lower ground landing at `111.96 m`.
- Macro with building distance `100 m`: result reports front heights `29.94 m`, `24.25 m`, `18.50 m`, plus beam width `130.38 m`.
- Invalid antenna height `-2`: existing handler remains unchanged and presents `Antenna height must be a positive number.` without replacing the prior result.

#### Independent non-browser validation

- Astra's Node DOM harness compared the original baseline and final HTML for default Macro, Small switch, Macro with building distance `100 m`, and invalid antenna height `-2`; all outputs were identical. The draw function was stubbed, so this evidence makes no canvas runtime claim.
- The harness also matched all original inline scripts plus exact protected input and canvas tags. No-index `git diff --check` produced no whitespace errors.

#### Browser layout evidence

- Desktop 1440px viewport geometry was captured before the final paired-grid readability adjustment: content width `1208px`; canvas display size `763.6x477.25px` with intrinsic `800x500`; calculate action visible within the first viewport. Treat this as pre-final layout evidence, not final visual approval.
- Final desktop visual review and mobile 390px screenshot capture remain pending. The in-app browser viewport override was unavailable in this execution context, and the browser's direct local-file URL was blocked by URL security policy. Static responsive rules are present for `900px` and `680px`, including one-column stacking, full-width inputs, and canvas max-width scaling.
- Browser console output was not emitted by the in-app browser session. The short-lived local server returned 200 for the edited page, stylesheet, Shiny Text assets, and image; the only observed 404s were the expected favicon request and the copied baseline page's relocated image path. The local server was stopped after review.

#### Stage 1 handoff

Stage 1 implementation and checks are complete. Pause here for approval. On resume, read this plan and QA file, inspect current edits, and begin only the separately approved Stage 2 interaction/depth work. Stage 3 responsive polish and final verification remain pending.

#### Targeted title correction

- 2026-09-07: User approved a bounded Stage 1 title correction. Document title and visible version now read `V7`.
- The local title sweep keeps `data-shiny-speed="8"` and uses graphite base, brighter cobalt shoulders, and pale silver/icy-blue highlight. Reduced motion still resolves to solid ink. Shared Shiny Text files remain read-only.

<a id="qa-stage2"></a>

## Historical record: QA STAGE2

### Stage 2 QA evidence

Date: 2026-09-07

#### Scope

- Added presentation-only `tilt_calculator_motion.js`; the shared Shiny Text library remains read-only.
- Added a fixed, pointer-transparent three-layer editorial backdrop: a top grain layer (`-8px`), far paper plane (`-20px` additional, `-28px` total), mid contour/plane layer (`-62px` additional, `-70px` total), and near drafting layer (`-112px` additional, `-120px` total), with 136px overscan.
- Added a progressive reveal only to the lower documentation section. Parameter controls and the initial calculator remain visible by default, including when JavaScript fails.
- Added 180–200ms hover feedback for actual fine-pointer controls, with existing keyboard focus-visible states retained. Results and documentation copy have no false hover affordance.
- Normal scrolling is preserved through passive scroll/resize listeners and requestAnimationFrame scheduling. No wheel interception or scroll hijack was added.

#### Verification

- `tilt_calculator_motion.js` passes the bundled Node syntax check.
- Plain Node DOM stubs pass: below-viewport reveal defers; initially visible reveal stays visible; no-IntersectionObserver fallback reveals content; observer-construction failure reveals content; reduced-motion initial state and runtime toggle keep content visible and remove motion-ready state.
- The same stubs verify distinct top/far/mid/near layer shifts at full scroll progress, full-document normalization, and bounded near-layer travel.
- Both original inline scripts remain byte-for-byte identical to `.baseline-stage1/cell_coverage_calculator.html` (analytics script and 12,691-byte application script). Protected input/canvas tags and the single external motion script link are intact.
- Stage 1 calculator outputs and protected contract evidence remain in [QA STAGE1](#qa-stage1).

#### Limitations and handoff

- Browser visual confirmation remains pending. Per the established browser policy, no localhost/file workaround or further browser automation was used in Stage 2. The user should review desktop and mobile motion, hover, and reduced-motion appearance.
- Stage 2 is complete and awaiting review. Final visual confirmation of the stronger layered composition remains pending. Stage 3 responsive polish and final verification remain pending explicit approval.

#### Ambient/component refinement

Date: 2026-09-08

- Work resumed from clean tracked `HEAD98d6e01` after the prior Stage 2 commit. The idle CSS drift and component feedback code were already saved; this resumed pass validated that code and updated the evidence, rather than claiming new code edits. It confirms exactly two recognizable paper plane pseudo-elements, 26s and 22s, with 9–10px motion and intact outer parallax transforms.
- Calculate arrow feedback is keyboard-equivalent across focus/press and fine-pointer hover. Results use one neutral 240ms `results-updated` cue driven by a presentation-only `MutationObserver`; result content and inline output HTML are never changed.
- Node stubs verify one cue per coalesced mutation batch, rapid update timer cancellation, hidden-state ambient pause and pending-frame cancellation, reduced-motion initialization/toggle cleanup, and observer recreation after motion resumes.
- Astra independently reran the Node VM stubs and confirmed the same behavior: batched results produce one timer, rapid callbacks replace the prior timer, hidden visibility clears timer/class and pauses ambient motion, hidden callbacks produce no cue, visibility resume allows cues, and reduced-motion toggling disconnects observers, clears cues, and removes scroll handling.
- Idle drift is disabled by reduced-motion CSS/class state and ambient animations pause when the document is hidden. Browser visual confirmation remains pending under the established URL security policy. Stage 3 remains paused.

<a id="qa-stage3"></a>

## Historical record: QA STAGE3

### Stage 3 QA evidence

Date: 2026-09-08

#### Scope

- Added responsive finishing rules only in `cell_coverage_calculator_style.css`; the final pass also permits the masthead title block to shrink and wrap cleanly inside the narrow flex header.
- Tablet widths from 681–900px retain paired parameter fields; widths <=680px stack fields, use 16px numeric inputs to avoid mobile browser zoom, and retain 44px input touch targets.
- Widths <=390px and <=340px tighten masthead/logo/status wrapping and switch containment for 390px/320px screens.
- Results use `overflow-wrap: anywhere`; the dashboard grid and panels permit flex/grid shrinkage, while the canvas wrapper stays width-constrained and keeps an 8:5 aspect ratio as the canvas scales to its container.
- Existing V7/Shiny 8s title, Stage 2 layered background, idle motion, and presentation script were left unchanged. The user observed no visible idle motion; that issue is explicitly deferred by the user.

#### Verification

- CSS brace structure is balanced.
- Node syntax checks pass for both extracted original inline scripts and `tilt_calculator_motion.js`.
- Exact baseline comparisons pass for both inline scripts, all input tags, and the canvas tag. Application script SHA-256 remains `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.
- Static checks pass for V7/Shiny 8s, responsive breakpoints, tablet field pairs, mobile 16px inputs/44px targets, result wrapping, and canvas aspect ratio.
- A fresh baseline-vs-final Node DOM harness run compared Macro, Small switch, building distance `100`, and invalid height `-2`; all four outputs and the invalid-height alert/result preservation matched exactly. The draw function was stubbed, so this makes no canvas runtime claim.
- The idle/component refinement code was already present at clean `HEAD98d6e01` when this task resumed; this final pass validated the current files and updated handoff documentation without changing motion code.

#### Limitations and handoff

- Browser visual confirmation remains unavailable under the established local-file/localhost URL security policy. No visual claim is made for the final desktop or mobile layout.
- Stage 3 implementation is complete and awaiting final user visual review. The deferred idle-motion visibility issue remains documented; no further idle-motion tuning was performed.

<a id="qa-background"></a>

## Historical record: QA BACKGROUND

### Final background revision QA

Date: 2026-09-08

#### Scope

- Replaced the prior cream/rectangle backdrop with three lightweight CSS layers: cropped radio-wave arcs, pale-blue translucent beam wedges, and sparse graphite/cobalt drafting marks.
- Kept the dashboard as the continuous, lightly opaque calculator working surface; masthead, outer margins, and section gaps continue to expose the background composition.
- Added presentation-only scroll and fine-pointer response in `tilt_calculator_motion.js`. One requestAnimationFrame scheduler handles both inputs; scroll range and viewport dimensions are cached and refreshed on resize/ResizeObserver callbacks.
- Ambient motion is limited to two nested wave shapes at 13s and 16s with bounded 22px translation. Hidden/reduced states pause or clear dynamic transforms; reduced motion leaves the static composition visible.

#### Verification

- Node syntax checks pass for both extracted original inline scripts and `tilt_calculator_motion.js`.
- Fresh baseline/final DOM harness checks pass for Macro, Small switch, building distance `100`, and invalid height `-2`; results and alert behavior match exactly. Drawing is stubbed, so this gives no canvas runtime claim.
- Fresh scheduler stubs pass: scroll plus pointer events coalesce to one RAF, pointer frames perform zero layout reads, ResizeObserver refreshes dimensions and schedules an update, fine-pointer media changes remove listeners and zero offsets, and hidden/reduced states cancel RAFs and clear all transforms. No perpetual RAF remains.
- Exact baseline comparisons pass for both inline scripts, all input tags, and the intrinsic 800x500 canvas tag. V7 title/Shiny 8s hook and local library paths remain present.
- Static source checks pass for one RAF scheduler, passive scroll/resize/pointer listeners, cached dimensions, pointer clamping, reduced/hidden cleanup, no perpetual RAF loop, no blur/filter/backdrop-filter, and no background scheduler transforms on foreground controls or the canvas.
- CSS braces and active-folder whitespace checks pass. Shared Shiny Text assets remain untouched.

#### Limitations and handoff

- Browser visual confirmation remains unavailable under the established local-file/localhost URL security policy. No browser, localhost workaround, or alternative automation was used, so final desktop/mobile composition, motion visibility, and perceived smoothness still require user review.
- The earlier user-observed lack of visible idle motion is addressed by the new wave-field ambient shapes in source, but visual visibility and smoothness are not claimed verified.
- Stage 3 responsive safeguards remain in place; no application logic, analytics, IDs, defaults, radios, onclick, or canvas intrinsic dimensions were changed.

<a id="qa-visualization-intro"></a>

## Historical record: QA VISUALIZATION INTRO

### Visualization intro QA

Date: 2026-09-08

#### Scope

- Moved the existing `../../../images/Tilt_Calculation.png` from the masthead into an absolute `.canvas-intro` overlay inside `.canvas-wrapper`; no duplicate image remains.
- The overlay is pointer-transparent, contained without reflow, and fades over 320ms. The `800x500` canvas remains present and drawable below it from initial load.
- A separate presentation-only `MutationObserver` dismisses the overlay after `#results` becomes nonempty. Invalid input does not mutate empty results and leaves the intro visible. The observer stays active through reduced-motion toggles; a microtask click fallback handles environments without `MutationObserver`.
- Missing or cached-failed images receive a graceful hidden state. Reduced motion removes the fade transition while preserving immediate dismissal behavior.

#### Verification

- Node syntax check passes for `tilt_calculator_motion.js`.
- Intro DOM stubs pass: initial overlay visible; valid nonempty results dismiss once; invalid/no-result state does not dismiss; reduced-motion mode dismisses immediately after valid output; no-`MutationObserver` click/microtask fallback dismisses after the existing click handler; cached image failure hides the overlay.
- Fresh baseline/final DOM calculator harness passes for Macro, Small, building distance `100`, and invalid height `-2`; output and alert behavior match exactly.
- Exact original inline scripts, input tags, radios, `onclick`, and canvas tag remain byte-for-byte/contract identical. The one existing image source is present exactly once.
- CSS balance, fade duration, pointer transparency, canvas positioning, responsive containment, and active-folder whitespace checks pass.

#### Limitations

- Browser visual review remains blocked by the established local-file/localhost URL security policy. No browser or localhost workaround was used; fade perception, image framing, and frame smoothness remain for final user review.
- Shared Shiny Text assets and application/analytics logic remain untouched.

<a id="qa-breathing"></a>

## Historical record: QA BREATHING

### Wave breathing revision QA

Date: 2026-09-08

#### Scope

- Revised only the existing `.wave-field-far::before` and `.wave-field-mid::before` ambient groups. The far group now uses an out-of-phase 7s full scale-opacity cycle; the mid group uses an 8s inverse cycle.
- Ambient wave motion is visibly bounded in source to `scale(0.94)`–`scale(1.06)` with opacity `0.68`–`1` / `0.72`–`1`. Outer parallax/pointer transforms remain on the field wrappers, so breathing does not overwrite scroll or pointer response.
- Foreground inputs, photo intro overlay, canvas, and application logic were not changed. Reduced-motion and hidden-tab pause selectors remain active; no continuous JavaScript frame loop was added.

#### Verification

- CSS static checks confirm both breathing selectors target the new wave groups, durations are exactly 7s and 8s, keyframes are full 0%/50%/100% cycles rather than `alternate`, and reduced/hidden pause selectors cover both groups.
- Node syntax check passes for the unchanged presentation script. Fresh baseline/final calculator DOM checks remain identical for Macro, Small, building distance `100`, and invalid height `-2`.
- Intro behavior remains covered by [QA VISUALIZATION INTRO](#qa-visualization-intro); exact inline scripts, input tags, radios, onclick, and canvas `800x500` contract remain unchanged.
- `git diff --check` and active-folder whitespace checks pass. No shared-library edits were made.

#### Limitation

- Source inspection found no definite root cause for the earlier report that ambient motion appeared static. Browser review remains blocked by the established local-file/localhost URL security policy, so breathing visibility and perceived smoothness are not claimed visually verified and no frame-rate claim is made.


