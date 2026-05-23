# DESIGN

## Visual Direction
Technical editorial look with warm neutral surfaces, cool accent signals, and precise component edges. Prioritize clarity and structure over decorative effects.

## Typography
- Display/headline: Sora for confident geometric headings.
- Body/UI: Sora with tighter hierarchy and cleaner rhythm.
- Utility/meta/version labels: IBM Plex Mono.

## Color System
- Base background: soft neutral off-white.
- Surfaces: high-contrast white and tinted section surfaces.
- Accent set: cobalt, sky, mint, green, amber, coral for semantic markers.
- Text: dark slate for primary content, desaturated slate for supporting text.

## Spacing and Layout
- Use larger section containers with intentional vertical rhythm.
- Keep card grids responsive with stable minimum widths.
- Separate section identity using subtle surface and border treatment.

## Components
- Cards: clean panels with restrained depth and stronger hover/focus states.
- Badges/chips: compact metadata cues with semantic colors.
- Legacy list: lower emphasis but still fully readable and navigable.

## Motion
- Small lift/tilt and glow transitions on interactive cards.
- Section reveal remains lightweight.
- Respect `prefers-reduced-motion` by disabling non-essential animation.

## Non-Goals
- No changes to application logic, calculators, data sources, or API behavior.
- No unrelated page redesign beyond the root landing page UI presentation.
