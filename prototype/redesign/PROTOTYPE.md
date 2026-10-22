# Redesign prototype

Nikita Treptsov's redesign of the Playground (PR #32): one chrome, a settings
page, a landing, a deck and a phone layout. It is a design reference, not
product code, and is never merged into `client-v2/`. The product is built on
the design system in `design-system/` instead.

It is a copy of `client-v2/` as it stood at `0912ad90b`, with the redesign's
commits replayed on top, so it shares nothing with `client-v2/` or
`design-system/` on `master`. The redesign's own early draft of the design
system was left out: `design-system/` on `master` is the later version of it.

## Run it

From the repository root, once per checkout:

```sh
wasm/stub-packages.sh
```

Then from this folder:

```sh
yarn install --frozen-lockfile
yarn dev
```
