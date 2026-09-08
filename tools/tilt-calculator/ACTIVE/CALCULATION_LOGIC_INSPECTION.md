# ACTIVE Cell Coverage Calculator — calculation logic inspection

Date: 2026-09-09  
Scope: calculation logic only. No HTML, JavaScript, CSS, or calculation implementation was changed.

## Verdict

**Fix the geometry and validation before treating all reported intersections as reliable.** Ordinary downward ground intersections and valid front-face hits work in the checked cases. However, the current calculation misses roof hits, invents horizontal front-face hits above the roof, accepts invalid inputs, and reports a building width even when the modeled main beam never reaches that face.

The smallest suitable correction is to keep the existing straight-ray model, add complete input validation, and replace the separate angle branches with one nearest-surface intersection calculation. A new RF simulation engine is unnecessary for these defects.

## Evidence and boundaries

Inspected [cell_coverage_calculator.html](cell_coverage_calculator.html), principally lines 194–310, plus the numerical values passed to `draw()` and the site-type handler. The calculation is inline; `tilt_calculator_motion.js` observes results for presentation and does not change the equations.

- Executed the **actual inline calculation script**, extracted without editing, in a temporary Node VM harness with input/result DOM stand-ins. Replaced only `draw()` with an argument recorder for the result tests.
- Ran 23 named input cases, plus one valid-then-invalid result-state sequence.
- Compared the main beam with an independently written ray/surface reference over **270 combinations**: antenna height 10/30/50 m; tilt −30/0/5/30/60°; building distance 5/20/100 m; height 5/20/40 m; depth 5/30 m. Results: **219 matches, 15 missed roof intersections, 36 false horizontal front hits, 0 other differences** in this limited matrix.
- Independently calculated the upper/main/lower reference intersections for the example cases below.
- This is source and numerical execution evidence, **not a browser/canvas rendering test**, RF field validation, or exhaustive proof.
- Calculation script SHA-256: `1d21566801bac8b0ac22e791acc11ea9c644012f7143f193944d6a591bc5b42e`.

All examples are synthetic. No personal workspace data was used.

## Model used to judge the results

For the current 2D profile, take the antenna at `(0, HA)`, flat ground at `y = 0`, and the building as the rectangle `[D, D + depth] × [0, height]`. Positive tilt points downward; negative tilt points upward. Distances are horizontal metres, and all heights share the same ground datum.

Within that model:

```text
main angle  = mechanical tilt + electrical tilt
upper angle = main angle − VBW / 2
lower angle = main angle + VBW / 2
ray height at horizontal distance x = HA − x × tan(angle)
```

Those angle and ground-distance formulas are not themselves the main defect. The missing surface checks, invalid-domain handling, and interpretation of the results are.

## Manual test setup

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

## F1 — High: roof intersections are entirely missing

**Evidence:** lines 233–246 only test the front face, then choose ground. Building depth affects `maxX` at line 282 and the drawing, but never the collision calculation. A ray that clears the front edge can subsequently enter the roof.

### Test A: all three rays hit the roof

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

### Test A2: depth must change the answer

Repeat Test A with **Building Depth = 5 m**. The roof now spans **10–15 m**.

- Upper and main rays should clear the entire building and land on the ground at **64.34 m** and **51.96 m**.
- Lower ray should still hit the roof at **14.28 m**.
- Current implementation reports all three on the ground in both tests.

**Proposed logic:** include a roof candidate as well as front and ground candidates; choose the earliest valid intersection along the forward ray. Use depth in the roof interval check.

## F2 — High: horizontal beams hit imaginary wall above the roof

**Evidence:** lines 267–271 declare a front hit whenever a building distance exists. This branch does not check building height.

### Test B: horizontal main ray passes above a short building

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

## F3 — High: missing and invalid inputs produce successful-looking answers

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

## F4 — High: unsupported angles yield backward ground “landings”

**Evidence:** line 228 uses only `angle > 0` before applying `HA / tan(angle)`. It does not establish whether the ray points forward or crosses the tangent singularity.

### Test C: ray points behind the antenna

Baseline plus **Mechanical Tilt = 100°, Electrical Tilt = 0°, VBW = 10°**, building distance empty.

Current upper/main/lower distances: **−2.89 / −5.82 / −8.84 m**, labeled ordinary ground landings. The angles are 95/100/105° and point into the backward half-plane.

Boundary variant: Mechanical **90°**, Electrical **0°**, VBW **6°** gives 87/90/93° and distances **1.73 / 0.00 / −1.73 m**. The vertical main ray alone is meaningful, but the lower ray is backward.

**Proposed logic:** for the present forward-only calculator, validate **all three derived angles** in `−90° < angle < 90°`, and reject an unsupported beam envelope. Alternatively, explicitly support vertical/backward rays with a vector intersection model and correct labels. Do not clamp an invalid angle to a different direction or wrap it modulo 180°.

For supported nearly horizontal rays, preserve the finite calculation when numerically reliable; a large distance is not automatically an error in this flat-ground model. Separate numerical tolerance and display range from physical interception.

## F5 — Medium: “Beam Width on Building” is calculated without a valid main-beam face hit

**Evidence:** lines 290–307 require only a non-empty building distance. The width is independent of whether the main ray hits the ground before the building, clears the roof, or hits the roof later.

### Test D: all modeled rays hit ground before the building

| HA | Mechanical | Electrical | VBW | HBW | Building Distance | Building Height | Building Depth |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 | 30 | 0 | 10 | 60 | 100 | 20 | 30 |

Current ground distances: **64.34 / 51.96 / 42.84 m**. Yet it also prints **“Beam Width on Building: 133.33 m.”** The main-ray height at that plane is **−27.74 m**, below ground.

Test B also prints a width of **53.59 m** at a main-ray height above the short building.

**Expected:** no actual main-beam face-width result in these cases. A hypothetical projected width at distance D may be retained as a separately identified mathematical projection, with the reason it does not lie on the modeled face.

### What is and is not wrong with the width formula

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

## F6 — Medium: an invalid recalculation preserves the previous answer

**Evidence:** the antenna-height guard returns at lines 206–208, before results are cleared at line 220 and before `draw()` runs.

### Test E: valid result followed by invalid height

1. Calculate the unmodified baseline. Main result is **377.19 m**.
2. Change Antenna Height to **−1** and calculate again.
3. Dismiss the height alert.

Current behavior: the old **377.19 m** answer remains, although the inputs no longer describe that calculation. The canvas also receives no new draw call.

**Proposed logic:** validation failure must return an explicit invalid result state. Clear prior output or identify it as a previous result with its original input snapshot. Never present an old result as if it belongs to rejected inputs. Compute a complete result object before replacing the current valid result.

## F7 — Lower priority: “no finite landing” has no finite plot extent

This is a numerical-output contract issue, included because it follows directly from the calculation. It is not a visual redesign request.

**Evidence:** no-landing branches use `(landingX, landingY) = (0, HA)`; line 282 leaves `maxX = 0` if all rays miss and there is no building. Macro scaling divides by that at line 331, producing `Infinity`; line 413 then multiplies zero by infinity, producing `NaN` coordinates.

### Test F: all rays go upward

Baseline plus **Mechanical Tilt = −10°, Electrical Tilt = 0°, VBW = 6°**, building distance empty.

The text correctly reports no landing for −13/−10/−7°. Recorded `maxX` is **0**, so the downstream coordinates are not finite. A zero-width, zero-tilt diagnostic case has the same extent issue if such a mode is permitted. Actual browser drawing behavior was not tested in this audit.

**Proposed logic:** return `hit: null` with a direction for rays that do not hit. Keep the physical result separate from a finite drawing window. Set a positive view extent independently; clip displayed rays to it without calling that artificial endpoint a landing.

## Proposed calculation plan — documentation only

### 1. Define the supported model and validate its inputs

Use the validation contract above and a shared ground datum. Keep mechanical + electrical tilt as the current profile-model approximation; this audit did not validate real 3D antenna pattern rotation. Reject unsupported geometry with a field-specific reason.

Choose explicit policies for zero-distance buildings, zero-width rays, and vertical/backward rays before supporting them. The smallest correction can reject these special configurations.

### 2. Compute candidate intersections using a ray vector

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

### 3. Return geometry separately from messages

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

### 4. Derive the width under the chosen convention

Use a direct, validated width expression. Associate it with the relevant main-beam height and interception result. Distinguish actual face intersection from an infinite-plane projection. Do not use `abs()` to repair invalid distances or widths. Reject or mark unbounded cases explicitly instead of printing enormous finite approximations to a singularity.

### 5. Publish results atomically

Validate → compute all ray intersections → derive applicable widths → verify finite result fields → update the result state. A failed input set must not reuse unlabeled results from a previous set.

### 6. Acceptance checks before any later implementation is considered complete

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

## Physical interpretation limit

This program models selected straight rays and a beamwidth projection. It does not calculate signal strength, diffraction, reflections, penetration, terrain variation, or a link-budget coverage threshold. A beam missing the drawn building is not proof of zero RF service there. Half-power beamwidth describes the angular separation at 3 dB below the pattern peak, rather than a hard signal cutoff; see the primary technical explanation in [Analog Devices, “Phased Array Antenna Patterns—Part 1,” Beamwidth section](https://www.analog.com/en/resources/analog-dialogue/articles/phased-array-antenna-patterns-part1.html).

**Final verdict: fix-then-validate — the largest correctness gap is choosing ground after clearing the building front without checking the roof. No implementation was performed.**
