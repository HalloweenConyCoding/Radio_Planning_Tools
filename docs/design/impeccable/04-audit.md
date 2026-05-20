# /impeccable audit

Category: Evaluate  
Source: https://impeccable.style/docs/audit/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Run a technical quality check with severity ratings before shipping.

## Use when

- Before release.
- During a quality sprint.
- When accessibility, performance, theming, responsive behavior, or AI-pattern risk needs inspection.

## How it works

- Checks five dimensions: accessibility, performance, theming, responsive behavior, and anti-patterns.
- Scores each dimension from 0 to 4.
- Tags findings from P0 to P3: release blockers, sprint fixes, next-cycle fixes, and polish.
- Documents findings; it does not fix them directly.

## Example prompt

```text
/impeccable audit the checkout flow
```

## Avoid / pitfalls

- Do not confuse audit with critique; audit is implementation quality, critique is design quality.
- Fix P0/P1 issues before polishing P3 items.
- Do not assume responsive and theming are fine without checking.

## Related commands

`/impeccable harden`, `/impeccable optimize`, `/impeccable adapt`, `/impeccable clarify`, `/impeccable critique`
