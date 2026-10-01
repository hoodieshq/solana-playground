# Move client-v2 to the design system, step by step

**Status:** draft for review · **Date:** 2026-10-01 · **Roadmap:**
[UI Migration Roadmap](https://claude.ai/artifact/D98grDhwfC5CGgXCBTLCbH)
(v3, after an independent review against the code) · **Design sources:**
PR #32 `design-system/` at `4fcb29b`, the design roadmap
("Playground design: what's next and the Q4 plan")

## Problem

The designer has shipped a design system in code: shadcn/ui and Tailwind 4
on Playground's tokens, 60 stock components and 26 of ours, in a standalone
Vite package on PR #32. The customer has approved the redesign built on it.
`client-v2` cannot use any of it today:

- It runs React 17. Every design-system component passes `ref` as a plain
  prop (0 `forwardRef` across 86 files, 61 `asChild` uses), which React 17
  drops. The design-system README says the same.
- It styles through styled-components (154 files) and a JS theme object, with
  about 60 hand-written colours. There is no CSS-variable layer for Tailwind
  or shadcn to read.
- Its browser list reaches back to Safari 14 and Chrome 67. Tailwind 4 needs
  Safari 16.4, Chrome 111 and Firefox 128.
- Its code is organised by kind (`components/`, `views/`, `utils/`), so there
  is no agreed place for a new component or a rule about what it may import.

Several people and several Claude Code sessions work on the client at once.
A one-pass rewrite would block them all, and it would land nothing before
Breakpoint (Nov 15-17). The design freeze is Nov 11.

## Goals

1. Every new component is built from the design system, in a known layer,
   once the foundation is in place.
2. Existing code moves when a change touches it and the move is cheap. There
   is a written rule for that call, and both people and agents can apply it.
3. The design system has one source in the repository. `client-v2` installs
   from it and never edits the installed files by hand.
4. The rules live on the `master-2.0` line, where every contributor's agent
   reads them.
5. The new layout is the first screen built this way.

## Non-goals

- Rewriting the client in one pass, or moving every existing component.
- Moving off Create React App. Next is still the long-term shape (D29). It
  is its own decision, and nothing here depends on it.
- Merging PR #32. It stays a reference, and pieces are taken one ticket at a
  time.
- Keeping `client-v2` in sync with the upstream frontend (see decision 2).
- The design system's undesigned parts: search, the project list and
  switcher, input validation, the toast progress bar, the wallet window and
  the phone lesson bar stay on the old code until they are designed.

## Decisions

Each becomes a `docs/decisions.md` entry in the same round as this spec.

1. **Stack.** Tailwind 4, `class-variance-authority`, shadcn/ui on Radix,
   React 19, vitest. **Supersedes D8** (the native theme registry, not
   Tailwind or shadcn). D8's revisit condition, the move off React 17, is
   the step this plan takes.
2. **Upstream.** `client-v2` is not synced with the upstream frontend. When
   something upstream is wanted, it comes in as a feature with its own
   ticket. `client/` stays byte-identical to upstream. The CLAUDE.md sections
   "Merge safety" and "touch pre-existing upstream files as little as
   possible" are rewritten to apply to `client/` and `server/` only, and the
   divergence register is frozen for `client-v2`.
3. **Themes.** Two themes: the design system's dark (the product default)
   and light. Playground, Dracula, the old Solana and the other switchable
   themes are removed. **Amends D9.** The theme setting stays and offers
   the two.
4. **Browsers.** The floor rises to Tailwind 4's: Safari 16.4, Chrome 111,
   Firefox 128, Edge 111. `browserslist.production` changes to match.
5. **Layers.** Feature-sliced design: `app → widgets → features → entities →
   shared`. There is no `pages` layer, because `widgets` plays that role on a
   one-screen IDE. A feature never imports another feature, and two features
   meet in a widget. Cross-imports between entities (`@x`) are not enabled.
   The existing roots (`components/`, `views/`, `utils/`, `hooks/`,
   `providers/`, `commands/`, `effects/` and the rest) are legacy. They sit
   outside the layers, new code may import from them, and the boundary check
   ignores them.
6. **Component pairs.** Our own components come in two parts. `Base<Name>` is
   built from design-system parts and takes everything through props.
   `<Name>` wraps it and connects the data. Design-system components keep
   their shadcn names and never get the prefix. When the design system
   already has a component, it is installed, not rewritten as a Base.
7. **The design system as a package.** `design-system/` moves from PR #32
   onto `master-2.0` as its own package. Its catalogue site replaces a
   Storybook in `client-v2`. Its registry is built from the repository and
   has no links to outside hosts.
8. **The layout waits for React 19.** Its parts, the sidebar and the
   resizable panels, come from the design system (`react-resizable-panels`
   v4 needs React 18 or 19). It is built once, on the new stack, with
   today's panels inside.
9. **Feature folders (D46).** D46 names a feature's React folder
   `Component/`, where feature-sliced design says `ui/`. The rename needs
   Sergey, because D46 came from his review. Until he answers, new slices
   use `ui/` and the two existing features (`auth`, `persistence`) stay as
   they are.

## Architecture

### How the design system reaches the code

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

### Tokens and themes

`tokens.css` from the design system is the source of the colour, type,
radius, elevation and motion values. `:root` is light (the design system
calls it paper), and `.dark` is the product.

- The `dark` class goes on `<html>` and follows the theme setting.
  Today only `colorScheme` is set there (`utils/theme/theme.ts:162`).
- The styled-components theme object is rebuilt from the same values, so
  legacy components and new ones read one palette. HOO-1802's literal
  colours move onto those values.
- Two consumers need concrete colour values, not `var(--x)`: Monaco
  (`monaco.editor.defineTheme` in `Monaco.tsx`) and xterm (`theme` in
  `Terminal.tsx`). They read the resolved values through
  `getComputedStyle(document.documentElement)` when the theme changes.

### Tailwind inside Create React App

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

### The `@/` alias

CRA rewrites `tsconfig.json` and deletes `compilerOptions.paths` on every
start (`react-scripts/scripts/utils/verifyTypeScriptSetup.js:159`). The
alias therefore lives in `tsconfig.paths.json`, which `tsconfig.json`
extends, plus craco `webpack.alias`, plus the test runner's resolver. That
is Jest `moduleNameMapper` until vitest lands, then vitest `resolve.alias`.

## The plan

Two tracks run in parallel after the rules. The tools track is the critical
path. After the spike it is: decisions, the React 19 upgrade (2-3 days),
design-system components, the layout shell. vitest and the TypeScript pin
left the path: React 19 builds, type-checks and passes all 657 tests on Jest
27 and TypeScript 5.0.4.

| Step | Track | Depends on | Done when |
| --- | --- | --- | --- |
| Record the decisions | Rules | - | Entries for decisions 1-9 in `decisions.md`. CLAUDE.md sections on merge safety rewritten |
| Rules every agent reads | Rules | decisions | `client-v2/CLAUDE.md` and `openspec/` on `master-2.0`, content below |
| Layer check in CI | Rules | rules | `eslint-plugin-boundaries` in CRA's ESLint, legacy roots excluded, a violation fails the build |
| Design system into the repo | Design system | - | `design-system/` on `master-2.0`, builds and serves its catalogue |
| Registry that stands alone | Design system | package | No outside URLs in the built registry |
| Jest to vitest (HOO-1715) | Tools, beside the path | decisions | Same test count as Jest on `master-2.0` today (657 tests, 59 suites). No `jest.*` left in `src/` |
| Lift the TypeScript pin | Tools, beside the path | vitest | `typescript` above 5.6. The `=5.0.4` resolution is gone. Monaco's TypeScript features still work (completions, diagnostics, declarations) |
| React 19 spike (HOO-1840) | Tools | decisions | Done 2026-10-01: see "Measured" below |
| React 19 upgrade | Tools | spike | The product looks and behaves the same. The gate below passes |
| DS components in shared UI | Tools | upgrade, registry | The first components a ticket needs are installed through the script |
| Raise the browser floor | Foundation | decisions | `browserslist` updated. Build and bundle checked |
| Tailwind 4 and the alias | Foundation | browsers | Utilities render beside styled-components. Nothing on screen moves. The alias resolves in the build, the editor and tests |
| Token bridge (HOO-1802) | Foundation | Tailwind, package | One palette for both systems. Two themes. Monaco and xterm follow the theme |
| New layout shell (HOO-1793) | Screens | DS components, tokens | The new arrangement with today's panels inside. The responsive breakpoint is agreed |
| Panels move one by one | Screens | shell | One ticket per panel, each by the change rule |
| Breakpoint screens | Screens | panels | What the cut line says, by Nov 11 |
| Global reset on, styled-components out | Screens | last global style | After Breakpoint. Monaco and xterm excluded from preflight or checked on their own |

Until the upgrade lands, new code may use Tailwind utilities and tokens, but
no design-system components.

### The React 19 spike, measured (HOO-1840, 2026-10-01)

Branch `spike/react-19`, two commits, never merged. The same 23-step Playwright
walk-through ran on React 17 and React 19, in development (strict mode) and as
a production build: editor syntax colours, typing, Rust and TypeScript
formatting on Ctrl+S, TypeScript completions and diagnostics, switching,
creating, renaming and deleting files, closing every tab to the start screen
and back, autosave across a reload, Vim mode, the light theme, the terminal,
panel resize, the wallet window, Build. Toasts, lesson markdown and opening a
lesson from the gallery were checked separately.

- **Result:** 23 of 23 steps behave the same, and every screenshot is
  identical pixel for pixel apart from the blinking caret. Toasts keep their
  position and auto-close. Unit tests: 657 of 657.
- **Broke, fixed in the spike:**
  - Two `PgExplorer.init` calls ran side by side and the second failed with
    EEXIST, so the editor never appeared after creating a project. The race is
    old (it surfaced while integrating PR #32). Strict mode's double effect
    run makes it certain. Fix: run `init` calls one after another.
  - 1135 type errors. One `resolutions` line removed a nested
    `@types/react` 17; `@types/styled-components` 5.1.36 took out the next
    250; `types-react-codemod` (`implicit-children`, `scoped-jsx`,
    `useCallback-implicit-any`) fixed 131 in 115 files; about ten manual fixes
    covered the rest.
  - `react-markdown` 8's types assume the global `JSX`. Version 9 (with
    `remark-gfm` 4) passes one child where 8 passed an array, so the code-block
    renderer changed.
- **Broke, not fixed in the spike:** a direct link to a page of a lesson that
  has not been started (`/tutorials/hello-anchor/1`) lands on `/`, in
  development and in production. The route sets the sidebar to Explorer, and
  its own sidebar listener reads that as "the user left a lesson that is not
  started" and navigates away. On React 17 the event arrived before
  `PgTutorial.current` was set and was skipped. Opening and starting a lesson
  from the gallery works.
- **Not needed after all:** styled-components 6 (5.3 runs, and its 5.1.36
  types accept React 19), a `react-toastify` upgrade, lifting the TypeScript
  pin.
- **Not covered by the walk-through:** a real deploy, the assistant with a
  key, an external wallet, Flow steps after a build.

### The React 19 gate

The unit suite renders React in one file (`LessonRoute.test.tsx`), so a
green unit run says little about a runtime upgrade. The gate is:

1. The end-to-end suite (`client-v2/e2e/`, 8 specs). It is not in CI today,
   and some specs need a server and Postgres. The "e2e in CI" ticket either
   adds it or writes the gate down as a manual run.
2. A manual walk-through, in development (where effects run twice on first
   mount) and in the production build:
   - The editor: open, switch, rename and delete files; the start screen
     and back; format Rust and TypeScript; Vim mode; completions; autosave
     across a reload.
   - The terminal: input, resize, and no leaked instance. `Terminal.tsx`
     creates `PgTerm` in a `useMemo`, and React runs that factory twice
     under strict mode.
   - Hot reload on the dev server. CRA 5 ships `react-refresh` 0.11. If it
     fails, the fallback is `FAST_REFRESH=false`.

Known work, from the review:

| Library | With React 19 | Action |
| --- | --- | --- |
| `typescript` `=5.0.4` | `@types/react` 19 declares TS 5.6 | Lift the pin first |
| `styled-components` 5.3 | Likely runs. `@types/styled-components` 5 clashes with `@types/react` 19 | Keep 5 for runtime; types decide whether 6 is needed |
| `react-toastify` 9 | Measured on 19: position, transition and auto-close survive, because `styled(ToastContainer)` renders through styled-components 5's `createElement`, which still resolves `defaultProps` (the JSX runtime does not) | Keep 9. Rendering `ToastContainer` directly, or moving to styled-components 6, would drop its defaults silently; upgrade to 11 then |
| `react-use-clipboard` | No release supports React 19 | Replace in `hooks/useCopy.tsx` |
| `react-select` 5.5 | Peer range excludes 19 | 5.10 or newer |
| `re-resizable` 6.9 | Peer range excludes 19. Under today's panels | 6.11 or newer |
| `react-rnd` 10.3 | Works (passes `nodeRef`, so `findDOMNode` is skipped) | Bump anyway |
| Our code | 20+ `FC` components rely on implicit `children`. 9 global `JSX.` uses. `ReactDOM.render` in `index.tsx` and one test, plus `react-dom/test-utils` `act` | Mechanical fixes |

Sergey's HOO-1772 and HOO-1773 change the Monaco and language-server
modules. They do not land in the same week as the upgrade.

## Rules for contributors and agents

The root CLAUDE.md is kept off code branches, so these rules go into files
that live on `master-2.0`:

- `client-v2/CLAUDE.md`: short, frontend only. Claude Code loads it when it
  works in that folder.
- `openspec/`: the specs and the change proposals that follow this one.

What `client-v2/CLAUDE.md` says:

1. The layers and their import rule, and where the legacy roots sit.
2. The component pair, and "install from the design system when it has the
   component".
3. `shared/ui` is installed, never edited. The reinstall script.
4. Ids, `aria-label`s and test ids survive every move, because the tests
   and the designer's Studio find elements by them. The design system's
   `data-slot` names come with its components. Parts of the file explorer are
   driven directly in the DOM (`utils/explorer/explorer.ts`), so a move there
   keeps the element structure too.
5. The change rule:

```
New component or screen?
  yes -> the design system has it? install it : build a Base + connected pair
  no  -> will the change show, and is it designed?
           no, or no design yet -> fix in place (no design yet: file a design ticket)
           yes -> used in 3 places or fewer, and imports no other UI?
                    yes -> move it whole, in its own commit
                    no  -> extract a Base beside it; the old wrapper stays
```

   Never moved along the way: the Monaco and xterm internals, the runtime
   modules (`utils/js-runtime`, `utils/explorer`, `commands/`), and code
   under an open ticket that has a deadline. When a move is right but costs
   too much now, the agent says so and proposes a ticket. Code that is not
   UI (a hook, a command, a route) follows the layers only when it is new.

6. Until the React 19 upgrade: Tailwind and tokens only, no design-system
   components.

## Tickets

Existing:

- **HOO-1715** Jest to vitest: re-baseline on `master-2.0` (657 tests, 59
  suites; `jest.*` in 33 files, 312 calls) and re-estimate.
- **HOO-1802**: rescope to the token bridge above.
- **HOO-1793**: fold into the layout shell. Settle 1024 px (the ticket)
  against 600 px (the design plan).
- **HOO-1816** stale generated barrels: beside the tools track.

New, filed after the team walk-through: record the decisions; rules every
agent reads; layer check in CI; design system into the repo with a
standalone registry; lift the TypeScript pin; React 19 spike; React 19
upgrade; raise the browser floor; Tailwind 4 and the alias; e2e in CI or a
manual gate; new layout shell; then one ticket per panel.

## Risks

- **The upgrade is late for the freeze.** The design system's own v0 is due
  on Nov 11 too, so the Breakpoint screens are built on a library that is
  still being finished. The cut line is open (below).
- **styled-components types.** If version 5's types cannot live with React
  19's, the upgrade grows to include version 6 across 154 files.
- **Removing themes** is a visible change for users who picked one. The
  setting falls back to dark and says so once.
- **Two sets of primitives** if Base UI stays for the combobox.

## Open questions

1. **The Breakpoint cut line.** If React 19 is not in by early November,
   does Breakpoint ship the new tokens on today's layout, or do we cut
   features to protect the upgrade? For the team walk-through.
2. **Feature folders.** `Component/` or `ui/` (decision 9). For Sergey.
3. **How Sergey's upstream work reaches `client-v2`** under decision 2, for
   example the rust-analyzer LSP. For Sergey.
4. **The read-only editor breakpoint.** 1024 px or 600 px. For Nikita.

## Records

- Roadmap artifact v3, with the dependency diagram, the spike checklist and
  the ticket table.
- The independent review of the roadmap against the code (2026-09-30). Its
  findings are folded into this spec: the browser floor, the layout's
  dependency on React 19, the token bridge, the registry's outside links,
  the TypeScript pin, the library table, the e2e gate, the alias, and the
  corrected test counts.
