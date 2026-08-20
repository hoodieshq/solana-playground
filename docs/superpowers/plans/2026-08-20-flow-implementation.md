# Flow (Iteration 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (chosen) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** The header becomes a live Write → Build → Deploy → Interact
stepper; each stage is a routed center surface; build errors become a
first-class surface; the terminal auto-minimizes on stage surfaces.

**Architecture:** A new static store (`PgFlow`) derives stage statuses from
events the client already emits; stages are **first-class routes** rendered
through the existing `views/main/primary/<Name>` convention (scout finding:
routes own the center — `routes/common.tsx:52` — so anything that is not a
route gets silently blown away by navigation). Each stage view announces
itself to `PgFlow` on mount, which gives the stepper the read-back that
`setMainPrimary` lacks. No backend changes; deploy machinery is observed,
never modified (`commands/deploy/` churn 47/12mo).

**Tech Stack:** React 17, styled-components v5, existing PgX static-store
patterns (model: `views/sidebar/assistant/bridge/build-output.ts`), CRA
jest for the one pure-logic module.

**Spec:** `docs/superpowers/specs/2026-08-20-flow-concept-design.md` ·
Decision: `docs/decisions.md` D10 · Visual reference (authoritative for
layout/spacing/colors): `docs/design/concept/*.dc.html` boards and
`docs/design/screenshots/concept/*.png`.

## Global Constraints

- Branch: `feat/client-2-redesign`. Commits: present tense, no prefix, no
  co-author trailers, no AI mentions.
- CONTRIBUTING rules: 80 cols, 2-space indent, no `any`/`@ts-ignore`,
  `import type` for types, named exports for non-components, default export
  for React components, no non-ASCII in source, import `PgWeb3` not
  `@solana/web3.js`.
- Theme tokens only — colors come from `theme.colors.*` / Solana V2 tokens,
  never hardcoded hex in components (exception: none).
- Gates per task, in order: `npx tsc --noEmit` clean → dev-server compiles
  ("No issues found") → Playwright screenshot of the affected surface,
  actually looked at.
- Do not modify: `commands/deploy/**`, `views/sidebar/test/**` (hot
  upstream files). Reuse via imports and wrappers only.
- Every task ends with a commit; screenshots for the record go to
  `docs/design/screenshots/flow/`.

---

### Task 1: `PgFlow` — stage state + derived statuses

**Files:**
- Create: `client/src/utils/flow.ts`
- Test: `client/src/utils/flow.test.ts`
- Modify: `client/src/utils/index.ts` (add `export * from "./flow";` —
  verify the barrel exists first; if exports are generated, add to the
  generator's source convention instead)

**Interfaces:**
- Produces (later tasks rely on these exact names):

```ts
export type FlowStage = "write" | "build" | "deploy" | "interact";
export type StageStatus = "upcoming" | "active" | "working" | "done" | "failed";

export class PgFlow {
  /** Which stage surface is open; null = off-loop route (Programs etc.) */
  static get stage(): FlowStage | null;
  static setStage(stage: FlowStage | null): void;
  /** Derived pipeline state, one entry per stage */
  static get statuses(): Record<FlowStage, StageStatus>;
  static onDidChange(cb: () => void): { dispose: () => void };
}
```

- Consumes (verified by scout, use these exact APIs):
  - `PgGlobal.onDidChangeBuildLoading(cb)` / `PgGlobal.onDidChangeDeployState(cb)` (`utils/global.ts`)
  - `PgProgramInfo.onDidChangeUuid` / `onDidChangeIdl` / `onDidChangeLastBuildFailed` / `onDidChangeOnChain` (`utils/program-info.ts`)
  - `PgBuildOutput.onDidChange(cb)` (`views/sidebar/assistant/bridge/build-output.ts` — fires immediately with current value)
  - `PgCommand.deploy.onDidFinish(cb)` (`utils/command.ts:158-181`)

**Status derivation (pure function, this is what the test covers):**

```ts
export const deriveStatuses = (s: {
  stage: FlowStage | null;
  buildLoading: boolean;
  deployState: "ready" | "loading" | "paused" | "cancelled";
  hasBuildArtifact: boolean;   // uuid != null && !lastBuildFailed
  buildFailed: boolean;        // lastBuildFailed || PgBuildOutput.latest?.failed
  deployed: boolean;           // onChain?.deployed === true
  hasIdl: boolean;
}): Record<FlowStage, StageStatus>
```

Rules: `write` is `done` when any later signal exists, else `active`.
`build`: `working` if buildLoading; `failed` if buildFailed; `done` if
hasBuildArtifact; else `upcoming`. `deploy`: `working` if deployState is
"loading"/"paused"; `done` if deployed; `upcoming` otherwise (a failed
deploy returns to `upcoming` + the surface shows the error — deployState
cannot distinguish failure, per scout §2). `interact`: `done`-gated:
`active` when deployed && hasIdl, else `upcoming`. The currently open
stage additionally renders as `active` in the stepper regardless of
pipeline status — that is presentation, keep it in the header component,
NOT in deriveStatuses.

- [ ] **Step 1:** Write `flow.test.ts` — table-driven cases: fresh project
  (write active, rest upcoming); building (build working); build failed;
  built ok; deploying; deployed (+idl → interact active). Run
  `yarn test --watchAll=false flow` — expect FAIL (module missing).
- [ ] **Step 2:** Implement `flow.ts`: `deriveStatuses` + `PgFlow` static
  class subscribing to the six sources above in a `static _init()` called
  lazily on first `onDidChange`; custom event dispatch via
  `PgCommon.createAndDispatchCustomEvent` mirroring `PgBuildOutput`'s
  pattern. Bind nothing to `this` in exported callbacks (session-known
  pitfall: use `PgFlow.` explicitly).
- [ ] **Step 3:** `yarn test --watchAll=false flow` — PASS; `npx tsc --noEmit` — clean.
- [ ] **Step 4:** Commit: `"Add PgFlow stage state derived from build and deploy events"`.

---

### Task 2: Stage routes + stage views (skeletons)

**Files:**
- Create: `client/src/views/main/primary/Build/{Build.tsx,index.ts}`,
  same for `Deploy/`, `Interact/` (skeleton: theme-styled panel with the
  stage name; real content in Tasks 4–6)
- Create: `client/src/routes/build.ts`, `deploy.ts`, `interact.ts` —
  copy the pattern of `client/src/routes/programs.ts` exactly (it already
  passes `minimizeSecondaryMainView: true` — we want that: the "console
  drawer" behavior comes free)
- Modify: `client/src/routes/routes.ts` ONLY if routes are hand-listed
  there; scout says the barrel is generated (`routes/generated.ts`) — in
  that case run `yarn generate-exports` instead and commit nothing extra
- Modify: `client/src/views/main/primary/Default/Default.tsx` (+3 lines)

**Interfaces:**
- Consumes: `PgFlow.setStage` (Task 1).
- Produces: routes `/build`, `/deploy`, `/interact` rendering the three
  views; every stage view (and Default) announces its stage:

```tsx
useEffect(() => {
  PgFlow.setStage("build");
  return () => PgFlow.setStage(null);
}, []);
```

(Default announces `"write"`. Announcement-on-mount is the read-back
mechanism — scout bite #1: `setMainPrimary` has no change event.)

- [ ] **Step 1:** Read `client/src/routes/programs.ts` and
  `routes/common.tsx` `handleRoute` signature; create the three route
  files with `main: { name: "Build" }` etc., `sidebar: "Explorer"`,
  `minimizeSecondaryMainView: true`.
- [ ] **Step 2:** Create the three skeleton views + the `useEffect`
  announcements (including Default's `"write"`).
- [ ] **Step 3:** Regenerate barrels if needed (`yarn generate-exports`);
  `npx tsc --noEmit`; dev server compiles.
- [ ] **Step 4:** Playwright: navigate to `/build`, `/deploy`,
  `/interact` — each renders its skeleton, terminal auto-minimized, back
  button returns to the editor. Screenshot one of them.
- [ ] **Step 5:** Commit: `"Add Build, Deploy and Interact stage routes"`.

---

### Task 3: FlowHeader — the stepper header

**Files:**
- Create: `client/src/app/Panels/FlowHeader/{FlowHeader.tsx,Stepper.tsx,StatusChips.tsx,index.ts}`
- Modify: `client/src/app/Panels/Panels.tsx` (one line: `<FlowHeader />`
  above `<TopWrapper>`; file is quiet — 3 commits/12mo)

**Interfaces:**
- Consumes: `PgFlow.stage/statuses/onDidChange` (Task 1);
  `useRenderOnChange` (`hooks/useRenderOnChange.tsx`); `PgRouter.navigate`;
  `useBalance()` + `PgWallet.current` (`hooks/useBalance.tsx`,
  `utils/wallet/wallet.ts`); `PgConnection.cluster` +
  `PgConnection.onDidChangeCluster`; `PgExplorer.currentWorkspaceName`.
- Visual spec: `docs/design/concept/Main.dc.html` header block (56px, three
  zones), stepper states per `FlowBuild.dc.html` (failed pill with error
  count) and `FlowDeploy.dc.html` (done checks, gradient-dot active).
  Colors/typography via theme tokens; the gradient dot is the brand
  gradient (allowed: rail-active-marker class of use, per D9 policy).

Behavior: click Write → `PgRouter.navigate("/")`; Build/Deploy/Interact →
navigate to their routes. Off-loop routes (`PgFlow.stage === null`): no
stage highlighted, stepper still shows pipeline statuses. Wallet chip
absent wallet → "Not connected" quiet chip, click opens the wallet
(`views/bottom/Wallet/` shows the toggle pattern — reuse its handler
call, do not move the file). Keybinds `Ctrl+1..4` via `useKeybind`
(scout: free, `Ctrl` matches Cmd on macOS).

- [ ] **Step 1:** Build `Stepper.tsx` (pure props: `stage`, `statuses`,
  `onSelect`) + `StatusChips.tsx` + `FlowHeader.tsx` wiring stores.
- [ ] **Step 2:** Mount in `Panels.tsx`. `npx tsc --noEmit`; compile clean.
- [ ] **Step 3:** Playwright walkthrough: fresh load (Write active) →
  run `build` in terminal with the broken fixture → stepper shows
  "Build · failed" red pill live → fix, build ok → green check. Screenshot
  each state to `docs/design/screenshots/flow/`.
- [ ] **Step 4:** Sanity: Playground + Dracula themes render the header
  acceptably (token-driven, no Solana-V2-only assumptions).
- [ ] **Step 5:** Commit: `"Add the Flow header with a live stage stepper"`.

---

### Task 4: Build surface

**Files:**
- Modify: `client/src/views/main/primary/Build/Build.tsx` (replace skeleton)
- Create: `client/src/views/main/primary/Build/parse-stderr.ts` + test
  `parse-stderr.test.ts`

**Interfaces:**
- Consumes: `PgBuildOutput.onDidChange` (+ `.latest`), `PgGlobal.buildLoading`,
  `PgCommand.build` run — verify invocation pattern first (likely
  `PgCommand.build.run()` or `PgTerminal.run` — check
  `views/sidebar/explorer/Component/useExplorerContextMenu.tsx` `runBuild`
  and copy it); `PgView.sidebar.name = "Assistant"` (assignment, no
  setter method — scout §4); `PgRouter.navigate("/")` for "Open in editor".
- Produces: `parseStderr(stderr: string): { code: string | null; message:
  string; file: string | null; line: number | null; col: number | null;
  excerpt: string[] } | null` — first `error[EXXXX]` block; reuse the
  uuid-path stripping logic already proven in the assistant bridge (read
  `views/sidebar/assistant/bridge/build-output.ts` first; import if
  exported, else replicate the regex with a comment pointing there).
- Visual spec: `FlowBuild.dc.html` — headline row, humanized error card
  (code chip, plain-language title from the compiler message, excerpt with
  the offending line marked, "Fix with assistant" gradient CTA, "Open in
  editor", "Show compiler output ▸" collapsible with raw stderr), success
  state = green headline + "nothing to fix" quiet card, building state =
  gradient sweep bar.

- [ ] **Step 1:** `parse-stderr.test.ts` against the real E0308 fixture
  stderr (copy a sample from a live build against `api.solpg.io`, the
  fixture project produces it) — FAIL first, then implement, PASS.
- [ ] **Step 2:** Build the surface UI; states: building / failed /
  success / no-build-yet ("Run your first build" + Build CTA).
- [ ] **Step 3:** Gates + live Playwright pass: broken fixture → `/build`
  shows the card; "Fix with assistant" opens the assistant sidebar;
  Apply → rebuild → success state. Screenshots.
- [ ] **Step 4:** Commit: `"Add the Build stage surface with humanized errors"`.

---

### Task 5: Deploy surface

**Files:**
- Modify: `client/src/views/main/primary/Deploy/Deploy.tsx`

**Interfaces:**
- Consumes: `PgProgramInfo.getPkStr()` / `onDidChangeOnChain` / `.onChain`
  (`{ deployed, upgradable, authority?, programDataLen? }`),
  `PgGlobal.deployState`, `PgCommand.deploy.onDidFinish`, deploy invocation
  (verify like Task 4 via `runDeploy` in the explorer context menu),
  `PgWallet.current`, `PgConnection.cluster`. Explorer URL: search for an
  existing helper first (`grep -ri "explorer.solana.com" client/src`);
  reuse it, else build
  `https://explorer.solana.com/address/${pk}?cluster=devnet` with cluster
  from `PgConnection.getCluster()`.
- Visual spec: `FlowDeploy.dc.html` left card — "Live on devnet" state,
  plus: not-built-yet state (points back to Build), built-but-not-deployed
  state (Deploy gradient CTA + cost note), deploying state (progress),
  failed state (message + assistant hand-off like Task 4).

- [ ] **Step 1:** Implement the four states + wiring.
- [ ] **Step 2:** Gates; Playwright: the not-deployed and (if wallet is
  unfunded, mock-free honesty:) leave the live-deploy screenshot to the
  real demo run — capture whatever states are reachable without SOL.
- [ ] **Step 3:** Commit: `"Add the Deploy stage surface"`.

---

### Task 6: Interact surface (reuse the IDL panel)

**Files:**
- Modify: `client/src/views/main/primary/Interact/Interact.tsx`
- Do NOT touch `views/sidebar/test/**` (18 commits/12mo upstream).

**Interfaces:**
- Consumes: `import Test from "../../../sidebar/test/Component"` (default
  export confirmed at `Test.tsx:209`). Wrapper provides: centered
  `max-width: 720px` column, own padding, and CSS overrides for the two
  sidebar-token couplings scout found (`Test.tsx:151-157` viewport
  padding-bottom; `otherBg` backgrounds in `Interaction.tsx`/
  `CodeResult.tsx`) — override via a styled wrapper that re-declares those
  styles on descendant selectors, with a comment naming the exact
  upstream lines it compensates. Header row per `FlowDeploy.dc.html`
  right panel (title + "generated from your IDL" note).
- Gate states: no idl → points to Build; not deployed → points to Deploy.

- [ ] **Step 1:** Implement wrapper + gate states.
- [ ] **Step 2:** Gates; Playwright screenshot with the counter fixture
  built (instructions list renders).
- [ ] **Step 3:** Commit: `"Add the Interact stage surface reusing the IDL panel"`.

---

### Task 7: Motion pass

**Files:**
- Modify: `client/src/themes/solana-v2/theme.ts` (transition tokens if the
  slot exists — check `theme.default.transition` shape in
  `utils/theme/theme.ts` defaults first; extend, don't replace),
  `FlowHeader/Stepper.tsx`, stage views.

Per the Motion board (`docs/design/screenshots/concept/motion-language.png`):
stage surfaces already crossfade (Primary's built-in `PgCommon.transition`
— verify it fires on route change; if yes this is free); add: gradient
sweep on the active pill while `working` (CSS keyframes, the only loop),
results-rise-in (fade + 8px) on the Build/Deploy cards, one-shot dot pulse
on stage arrival, `prefers-reduced-motion` media query collapsing all of
it to opacity. `transform`/`opacity` only; no `transition: all`.

- [ ] **Step 1:** Implement; gates; screenshot (static) + eyeball the
  sweep live.
- [ ] **Step 2:** Commit: `"Add the Flow motion language"`.

---

### Task 8: Closing audit + docs + PR

- [ ] **Step 1:** `web-design-guidelines` audit over the new files; fix
  in-scope findings, log pre-existing ones to `docs/friction-log.md`.
- [ ] **Step 2:** Full screenshot sweep → `docs/design/screenshots/flow/`
  (all four stages, failed-build moment, header states, theme sanity).
- [ ] **Step 3:** Docs: spec outcome section, D10 status → "implemented",
  friction log entries collected during Tasks 1–7.
- [ ] **Step 4:** Update PR #3 description (new "Iteration 3 — Flow,
  implemented" section, hero = build-fail surface screenshot).
- [ ] **Step 5:** Push.

---

## Self-review notes

- Spec coverage: header/stepper (T3), stage surfaces (T2,4,5,6), console
  drawer (free via `minimizeSecondaryMainView`, T2), status chips (T3),
  motion (T7). **Deliberately dropped from spec scope:** assistant as
  permanent column — stays a sidebar page this iteration (it is one click
  and `Ctrl+Shift+A` away; restructuring `Side/Right` — 17 commits/12mo —
  is the riskiest merge surface for the least demo value). Recorded as the
  spec's 3b horizon; revisit after the demo.
- Files-only explorer (spec: Build/Run/Test buttons leave the explorer):
  also deferred — the stepper makes them redundant but removing them
  touches `Folders.tsx` logic; polish, not core.
- Known risk: `routes/` churn 19/12mo — but we only add files and
  regenerate a barrel; the pattern-copied `handleRoute` call is the single
  coupling point.
