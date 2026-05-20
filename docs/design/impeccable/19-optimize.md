# /impeccable optimize

Category: Harden  
Source: https://impeccable.style/docs/optimize/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Diagnose and improve UI performance, from Web Vitals to bundle size.

## Use when

- The interface feels slow.
- LCP, INP, CLS, scrolling, image loading, interaction latency, or bundle size are bad.
- Users report sluggishness.

## How it works

- Works across loading/Web Vitals, rendering, animations, images/assets, and bundle size.
- Measures before and after.
- Quantifies every fix and rolls back changes that do not improve metrics.

## Example prompt

```text
/impeccable optimize the homepage
```

## Avoid / pitfalls

- Do not optimize prematurely when metrics are already good.
- Do not optimize without baseline measurements.
- Do not chase tiny wins with large engineering cost.
- Always re-measure after changes.

## Related commands

`/impeccable harden`, `/impeccable audit`, `/impeccable overdrive`
