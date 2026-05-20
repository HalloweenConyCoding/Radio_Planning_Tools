# /impeccable shape

Category: Create  
Source: https://impeccable.style/docs/shape/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Produce a design brief through discovery before anyone writes code.

## Use when

- A feature is about to start.
- A ticket is vague.
- You are tempted to write UI code before understanding the user, content, or constraints.

## How it works

- Runs a structured conversation, not code generation.
- Questions cover purpose, users, mental state, content/data, edge cases, design goals, accessibility, localization, and technical constraints.
- Outputs a brief that implementation commands can use as a compass.
- Use craft instead when you want discovery plus direct implementation.

## Example prompt

```text
/impeccable shape a daily digest email preferences page
```

## Avoid / pitfalls

- Do not skip it because it feels slower than coding.
- Do not treat the brief as a rigid spec.
- Avoid generic answers like “standard” or “normal”; specificity is the value.

## Related commands

`/impeccable craft`, `/impeccable`
