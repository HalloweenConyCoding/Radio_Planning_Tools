# /impeccable layout

Category: Refine  
Source: https://impeccable.style/docs/layout/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Fix spacing, structure, hierarchy, density, and visual rhythm.

## Use when

- Nothing is technically wrong, but the page feels crowded or flat.
- Everything uses the same padding and rhythm.
- Users do not know where to look first.

## How it works

- Checks spacing scale, visual hierarchy, grid/structure, rhythm, and density.
- Rebuilds spacing, introduces asymmetry when appropriate, reduces monotonous grids, and gives primary actions room.
- Arranges the right elements; it does not decide whether there are too many elements.

## Example prompt

```text
/impeccable layout the settings page
```

## Avoid / pitfalls

- Do not use layout when the real issue is too many elements; run distill first.
- Expect larger diffs if the page has no grid.
- If there is no clear primary action, make a content/product decision first.

## Related commands

`/impeccable distill`, `/impeccable adapt`, `/impeccable critique`, `/impeccable polish`
