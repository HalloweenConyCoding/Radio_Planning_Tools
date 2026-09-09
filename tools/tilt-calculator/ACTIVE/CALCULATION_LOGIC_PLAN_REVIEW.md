# Calculation logic plan review

Date: 2026-09-09

This implementation records the approved correction scope from `CALCULATION_LOGIC_INSPECTION.md`. The existing 2D flat-ground model, static page, UI, motion behavior, site defaults, and Macro/Small visual scaling remain in place.

## Model and validation decisions

- Use one common ground datum. The main angle is mechanical tilt plus electrical tilt; upper and lower edges are main minus and plus half the vertical beam width.
- Require finite antenna height greater than zero; finite mechanical and electrical tilt; vertical and horizontal beam widths strictly between zero and 180 degrees.
- Treat blank building distance as “no building” and ignore building height and depth in both calculation and plotting in that state.
- When building distance is present, require finite positive distance, height, and depth. Zero and negative geometry is rejected.
- Require every derived angle to be strictly inside (-90, 90) degrees. Vertical and backward beam envelopes are rejected as unsupported.
- Validate required derived values and arithmetic results. A finite raw input set that overflows a required intermediate or result is invalid/unrepresentable, rather than a no-hit result.

## Intersection decisions

- Represent each ray with a forward 2D direction vector and generate ground, front-face, and roof candidates.
- Choose the nearest non-negative candidate. Front-face candidates are inclusive at the roof and ground boundaries and have deterministic priority at a shared front corner, so exact front-roof and front-ground corners are classified as front hits.
- Apply only narrow scale-aware tolerances local to the candidate surface and its dimensions. Candidate surfaces are not merged based on a distant ground parameter.
- A ray with no physical candidate returns no hit and retains its direction. No physical hit point is invented for plotting.

## Width and rendering decisions

- Retain the current antenna-local lateral-cut convention: `W = 2 * D * tan(HBW / 2) / cos(main angle)`.
- Report a projected face width only when the main ray’s first intersection includes the front face, including the defined front-corner cases. Otherwise mark the width unavailable with a reason; this does not claim that no RF reaches the building.
- Publish the full result atomically. Invalid recalculation clears prior result text and the canvas before showing the validation alert.
- Give every no-hit direction an independent finite clipping endpoint for the canvas. No-hit rays have no physical landing dot or landing result.

## Required regression coverage

The focused harness will exercise the real calculation entrypoint and draw adapter with an instrumented canvas. It covers baseline and building-face controls, roof and corner intersections, front-vs-roof-vs-ground ordering, horizontal and upward beams, all validation rows, overflow, width availability, valid-to-invalid clearing, both site switches, the 270-case matrix, finite no-hit plot coordinates, and scale-invariance checks where applicable.
