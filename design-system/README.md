# Playground design system

shadcn/ui and Tailwind 4 in Playground's tokens. Stock shadcn where it fits. Our own components where Playground does something shadcn does not. Ours are written the way shadcn writes its own: one file in `components/ui`, compound parts, `data-slot` on every part, `cva` variants.

Live: https://solana-playground-ds.vercel.app/design-system/
The product with Studio over it: https://solana-playground-ds.vercel.app/#app

## What is where

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | The tokens. `:root` is paper, `.dark` is the product |
| `src/styles/theme.css` | The tokens as Tailwind utilities, and the product utilities: `frosted`, `gradient-stroke`, `brand-action` |
| `src/components/ui/` | 60 stock shadcn components, untouched, and 26 of ours |
| `src/hooks/use-indicator.ts` | The measured thumb that Stepper and Segmented slide |
| `src/ds/` | The page itself: foundations, one block per component, the migration map |
| `registry.json` | Our components, for `npx shadcn add` |
| `studio/` | Studio's config for Playground, filled in from the `data-slot` names at build time |

## Running it

```bash
npm install
npm run dev
```

## Building and publishing

```bash
bash scripts/site.sh
```

That builds the page, snapshots it, builds `ds-inject.css` and the registry, then puts them on one site with the product and Studio and deploys it to Vercel (hoodies). Use `NO_DEPLOY=1` to assemble only.

The page ships with a snapshot of itself in `index.html`. Studio reads the specimens by fetching the page without running it, so they have to be in the HTML.

## Using ours in client-v2

The tokens first, then any component:

```bash
npx shadcn@latest add https://solana-playground-ds.vercel.app/r/playground-tokens.json
npx shadcn@latest add https://solana-playground-ds.vercel.app/r/stepper.json
```

`playground.json` installs everything at once. Then import `playground-tokens.css` and `playground-theme.css` after `tailwindcss` in the app's CSS, and put `dark` on `<html>`.

Current shadcn needs React 19: it passes `ref` as a plain prop, and React 17 drops it. So client-v2 moves to React 19 before the first component.

## How Studio connects

- The Add tab reads every `[data-ds-block]` on the page. The title is its `h4`, and the specimens are the children of its first `.row`.
- On the product, Studio links `ds-inject.css`, so a specimen added there wears the system's clothes. That stylesheet has no global reset, and its utilities sit outside any layer, so they win over the product's bare element rules.
- Picking anything with a `data-slot` names it by that slot, and its variant by `data-variant`, `data-size` or `data-status`.
- The Design tab's tokens and choices write CSS variables, so everything built on the system follows at once.
