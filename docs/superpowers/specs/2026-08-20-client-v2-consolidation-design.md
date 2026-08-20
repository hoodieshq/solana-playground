# Consolidate the fork's work into `client-v2/` and a single PR

Date: 2026-08-20
Status: approved, ready for planning

## Goal

Replace the three stacked pull requests (#2 assistant panel, #3 redesign,
#4 assistant polish + any-endpoint provider) with one PR against `master`,
and move everything the fork has changed in the frontend into a new
`client-v2/` folder so that `client/` returns to byte-identical upstream.

## Why

- Three stacked PRs (#3 and #4 both based on #2) are hard to review and
  impossible to merge independently.
- Keeping upstream's `client/` untouched makes future syncs with
  `solana-foundation/solana-playground` a plain fast-forward, and makes the
  v2 client an honest, self-contained product folder rather than a diff.

## Current state (verified 2026-08-20)

| PR | Branch | Base | Commits |
| --- | --- | --- | --- |
| #2 | `feat/client-2-ai-assistant` | `master-2.0` (= `master`) | 8 |
| #3 | `feat/client-2-redesign` | `feat/client-2-ai-assistant` | 19 |
| #4 | `feat/client-2-ai-assistant-ui-polish` | `feat/client-2-ai-assistant` | 5 |

- #3 and #4 overlap on exactly two files:
  `client/src/views/sidebar/assistant/Component/ChatItem.tsx` and
  `client/src/views/sidebar/assistant/Component/Connect.tsx`.
- Outside `client/` the branches add only `docs/`, `CLAUDE.md` and
  `wasm/stub-packages.sh`. No server, wasm or CI changes.
- `client/public` is a git submodule (`solana-playground/assets`), clean at
  upstream's commit; the redesign theme lives in `client/src`, not there.
- Untracked locally: `docs/internal/` and `docs/research/`. Both go in.

## Design

### 1. Branch and history

1. `feat/client-v2` branched from `origin/master`.
2. Rebase, in order: #2's 8 commits, #3's 19, #4's 5. The single conflict
   (`ChatItem.tsx`, `Connect.tsx`) is resolved once during the rebase,
   keeping the redesign's styling and the polish's behaviour.
3. One commit adding `docs/internal/` and `docs/research/`.
4. One final mechanical commit, `Move the fork's client into client-v2/`.

History is preserved so the assistant, redesign and provider work remain
readable as they happened, followed by a single move.

### 2. The `client-v2/` layout

- `git mv client client-v2`, then `git checkout origin/master -- client`.
  Acceptance check: `git diff origin/master -- client` is empty.
- `.gitmodules` gains a `client-v2/public` entry pointing at the same
  assets repository and commit; `client/public` keeps its existing entry.
- `client-v2/package.json` keeps the `file:../wasm/*/pkg` dependencies
  unchanged (same directory depth).
- Paths that say `client` and mean the fork's client are updated to
  `client-v2`: `CLAUDE.md`, `docs/codebase-map.yaml` (+ `.html`),
  `docs/product-brief.md` where relevant, the final echo line of
  `wasm/stub-packages.sh`, and any `docs/superpowers` plan that gives
  commands.
- `.github/workflows/*` and `compose.yaml` are **not** touched: they keep
  exercising upstream's `client/`. Adding `client-v2` to CI and compose is
  listed as a follow-up in the PR description.

### 3. The combined PR (#5)

Target `master`. The description covers:

- Why `client-v2/` exists and the rule that `client/` stays upstream.
- The three bodies of work merged in, each with a short summary and a
  link to its spec under `docs/superpowers/specs/`.
- Five-minute local setup (`cd client-v2 && ...`).
- What is real versus mocked in the demo.
- What is *not* included: Flow (iteration 3) is a concept and a plan only.
- The friction log and follow-ups (CI/compose for v2, Flow implementation).

#2, #3 and #4 are closed with a one-line comment linking #5, only after #5
is open and the author has reviewed it.

### 4. Verification before opening the PR

```sh
cd client-v2
yarn install
yarn generate-exports && yarn sync-assistant-context
yarn generate-packages && yarn generate-tutorials
npx tsc --noEmit
BROWSER=none npx craco start
```

Plus screenshots of the redesigned home and the assistant panel from the
running app, attached to the PR. The rebase alone is not evidence.

## Out of scope

- Implementing Flow.
- Any change to `server/`, `wasm/` sources, or the build service.
- Adding `client-v2` to CI or Docker compose.

## Risks

- A second `yarn install` and a duplicated source tree (~1,500 files).
  Accepted: simplicity and reviewability win over deduplication.
- Upstream client changes must be ported to `client-v2` by hand.
  Accepted for now; revisit if upstream syncs become frequent.
