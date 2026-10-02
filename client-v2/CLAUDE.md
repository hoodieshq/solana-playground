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
