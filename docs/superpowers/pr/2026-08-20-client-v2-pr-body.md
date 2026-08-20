# Playground v2: AI assistant, Solana-brand redesign, and a `client-v2/` home for the fork

One PR replacing #2, #3 and #4. `client/` is back to byte-identical upstream; everything the fork adds lives in `client-v2/`. #2, #3 and #4 will be closed manually once this is reviewed.

<img src="https://raw.githubusercontent.com/hoodieshq/solana-playground/feat/client-v2/docs/design/screenshots/10-client-v2-home.jpg" width="900" alt="Redesigned home in client-v2">

## Why a `client-v2/` folder

`docs/decisions.md` → D5 was open across all three prior PRs: does "client-2" mean a panel bolted onto the existing `client/`, or a separate codebase? It is now resolved as the latter.

- Upstream ships 200+ commits per half-year; keeping `client/` untouched makes syncing a fast-forward instead of a rebase through every file the fork touched.
- `client-v2/` is a complete, standalone copy of the client with the fork's changes applied: `cd client-v2 && yarn install && npx craco start`. No overlay, no aliases, no shared build config with `client/`.
- `client/` is confirmed byte-identical to upstream `master` (`git diff origin/master -- client/` is empty).
- `client-v2/public` is a second submodule entry pointing at the same assets repo (`solana-playground/assets`) as `client/public` — see `.gitmodules`. Both need `git submodule update --init` independently.
- CI and `compose.yaml` still build and serve `client/` only; wiring `client-v2` into either is a deliberate follow-up, not done here.
- Moving the tree surfaced three small script bugs, fixed in place: `CLIENT_PATH` in `client-v2/scripts/utils.mjs` was hardcoded to the old `client` directory name (generator scripts were resolving paths under the wrong tree); a stale `.gitignore` rule still pointed at `client/src/views/sidebar/assistant/...` instead of `client-v2/...`; and `.gitmodules` needed the new `client-v2/public` submodule entry added alongside the existing `client/public` one.

## What is in it

1. **AI assistant panel** (was #2) - sidebar page, a bridge onto the playground, a tool loop with an approval gate inside each state-changing tool; the Demo backend needs no key. Spec: `docs/superpowers/specs/2026-08-19-assistant-panel-design.md`.
2. **Solana-brand redesign** (was #3) - new default theme, floating panels on an 8px grid, rail and explorer restyle, three design iterations documented in `docs/design/`. Spec: `docs/superpowers/specs/2026-08-19-solana-redesign-design.md`.
3. **Assistant polish and bring-any-endpoint provider** (was #4) - focus/ARIA/progress polish, an OpenAI-compatible provider with OpenRouter and Gemini presets, explorer link after deploy.
4. **Docs as shared context** - `CLAUDE.md`, `docs/product-brief.md`, `docs/decisions.md` (D1-D10; D5 is resolved by this PR), `docs/codebase-map.yaml`, research under `docs/research/` and `docs/internal/`.

<img src="https://raw.githubusercontent.com/hoodieshq/solana-playground/feat/client-v2/docs/design/screenshots/11-client-v2-assistant.jpg" width="900" alt="Assistant panel in client-v2">

<img src="https://raw.githubusercontent.com/hoodieshq/solana-playground/feat/client-v2/docs/design/screenshots/08-applied.png" width="900" alt="The assistant proposing and applying a fix to a real build error">

Above: a real failing build against `api.solpg.io`, the compiler's actual error quoted back, a diff proposed, and Apply clicked — the editor line changed as a result.

## Try it in five minutes

```sh
nvm install 22 && nvm use 22
npm i -g yarn@1.22.22
git submodule update --init client-v2/public
./wasm/stub-packages.sh           # stands in for the 6 unbuilt WASM packages
cd client-v2 && yarn install
yarn generate-exports && yarn sync-assistant-context   # both REQUIRED
yarn generate-packages && yarn generate-tutorials
BROWSER=none npx craco start      # http://localhost:3000
```

Then: settings gear -> **Build server URL** -> `SolPg`. Open the assistant (`Ctrl+Shift+A`), pick **Demo**, break something in `lib.rs`, run `build`, ask *"Why did my build fail?"*.

**Do not run `yarn setup`** — it compiles six Rust->WASM packages and takes about an hour; the stub script replaces it in seconds. No Docker and no Rust toolchain needed.

## What is real and what is mocked

- Real: builds against `api.solpg.io`, compiler stderr capture, tool calls, diffs, Apply writing into the editor, deploy to devnet, the explorer link.
- Scripted: the Demo backend's reasoning. Live backends (Anthropic, OpenAI-compatible) need a user-supplied key at runtime; nothing is stored.
- Untested: the Anthropic provider has never run against a real key.

## Not in this PR

- Flow (iteration 3 of the redesign) - concept and plan only, not implemented: `docs/superpowers/specs/2026-08-20-flow-concept-design.md`, `docs/superpowers/plans/2026-08-20-flow-implementation.md`.

<img src="https://raw.githubusercontent.com/hoodieshq/solana-playground/feat/client-v2/docs/design/screenshots/concept/b-flow-build-fails.png" width="900" alt="Flow concept: the build-failure moment as a first-class surface">

- CI / compose for `client-v2` — both still target `client/` only.
- Responsive/tablet layout, a light-theme variant of the redesign, real wallet adapters, MCP grounding.

### Follow-ups from review

- A Reset / Disconnect control in the assistant header (`cancelPending()` + `disconnect()` exist in the store but no UI calls them; a stuck approval currently needs a reload).
- Wrap the project snapshot sent to the model in explicit untrusted-data delimiters and move it out of the `system` role (shared projects are attacker-controlled text).
- Self-host Space Grotesk instead of the runtime Google Fonts `@import` in `src/index.css`.
- `requestApproval` should return `{ id, allowed }` so parallel tool calls label the right card.
- Subscribe `Chat.tsx` to `PgBuildOutput.onDidChange`.
- Wire `client-v2` into CI (type-check, prettier, build).

## Friction log

Collected while working, in `docs/friction-log.md`:

- **Redesign night:** `ThemeParam` couldn't declare a `font` override the defaults machinery already honored; Monaco rejects theme names with spaces, which silently constrained every theme to one word; changing the default theme did nothing for existing browsers because `PgTheme.set` pins the last theme to `localStorage` on every load; `components/Topbar` turned out to be dead code; Monaco's color maps silently mis-render non-hex tokens.
- **Redesign iteration 2:** the sidebar rail buttons are unfocusable `div`s with no `aria-label`; explorer rows don't truncate long filenames; the approval card's Apply/Reject actions scroll out of view with a tall diff instead of staying pinned; native `color-scheme` was never synced to the active theme (now fixed for all themes).
- **Assistant build:** the client discards raw compiler output — only a boolean and a lossy terminal print survive a build, so the assistant needed its own stderr-capture module; build-server paths carry a per-session UUID prefix that has to be stripped before any model or person reads them; Monaco reuses models on reopen, so writing a file open in a tab needs an explicit model sync to refresh.

## Review guide

- Start with `client-v2/src/views/sidebar/assistant/` (new) and `client-v2/src/themes/solana-v2/` (redesign).
- Footprint on pre-existing client files is listed in `docs/decisions.md` D2/D4.
- The consolidation itself (`client/` restored to upstream, `client-v2/` created, script fixes) is the smallest and least risky part of this diff to review; the assistant panel and redesign are where real review time should go.
