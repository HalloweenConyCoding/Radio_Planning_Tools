# /impeccable live

Category: System  
Source: https://impeccable.style/docs/live/  
Note: Paraphrased study note based on the public Impeccable docs, not a verbatim copy.

## Purpose

Iterate visually in the browser by selecting an element, generating variants, and accepting one into source.

## Use when

- You want design-tool-like iteration while keeping production code as output.
- A single element needs visual exploration or polish.
- You want three different directions for a hero, card, pricing tier, or similar element.

## How it works

- Opens a picker overlay on the running dev server.
- You select an element, describe intent or choose an action chip, and optionally draw/comment on the element.
- Generates three production-quality variants anchored to different design archetypes.
- Hot-swaps variants through HMR and writes the accepted variant back to source.
- Supports common frameworks such as Vite, Next.js, SvelteKit, Astro, Nuxt, and static HTML.

## Example prompt

```text
/impeccable live
```

## Avoid / pitfalls

- Do not use it for greenfield features; use craft.
- Do not use it for whole-page redesigns; use impeccable or specialized refine commands.
- Do not run it on placeholder content.
- Do not accept changes into generated/build output.
- Run teach and document first when brand fit matters.

## Related commands

`/impeccable teach`, `/impeccable document`, `/impeccable craft`, `/impeccable polish`, `/impeccable bolder`, `/impeccable quieter`, `/impeccable distill`
