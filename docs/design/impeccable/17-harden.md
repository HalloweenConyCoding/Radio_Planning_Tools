# /impeccable harden

Category: Harden  
Source: https://impeccable.style/docs/harden/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Make interfaces production-ready against messy real-world data and edge cases.

## Use when

- Before launch.
- Before exposing the UI to new markets or real user data.
- When bugs involve long text, errors, permissions, offline states, i18n, or strange data.

## How it works

- Tests text/data extremes, error scenarios, internationalization, and device/context conditions.
- Adds overflow handling, error UI, i18n-safe layouts, pluralization, sensible fallbacks, skeletons, and empty states.
- Focuses on real-world resilience, not visual novelty.

## Example prompt

```text
/impeccable harden the user profile page for long names
```

## Avoid / pitfalls

- Do not wait for bug reports.
- Do not treat error and empty states as afterthoughts.
- Do not skip i18n-safe layout just because the product is currently English-only.

## Related commands

`/impeccable optimize`, `/impeccable audit`, `/impeccable adapt`, `/impeccable onboard`
