# Move client-v2 to the design system, step by step

**Status:** in progress - **Opened:** 2026-10-01 - **Design sources:** PR #32
`design-system/` at `4fcb29b`, the design roadmap ("Playground design: what's
next and the Q4 plan")

## Problem

The designer has shipped a design system in code: shadcn/ui and Tailwind 4
on Playground's tokens, 60 stock components and 26 of ours, in a standalone
Vite package on PR #32. The customer has approved the redesign built on it.
`client-v2` cannot use any of it today:

- It runs React 17. Every design-system component passes `ref` as a plain
  prop (0 `forwardRef` across 86 files, 61 `asChild` uses), which React 17
  drops.
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
4. The rules live on `master-2.0`, where every contributor's agent reads
   them.
5. The new layout is the first screen built this way.

## Non-goals

- Rewriting the client in one pass, or moving every existing component.
- Moving off Create React App. Next is still the long-term shape; it is its
  own decision, and nothing here depends on it.
- Merging PR #32. It stays a reference, and pieces are taken one ticket at a
  time.
- Keeping `client-v2` in sync with the upstream frontend (decision 2).
- The design system's undesigned parts: search, the project list and
  switcher, input validation, the toast progress bar, the wallet window and
  the phone lesson bar stay on the old code until they are designed.

## Decisions

1. **Stack.** Tailwind 4, `class-variance-authority`, shadcn/ui on Radix,
   React 19, vitest. This replaces the earlier choice to carry the redesign
   on the app's native theme registry; that choice named the move off
   React 17 as its own revisit condition, and the move is the step this plan
   takes. Create React App stays for now: nothing here needs Next, Tailwind 4
   runs through craco's PostCSS config, and a framework move on top of a
   React move and a styling move would block every parallel stream.
2. **Upstream.** `client-v2` is not synced with the upstream frontend. When
   something upstream is wanted, it comes in as a feature with its own
   ticket. `client/` stays byte-identical to upstream.
3. **Themes.** Two themes: the design system's dark (the product default)
   and light. Playground, Dracula, the old Solana and the other switchable
   themes are removed. The theme setting stays and offers the two; a saved
   theme that is gone falls back to dark, and the product says so once.
4. **Browsers.** The floor rises to Tailwind 4's: Safari 16.4, Chrome 111,
   Firefox 128, Edge 111. `browserslist.production` changes to match.
5. **Layers.** Feature-sliced design: `app -> widgets -> features -> entities -> shared`. There is no `pages` layer, because `widgets` plays that role
   on a one-screen IDE. A feature never imports another feature, and two
   features meet in a widget. Cross-imports between entities (`@x`) are not
   enabled. The existing roots (`components/`, `views/`, `utils/`, `hooks/`,
   `providers/`, `commands/`, `effects/` and the rest) are legacy. They sit
   outside the layers, new code may import from them, and the boundary check
   ignores them.
6. **Component pairs.** Our own components come in two parts. `Base<Name>`
   is built from design-system parts and takes everything through props.
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
9. **Feature folders.** The existing convention from the conversations
   review names a feature's React folder `Component/`, where feature-sliced
   design says `ui/`. The rename needs the reviewer who set the convention.
   Until he answers, new slices use `ui/` and the two existing features
   (`auth`, `persistence`) stay as they are.

The full record of each decision, with what was rejected and what would
reopen it, is in the project's decision log on the documentation branch.

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
2. **Feature folders.** `Component/` or `ui/` (decision 9). For the tech
   lead.
3. **How upstream work reaches `client-v2`** under decision 2, for example
   the rust-analyzer LSP. For the tech lead.
4. **The read-only editor breakpoint.** 1024 px or 600 px. For the designer.
