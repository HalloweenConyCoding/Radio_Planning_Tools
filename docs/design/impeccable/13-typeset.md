# /impeccable typeset

Category: Refine  
Source: https://impeccable.style/docs/typeset/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Fix typography that feels generic, flat, inconsistent, or accidental.

## Use when

- Hierarchy feels weak.
- Readability is poor.
- Fonts look like defaults.
- Type sizes, weights, or line lengths feel inconsistent.

## How it works

- Evaluates font choices, hierarchy, sizing/scale, readability, and consistency.
- May choose more distinctive typefaces, rebuild the type scale, widen hierarchy contrast, tune line lengths, and remove one-off font values.
- Uses project context from PRODUCT.md to avoid generic font choices.

## Example prompt

```text
/impeccable typeset the article layout
```

## Avoid / pitfalls

- Do not ask for a new font without product/brand context.
- If the problem is cramped spacing rather than text design, run layout instead.
- Fluid clamp scales are more appropriate for marketing/content pages than dense app UIs.

## Related commands

`/impeccable bolder`, `/impeccable polish`, `/impeccable layout`, `/impeccable critique`
