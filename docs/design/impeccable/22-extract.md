# /impeccable extract

Category: System  
Source: https://impeccable.style/docs/extract/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Consolidate repeated UI patterns into reusable components, tokens, and design-system primitives.

## Use when

- A shipped product has repeated styles or components in many places.
- Button styles, cards, colors, spacing, text styles, or animations have drifted.
- The codebase has accidentally become an informal design system.

## How it works

- Finds repeated literal values and repeated UI patterns.
- Extracts tokens, components, composition patterns, type styles, and animation patterns.
- Only extracts patterns used three or more times with the same intent.
- Migrates call sites in the same pass so duplicated code does not remain.

## Example prompt

```text
/impeccable extract the button styles
```

## Avoid / pitfalls

- Do not extract too early.
- Do not over-generalize.
- Do not extract without migrating old usage.
- Do not combine things that look similar but have different intent.

## Related commands

`/impeccable document`, `/impeccable polish`
