# /impeccable critique

Category: Evaluate  
Source: https://impeccable.style/docs/critique/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Review design quality, score the interface, and identify AI-slop signals.

## Use when

- A page is functionally complete and needs an honest design review.
- You need to know whether the UI feels intentional or generic.
- You want priority issues, persona checks, and design questions before shipping.

## How it works

- Runs an LLM design review against design heuristics, persona lenses, cognitive load, emotional journey, and the DO/DON’T catalog.
- Runs a deterministic detector for visible AI-output patterns.
- Merges both into a prioritized report: what works, what fails, what to fix, and what questions remain.

## Example prompt

```text
/impeccable critique the homepage hero
```

## Avoid / pitfalls

- Do not run it on incomplete work full of TODOs.
- Do not ignore the final questions; they often point to the largest design improvement.
- Treat scores as diagnostic, not as a simple grade.

## Related commands

`/impeccable polish`, `/impeccable distill`, `/impeccable bolder`, `/impeccable quieter`, `/impeccable typeset`, `/impeccable layout`, `/impeccable audit`
