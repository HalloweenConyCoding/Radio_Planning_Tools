# /impeccable colorize

Category: Refine  
Source: https://impeccable.style/docs/colorize/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Add strategic color to flat monochrome interfaces without using garish AI palettes.

## Use when

- A dashboard, form, or content page works but feels emotionally flat.
- Everything is gray or beige.
- You have a brand hue but the UI does not use it meaningfully.

## How it works

- Reads the brand color, then assigns color where it earns its place.
- Uses the strongest brand expression for primary action.
- Uses muted variants for secondary accents.
- Tints neutrals lightly toward the brand hue for cohesion.
- Prefers OKLCH for perceptual lightness control instead of basic HSL.

## Example prompt

```text
/impeccable colorize the dashboard
```

## Avoid / pitfalls

- Do not let it pick a random AI-style palette if no brand hue exists.
- If the design is already neon/purple/cyan-heavy, run quieter first.
- Do not use it on already colorful interfaces.

## Related commands

`/impeccable bolder`, `/impeccable delight`, `/impeccable quieter`
