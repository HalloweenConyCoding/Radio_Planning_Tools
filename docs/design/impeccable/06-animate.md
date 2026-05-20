# /impeccable animate

Category: Refine  
Source: https://impeccable.style/docs/animate/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Add purposeful motion that communicates state instead of decoration.

## Use when

- The interface feels lifeless.
- State changes are instant, jarring, or unclear.
- Users need visual feedback that clicks, loading, success, and errors are being handled.

## How it works

- Adds entrance/exit motion, state feedback, view transitions, progress/loading motion, and reduced-motion support.
- Uses short disciplined transitions, usually around 200–300ms.
- Animates transform and opacity, not layout properties like width, height, top, or left.
- Adds prefers-reduced-motion fallbacks.

## Example prompt

```text
/impeccable animate the sign-up flow
```

## Avoid / pitfalls

- Do not ask for animation everywhere.
- Do not add bounces or elastic effects for energy alone.
- Do not remove reduced-motion fallbacks.

## Related commands

`/impeccable delight`, `/impeccable overdrive`, `/impeccable polish`
