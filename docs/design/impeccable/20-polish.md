# /impeccable polish

Category: Harden  
Source: https://impeccable.style/docs/polish/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Run the final quality pass that turns a finished feature into a polished one.

## Use when

- The feature is functionally complete.
- Nothing is broken, but the UI still feels slightly off.
- The feature has drifted from the design system.

## How it works

- Discovers tokens, spacing scale, and shared components.
- Checks visual alignment, spacing, typography, color/contrast, interaction states, transitions, and copy.
- Replaces hard-coded values with tokens and aligns with established components.
- Makes small targeted fixes, not a redesign.

## Example prompt

```text
/impeccable polish the pricing page
```

## Avoid / pitfalls

- Do not polish unfinished work.
- Do not turn polish into redesign.
- Run audit as well because polish catches feel-based issues while audit catches measurable issues.

## Related commands

`/impeccable audit`, `/impeccable typeset`, `/impeccable layout`, `/impeccable distill`, `/impeccable delight`
