# /impeccable document

Category: System  
Source: https://impeccable.style/docs/document/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Generate DESIGN.md to capture the project’s visual system for AI agents.

## Use when

- After teach has created PRODUCT.md.
- A project has enough visual system to document: colors, typography, buttons, cards, or tokens.
- The current DESIGN.md no longer matches the live system.
- Before a large redesign, to capture the current visual baseline.

## How it works

- Scans CSS variables, Tailwind config, CSS-in-JS themes, token files, component source, global styles, and rendered output if available.
- Writes DESIGN.md in a fixed six-section format: Overview, Colors, Typography, Elevation, Components, Do’s and Don’ts.
- Also writes DESIGN.json as a machine-readable sidecar for live-mode design panels.
- Can run in seed mode for projects without implemented tokens.

## Example prompt

```text
/impeccable document
```

## Avoid / pitfalls

- Do not fabricate a full system for a project with no code; use seed mode instead.
- Do not treat DESIGN.md as human-only documentation; commands read it.
- Do not add unsupported top-level sections.
- Do not overwrite an existing DESIGN.md silently.

## Related commands

`/impeccable teach`, `/impeccable extract`, `/impeccable live`, `/impeccable polish`
