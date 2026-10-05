# Design: client-v2 on the design system

Companion to `proposal.md`. This is how the decisions there are carried out.

## How the design system reaches the code

```
Figma --> design-system/ (package) --> registry (built in the repo)
                                          |
                                          | shadcn add
                                          v
client-v2/src/shared/ui --> Base<Name> (slice ui/) --> <Name> (data wired in)
```

The flow runs one way. A change to a shared component is made in
`design-system/` and reinstalled. `shared/ui` holds only installed files, so
the hand-written `shared/ui/gradient-button` moves out.

Work needed on the package as it moves in:

- `registry.json` `registryDependencies` point at
  `https://solana-playground-ds.vercel.app/r/...`. They are rewritten to names
  inside the repo, so an install from the repo never reaches the outside
  host.
- `message-scroller` and `questionnaire` import the runtime package
  `@shadcn/react`, which needs React 19. It becomes a dependency of
  `client-v2` when those two are first installed.
- `combobox` alone is built on `@base-ui/react`. The first ticket that needs
  a combobox decides whether to keep Base UI or rebuild it on Radix, so the
  client carries one set of primitives.
- The fonts (Stack Sans and Manrope in `tokens.css`) load from Google Fonts.
  The dev server sends `Cross-Origin-Embedder-Policy: require-corp`, so
  `client-v2` hosts them itself, beside the code fonts in `public/fonts`.

`client-v2/components.json` maps the aliases: `ui` to `@/shared/ui`, `lib`
to `@/shared/lib`, `hooks` to `@/shared/lib/hooks`. A script reinstalls a
component with `--overwrite`, because the CLI does not overwrite silently.

Components with product names (composer, console drawer, step rail, editor
tabs, terminal, diff, diagnostic, setup list, objective band, achievement)
live in `shared/ui` as a stated exception. They only draw what they are
given. Their connected versions live in the slice that owns the data.

## Tokens and themes

`tokens.css` from the design system is the source of the colour, type,
radius, elevation and motion values. `:root` is light (the design system
calls it paper), and `.dark` is the product.

- The `dark` class goes on `<html>` and follows the theme setting.
  Today only `colorScheme` is set there (`utils/theme/theme.ts`,
  `PgTheme.set`).
- The styled-components theme object is rebuilt from the same values, so
  legacy components and new ones read one palette. The literal colours
  tracked by HOO-1802 move onto those values.
- Two consumers need concrete colour values, not `var(--x)`: Monaco
  (`monaco.editor.defineTheme` in `Monaco.tsx`) and xterm (`theme` in
  `Terminal.tsx`). They read the resolved values through
  `getComputedStyle(document.documentElement)` when the theme changes.

## Tailwind inside Create React App

- `@tailwindcss/postcss` runs through craco's PostCSS config in `file` mode,
  ahead of CRA's own plugins (`postcss-flexbugs-fixes`, `postcss-preset-env`,
  `postcss-normalize`). The `extends` mode appends it after them, which is
  the wrong order.
- PostCSS moves from 8.4.12 to 8.5.16 or newer, which `@tailwindcss/postcss`
  requires.
- Preflight stays off until the last global style is gone.
- `@source` names `src/` explicitly, so Tailwind does not scan `public/`
  (tutorials, crates and grammars, several MB of JSON).
- The production minifier (cssnano 5 in CRA) is checked on Tailwind 4 output
  (`@property`, `@layer`, `color-mix()`) in the first Tailwind ticket.

## The `@/` alias

CRA rewrites `tsconfig.json` and deletes `compilerOptions.paths` on every
start (`react-scripts/scripts/utils/verifyTypeScriptSetup.js`). The alias
therefore lives in `tsconfig.paths.json`, which `tsconfig.json` extends, plus
craco `webpack.alias`, plus the test runner's resolver: Jest
`moduleNameMapper` until vitest lands, then vitest `resolve.alias`.

## The React 19 spike, measured (HOO-1840, 2026-10-01)

Branch `spike/react-19`, two commits, never merged. The same 23-step
Playwright walk-through ran on React 17 and React 19, in development (strict
mode) and as a production build: editor syntax colours, typing, Rust and
TypeScript formatting on Ctrl+S, TypeScript completions and diagnostics,
switching, creating, renaming and deleting files, closing every tab to the
start screen and back, autosave across a reload, Vim mode, the light theme,
the terminal, panel resize, the wallet window, Build. Toasts, lesson
markdown and opening a lesson from the gallery were checked separately.

- **Result:** 23 of 23 steps behave the same, and every screenshot is
  identical pixel for pixel apart from the blinking caret. Toasts keep their
  position and auto-close. Unit tests: 657 of 657.
- **Broke, fixed in the spike:**
  - Two `PgExplorer.init` calls ran side by side and the second failed with
    EEXIST, so the editor never appeared after creating a project. The race
    is old; strict mode's double effect run makes it certain. Fix: run
    `init` calls one after another.
  - 1135 type errors. One `resolutions` line removed a nested `@types/react`
    17; `@types/styled-components` 5.1.36 took out the next 250;
    `types-react-codemod` (`implicit-children`, `scoped-jsx`,
    `useCallback-implicit-any`) fixed 131 in 115 files; about ten manual
    fixes covered the rest.
  - `react-markdown` 8's types assume the global `JSX`. Version 9 (with
    `remark-gfm` 4) passes one child where 8 passed an array, so the
    code-block renderer changed.
- **Broke, not fixed in the spike:** a direct link to a page of a lesson that
  has not been started (`/tutorials/hello-anchor/1`) lands on `/`. The route
  sets the sidebar to Explorer, and its own sidebar listener reads that as
  "the user left a lesson that is not started" and navigates away. On React
  17 the event arrived before `PgTutorial.current` was set and was skipped.
- **Not needed after all:** styled-components 6, a `react-toastify`
  upgrade, lifting the TypeScript pin.
- **Not covered by the walk-through:** a real deploy, the assistant with a
  key, an external wallet, Flow steps after a build.

## The React 19 gate

The unit suite renders React in one file (`LessonRoute.test.tsx`), so a
green unit run says little about a runtime upgrade. The gate is:

1. The end-to-end suite (`client-v2/e2e/`). It is not in CI today, and some
   specs need a server and Postgres. HOO-1856 either adds it or writes the
   gate down as a manual run.
2. A manual walk-through, in development (where effects run twice on first
   mount) and in the production build: the editor (open, switch, rename,
   delete; the start screen and back; format Rust and TypeScript; Vim mode;
   completions; autosave across a reload); the terminal (input, resize, no
   leaked instance: `Terminal.tsx` creates `PgTerm` in a `useMemo`, and
   React runs that factory twice under strict mode); hot reload on the dev
   server (CRA 5 ships `react-refresh` 0.11; the fallback is
   `FAST_REFRESH=false`).

Library work, from the review:

| Library                 | With React 19                                           | Action                             |
| ----------------------- | ------------------------------------------------------- | ---------------------------------- |
| `typescript` `=5.0.4`   | `@types/react` 19 declares TS 5.6                       | Lift the pin (HOO-1855), not first |
| `styled-components` 5.3 | Runs; 5.1.36 types accept React 19                      | Keep 5                             |
| `react-toastify` 9      | `defaultProps` on function components, ignored by 19    | Measured fine in the spike         |
| `react-use-clipboard`   | No release supports React 19                            | Replace in `hooks/useCopy.tsx`     |
| `react-select` 5.5      | Peer range excludes 19                                  | 5.10 or newer                      |
| `re-resizable` 6.9      | Peer range excludes 19. Under today's panels            | 6.11 or newer                      |
| `react-rnd` 10.3        | Works (passes `nodeRef`, so `findDOMNode` is skipped)   | Bump anyway                        |
| Our code                | 20+ `FC` with implicit `children`; 9 global `JSX.` uses | Mechanical fixes                   |

HOO-1772 and HOO-1773 change the Monaco and language-server modules. They do
not land in the same week as the upgrade.
