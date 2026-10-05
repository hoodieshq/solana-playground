# client-v2: frontend rules

@AGENTS.md

`client-v2` is moving to a design system built on Tailwind 4, shadcn/ui on
Radix and React 19, one change at a time. These rules say where new code goes
and when old code moves. They apply to everyone working in this folder,
people and agents alike.

`client-v2` is not synced with upstream's frontend. Edit any file here as the
work needs. Something wanted from upstream comes in as a feature with its own
ticket. `client/` stays byte-identical to upstream; never edit it.

## Layers

New code lives in five layers under `src/`, and a layer imports only from
the layers below it:

```
app -> widgets -> features -> entities -> shared
```

- **`app`**: startup, providers, the top-level layout. Today `src/app/` holds
  upstream's panel tree; it is the app layer.
- **`widgets`**: a composed part of the screen, such as a panel or a bar.
  There is no `pages` layer: on a one-screen IDE, widgets play that role.
- **`features`**: one user action with its own state, such as signing in or
  syncing a project.
- **`entities`**: a domain object and what reads it, such as a project or a
  conversation.
- **`shared`**: no domain knowledge. `shared/ui` holds design-system
  components, `shared/lib` helpers and `shared/lib/hooks` hooks.

Two rules on top of the direction:

- **A feature never imports another feature.** When two features must meet,
  they meet in a widget that imports both.
- **Entities do not import each other.** Cross-imports (`@x`) are not
  enabled.

A slice's folders: `ui/` for React, `model/` for logic, `lib/` for leaf
helpers, `index.ts` as its door for the browser and `server.mjs` as its door
for `api/` routes. Import a slice through its door, never a deep path.

The two existing features with a React folder, `auth` and `persistence`, keep
`Component/` until the naming is settled; new slices use `ui/`.

**Legacy roots.** `components/`, `views/`, `utils/`, `hooks/`, `providers/`,
`commands/`, `effects/` and the other existing roots sit outside the layers.
New code may import from them. Do not add new UI to them. The boundary check
ignores them.

## Components

**Install before you build.** When the design system has a component, install
it into `shared/ui`. Do not rewrite it.

**Our own components come in pairs:**

- `Base<Name>` is built from design-system parts and takes everything through
  props. It renders with no store, no explorer and no network.
- `<Name>` wraps `Base<Name>` and connects the data.

Both live in the slice that owns the data, under `ui/`. Design-system
components keep their shadcn names and never get the `Base` prefix.

**`shared/ui` is installed, never edited by hand.** A change to a shared
component is made in the design system and reinstalled with the reinstall
script, which overwrites the installed files. (The design system and the
script arrive on this branch with the design-system package.)
`shared/ui/gradient-button` is the one hand-written component there. It leaves
`shared/ui` the next time it is touched: replaced by the design system's
button, or moved to a layer of its own by the change rule.

One exception: components with product names (composer, console drawer, step
rail, editor tabs, terminal, diff, diagnostic, setup list, objective band,
achievement) are installed into `shared/ui`. They only draw what they are
given; their connected versions live in the slice that owns the data.

**Until the React 19 upgrade lands:** Tailwind utilities and tokens only. No
design-system components, because they pass `ref` as a plain prop, which
React 17 drops.

## What survives every move

Ids, `aria-label`s and test ids do not change when code moves: the tests and
the designer's Studio find elements by them. Design-system components bring
their `data-slot` names; keep them.

Parts of the file explorer's tree are driven directly in the DOM by
`src/utils/explorer/explorer.ts`. That module itself is never moved (below);
the explorer's React components may move, but they keep their element
structure, not only the ids.

## The change rule

Apply it to every change that touches UI:

```
New component or screen?
  yes -> the design system has it? install it : build a Base + connected pair
  no  -> will the change show, and is it designed?
           no, or no design yet -> fix in place (no design yet: file a design ticket)
           yes -> used in 3 places or fewer, and imports no other UI of ours?
                    yes -> move it whole, in its own commit
                    no  -> extract a Base beside it; the old wrapper stays
```

Never moved along the way:

- the Monaco and xterm internals;
- the runtime modules: `src/utils/js-runtime`, `src/utils/explorer`,
  `src/commands/`;
- code under an open ticket that has a deadline.

When a move is right but costs too much now, say so and propose a ticket
instead of making it. Code that is not UI (a hook, a command, a route) follows
the layers only when it is new.

## Specs and changes

Planning runs through [OpenSpec](https://openspec.dev). `../openspec/`
holds what the client does (`specs/`) and what we are changing
(`changes/`); `openspec/config.yaml` carries the project constraints every
command below reads. The `/opsx:*` commands are committed in `.claude/`, so
they are available in every session on this repository. The CLI itself is
per machine: `npm i -g @fission-ai/openspec` (or `brew install openspec`),
then `openspec --version` to check.

1. **Think first, with the brainstorming skill.** Anything that changes
   behaviour or touches more than one slice starts as a conversation, not a
   file: `superpowers:brainstorming` for the shape of the work (or
   `/opsx:explore` to read an unfamiliar area of the code first). A bug fix
   with a ticket skips this; the ticket is its proposal.
2. **`/opsx:propose <kebab-name>` writes the change.** It creates
   `openspec/changes/<name>/` with `proposal.md`, the delta specs under
   `specs/<capability>/spec.md`, `design.md` and `tasks.md`, from the
   schema's templates and `config.yaml`'s rules. Do not hand-write these
   files; if one needs changing, `/opsx:update`. The brainstorm's
   conclusions go into the proposal through the command, not beside it.
3. **The proposal is reviewed as a PR before code.** A small change may
   share the PR with its code; a change that needs agreement lands as a
   docs-only PR first. `yarn spec:validate` (CI runs it) must pass.
4. **`/opsx:apply` implements, one task per PR.** It reads `tasks.md`,
   works a task, ticks it. Tick a task only in the PR that lands it, and
   name the task in the PR description. The ordinary PR checklist (section
   "Before a PR") still applies to every task.
5. **`/opsx:archive` closes the change.** When every task is ticked, it
   merges the deltas into `openspec/specs/` and moves the folder to
   `changes/archive/<date>-<name>/`. `specs/` therefore always describes the
   code as it is, never a plan; nothing is back-filled for code that is not
   changing.
6. **Asked to build something, look in `openspec/changes/` first**
   (`openspec list`). If a change covers it, `/opsx:apply` that change and
   say which task. If none does and the work is more than a bug fix, offer
   `/opsx:propose` rather than starting on the code.

## What review keeps finding

Each rule here came back in review more than once. Inside the layers
(`src/{features,shared,entities,widgets}/`) the first four are ESLint errors
and fail the build; the legacy roots are exempt until code moves out of them.

- **Ids come from `src/shared/lib/ids`.** `uuid()` mints one, `isUuid()`
  checks one. Never `crypto.randomUUID()`, never a copied UUID regex, never
  `import ... from "uuid"` anywhere else. `api/*.mjs` cannot import `src/`,
  so it uses the `uuid` package directly; it is the one exception.
- **A `catch` is never empty.** It rethrows, reports through the owning
  feature's diagnostics, or tells the user. A failure that is swallowed on
  purpose still logs why, in the `catch`, so the next reader does not have
  to guess whether it was forgotten.
- **No nested ternaries.** Two or more branches is an `if` chain or a
  `Record` lookup.
- **Imports go through a slice's door**, never a deep path (see Layers).
- **A string that two places must agree on is declared once** and exported,
  preferably as a predicate (`isTruncationNotice`), not as a prefix that each
  caller compares by hand.
- **Mock the network through the test runner** (`jest.spyOn` / `vi.spyOn`,
  `vi.fn`), not by assigning `global.fetch` in each test. On Jest 27 jsdom
  has no `fetch` to spy on, so the assignment is tolerated there and becomes
  a lint error once the suite is on vitest.
- **Do not collapse status codes.** A `429` and a `204` are different
  answers and get different branches. A streamed error is a complete frame
  of its own (`\n\ndata: ...\n\n`), and its test feeds a chunk cut
  mid-frame.
- **Shape state as a type, not as flags.** Four `let`s whose valid
  combinations live in your head are a discriminated union. A result that
  says `skipped` for eight reasons names the reason. A boolean parameter is
  a sign the function wants an options object.
- **A comment names a symbol, never a line number**, and says why, not what.
  When the function changes, its JSDoc is part of the change.
- **One migration per PR**, even while the schema is unshipped. Appending
  to another PR's migration forces everyone on a preview database to roll
  back by hand.

## Before a PR

- **A test for a bug fails first.** Run it against the code before the fix
  and put the failing output, or the commit it failed at, in the PR
  description. A test that passes with the fix reverted proves nothing.
- **Infrastructure needs a reproduced problem.** Before building a proxy,
  a fallback or a migration for a problem someone reported, reproduce it
  live (a probe, a curl, a screenshot, dated) and put that in the PR. A PR
  that solves a problem the repository does not have is closed, not fixed.
- **Run the review agents.** `/pr-review-toolkit:review-pr` before
  `gh pr create`; its four agents (silent failures, type design, test
  coverage, comments) are the four headings every human review here has
  used. What they find is fixed in the same PR.
- **A stacked PR is rebased** whenever the one under it moves. "Needs a
  rebase" is a review verdict here, not a nit.
- `yarn lint`, `yarn check-format`, `yarn test-types` and the unit tests
  are green locally before the push; CI runs the same four.
