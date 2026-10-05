# client-v2 layers

What is true of `client-v2/src` today. Changed by `changes/ui-migration`
(decision 5); updated here when task 3 (the layer check) lands.

## Requirements

### New code sits in five layers

New code under `src/` lives in one of `app/`, `widgets/`, `features/`,
`entities/`, `shared/`, and a layer imports only from the layers below it in
that order.

- WHEN a module in `features/<a>` imports from `features/<b>`, THEN that is a
  violation; the two meet in a module under `widgets/`.
- WHEN a module in `entities/<a>` imports from `entities/<b>`, THEN that is a
  violation; cross-imports between entities are not enabled.
- WHEN a module imports a slice through a path other than its door
  (`index.ts` for the browser, `server.mjs` for `api/` routes), THEN that is
  a violation.

### The legacy roots are outside the layers

`components/`, `views/`, `utils/`, `hooks/`, `providers/`, `commands/`,
`effects/`, `routes/`, `settings/`, `themes/`, `frameworks/`, `languages/`,
`tutorials/`, `block-explorers/`, `constants/`, `globals/`, `types/` are
legacy roots.

- WHEN new code imports from a legacy root, THEN that is allowed.
- WHEN new UI is added under a legacy root, THEN that is a violation; it
  belongs in a layer.
- The boundary check ignores imports between legacy roots.

### Feature folders

A slice is `ui/` (React), `model/` (logic, whichever runtime), `lib/` (leaf
helpers), `index.ts` and, when it has routes, `server.mjs`.

- `features/auth` and `features/persistence` keep `Component/` in place of
  `ui/` until the naming is settled (proposal, open question 2).

## Enforcement today

By review and by `client-v2/CLAUDE.md`. There is no lint rule yet; task 3 of
`changes/ui-migration` adds `eslint-plugin-boundaries` and this section
changes to describe it.
