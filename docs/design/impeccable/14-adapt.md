# /impeccable adapt

Category: Simplify  
Source: https://impeccable.style/docs/adapt/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Make an existing design work across screens, devices, and contexts without cutting essential features.

## Use when

- A desktop design falls apart on mobile.
- A design must work in tablet, embedded, print, email, or another context.
- The source design is solid, but the responsive/contextual version is not.

## How it works

- Works across breakpoints/fluid layout, touch targets, navigation patterns, and content priority.
- Converts desktop patterns to context-appropriate mobile or smaller-container patterns.
- Preserves critical functionality rather than hiding it because it is inconvenient.

## Example prompt

```text
/impeccable adapt the settings page for mobile
```

## Avoid / pitfalls

- Do not amputate features.
- Do not treat mobile as smaller desktop.
- Run harden afterward because responsive changes reveal edge cases.

## Related commands

`/impeccable polish`, `/impeccable clarify`, `/impeccable layout`, `/impeccable harden`
