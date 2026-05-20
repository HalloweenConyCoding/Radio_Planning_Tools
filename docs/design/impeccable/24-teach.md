# /impeccable teach

Category: System  
Source: https://impeccable.style/docs/teach/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Teach Impeccable the product strategy and brand context once per project.

## Use when

- Immediately after installing Impeccable in a new project.
- When the product’s brand direction, audience, or voice changes.
- When another command reports that no design context was found.

## How it works

- Writes PRODUCT.md as the strategic file: register, target users, purpose, personality, anti-references, design principles, and accessibility needs.
- Delegates to document to produce DESIGN.md as the visual file.
- Scans README, package.json, components, tokens, and brand assets first.
- Asks only for what it cannot infer, such as users, personality, references, anti-references, and accessibility needs.

## Example prompt

```text
/impeccable teach
```

## Avoid / pitfalls

- Do not skip it for a quick test; other commands will ask context questions anyway.
- Do not give vague answers like “modern and clean.”
- Do not treat PRODUCT.md as immutable; edit it when strategy changes.
- Use named references and anti-references, not only adjectives.

## Related commands

`/impeccable document`, `/impeccable`, `/impeccable live`, `/impeccable typeset`, `/impeccable colorize`
