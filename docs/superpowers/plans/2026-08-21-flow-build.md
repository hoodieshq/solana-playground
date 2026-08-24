# Flow Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Flow" anatomy in client-v2 today — a header stepper
(Write → Build → Deploy → Interact) driving stage surfaces, a two-tab left
panel, the assistant as a permanent right column, a console drawer, a
New-Workspace gallery, a gear settings overlay, deploy history, and IDL
actions — all composed from the bricks the client already has.

**Architecture:** New files under `client-v2/src/views/flow/` compose existing
components (`EditorWithTabs`, explorer tree, terminal, the assistant panel,
the IDL test panel). A tiny state module derives stepper state from events the
client already emits (`PgBuildOutput.onDidChange`,
`PgCommand.build/deploy.onDidStart/onDidFinish`, `PgProgramInfo`). The only
pre-existing file edited is `app/Panels/Panels.tsx`, which mounts `<Flow />`
unless `?classic` is in the URL.

**Tech Stack:** React 17, TypeScript, styled-components, CRA 5 + craco, Jest
(`yarn test-unit`), `tsc --noEmit` (`yarn test-types`). Theme via
`useTheme()` / `theme.colors.*` tokens (Solana V2 default, D8/D9).

**Spec:** `docs/superpowers/specs/2026-08-21-flow-build-design.md`

## Global Constraints

- All frontend work in `client-v2/`; `client/` stays byte-identical to upstream.
- Only pre-existing file touched: `client-v2/src/app/Panels/Panels.tsx` (one import + one conditional). Record in `docs/decisions.md` (Task 12).
- No backend, build-server, crate-list, deploy or share changes.
- 80 columns, 2-space indent, prettier; no `any`, no `@ts-ignore`; `import type` for types; `PgWeb3` not `@solana/web3.js`; default export for React components, named for everything else; ASCII only in source.
- Colors, radii, fonts come from `theme` (`useTheme()` from `styled-components`, tokens under `theme.colors.default.*`, `theme.default.borderRadius`, `theme.font.code` / `theme.font.other`). Gradient only on the single decisive CTA of a view and the stepper's active marker (D9 gradient policy). Use `GradientButton` from `views/sidebar/assistant/Component` where a gradient CTA is needed.
- State-changing actions stay behind explicit user clicks.
- Commit after every task; present tense, no prefix for client changes; no co-author trailers.
- Run before every commit: `cd client-v2 && yarn test-types`.
- Demo fallback: `http://localhost:3000/?classic` must always render the old layout.

## Skills checkpoints

- Before Task 3, 7, 8 (header, gallery, gear): invoke `frontend-design` for the component build — constrained to the existing tokens; no new palette, no decoration.
- Before Task 7 and Task 3's stepper interaction: invoke `ui-ux-pro-max` and run its navigation/state checklist.
- Task 13: invoke `web-design-guidelines` for the final audit.

## File structure

```
client-v2/src/views/flow/
  index.ts                      export default Flow
  Flow.tsx                      grid: header / left / stage / assistant / console
  state/
    stage.ts                    Stage type, stepper state machine, PgFlow store
    stage.test.ts
    deploy-history.ts           PgDeployHistory store (localStorage per workspace)
    deploy-history.test.ts
  header/
    Header.tsx                  56px bar composing the three zones
    Stepper.tsx                 four stages with four visual states
    StatusChips.tsx             cluster + wallet/balance + gear button
    ProjectSwitcher.tsx         current workspace name -> opens gallery
  left/
    LeftPanel.tsx               tabs Projects | Files
    ProjectsTab.tsx             workspace list + New
  stages/
    StageRouter.tsx             renders the surface for PgFlow.stage
    Write.tsx                   existing EditorWithTabs
    Build.tsx                   report surface + Generate IDL + Export
    build-report.ts             parse stderr -> BuildReport (pure)
    build-report.test.ts
    Deploy.tsx                  result card + history + Upload IDL
    Interact.tsx                deployment switcher + IDL test panel
    IdlActions.tsx              Generate / Upload / Download IDL buttons
  gallery/
    NewWorkspaceModal.tsx       What do you want to build?
    StartFromScratch.tsx        framework row
    TutorialsTab.tsx            PgTutorial.all cards
    ProgramsTab.tsx             upstream programs + view-only ecosystem cards
    ecosystem.ts                the 4 view-only cards (static data)
  settings/
    GearSidebar.tsx             overlay: network, commitment, theme, font, export/import
  console/
    ConsoleDrawer.tsx           terminal in a drawer, Cmd+J
```

---

### Task 1: Stepper state machine (`PgFlow`)

**Files:**
- Create: `client-v2/src/views/flow/state/stage.ts`
- Test: `client-v2/src/views/flow/state/stage.test.ts`

**Interfaces:**
- Consumes: nothing from this plan (pure module + event wiring in `init`).
- Produces:
  - `type Stage = "write" | "build" | "deploy" | "interact"`
  - `type StageStatus = "upcoming" | "active" | "done" | "failed" | "running"`
  - `interface FlowState { stage: Stage; build: StageStatus; deploy: StageStatus; interact: StageStatus; buildErrorCount: number; buildMs: number | null }`
  - `class PgFlow { static get state(): FlowState; static setStage(s: Stage): void; static onDidChange(cb: (s: FlowState) => void): Disposable; static init(): Disposable; static reduce(state: FlowState, event: FlowEvent): FlowState }`
  - `type FlowEvent = { type: "build-start" } | { type: "build-finish"; failed: boolean; errorCount: number; ms: number } | { type: "deploy-start" } | { type: "deploy-finish"; ok: boolean } | { type: "set-stage"; stage: Stage } | { type: "workspace-change" }`

- [ ] **Step 1: Write the failing test**

```ts
// client-v2/src/views/flow/state/stage.test.ts
import { INITIAL_FLOW_STATE, PgFlow } from "./stage";

describe("PgFlow.reduce", () => {
  it("starts on write with everything upcoming", () => {
    expect(INITIAL_FLOW_STATE).toEqual({
      stage: "write",
      build: "upcoming",
      deploy: "upcoming",
      interact: "upcoming",
      buildErrorCount: 0,
      buildMs: null,
    });
  });

  it("build-start marks build running and routes to build", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, { type: "build-start" });
    expect(s.build).toBe("running");
    expect(s.stage).toBe("build");
  });

  it("failed build is failed with a count; deploy stays upcoming", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: true,
      errorCount: 2,
      ms: 2900,
    });
    expect(s.build).toBe("failed");
    expect(s.buildErrorCount).toBe(2);
    expect(s.buildMs).toBe(2900);
    expect(s.deploy).toBe("upcoming");
  });

  it("successful build is done and routes back to write", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: false,
      errorCount: 0,
      ms: 3100,
    });
    expect(s.build).toBe("done");
    expect(s.stage).toBe("write");
  });

  it("deploy-finish ok marks deploy done and interact active", () => {
    const built = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: false,
      errorCount: 0,
      ms: 1,
    });
    const s = PgFlow.reduce(built, { type: "deploy-finish", ok: true });
    expect(s.deploy).toBe("done");
    expect(s.interact).toBe("active");
    expect(s.stage).toBe("deploy");
  });

  it("set-stage only changes the route", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "set-stage",
      stage: "interact",
    });
    expect(s.stage).toBe("interact");
    expect(s.build).toBe("upcoming");
  });

  it("workspace-change resets to the initial state", () => {
    const built = PgFlow.reduce(INITIAL_FLOW_STATE, { type: "build-start" });
    expect(PgFlow.reduce(built, { type: "workspace-change" })).toEqual(
      INITIAL_FLOW_STATE
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client-v2 && yarn test-unit --testPathPattern views/flow/state/stage`
Expected: FAIL — cannot find module `./stage`.

- [ ] **Step 3: Write the implementation**

```ts
// client-v2/src/views/flow/state/stage.ts
import {
  PgBuildOutput,
  stripKnownNoise,
} from "../../sidebar/assistant/bridge/build-output";
import { PgCommand, PgExplorer } from "../../../utils";
import type { Disposable } from "../../../utils";

export type Stage = "write" | "build" | "deploy" | "interact";
export type StageStatus = "upcoming" | "active" | "done" | "failed" | "running";

export interface FlowState {
  stage: Stage;
  build: StageStatus;
  deploy: StageStatus;
  interact: StageStatus;
  buildErrorCount: number;
  buildMs: number | null;
}

export type FlowEvent =
  | { type: "build-start" }
  | { type: "build-finish"; failed: boolean; errorCount: number; ms: number }
  | { type: "deploy-start" }
  | { type: "deploy-finish"; ok: boolean }
  | { type: "set-stage"; stage: Stage }
  | { type: "workspace-change" };

export const INITIAL_FLOW_STATE: FlowState = {
  stage: "write",
  build: "upcoming",
  deploy: "upcoming",
  interact: "upcoming",
  buildErrorCount: 0,
  buildMs: null,
};

export const STAGES: readonly Stage[] = ["write", "build", "deploy", "interact"];

/** Count `error[...]` and `error:` lines the way the terminal does */
export const countErrors = (stderr: string) =>
  stripKnownNoise(stderr)
    .split("\n")
    .filter((l) => /^error(\[|:)/.test(l)).length;

/**
 * The dev loop as state. Pure reducer plus a tiny store; `init` wires the
 * reducer to the events the client already emits.
 */
export class PgFlow {
  static get state(): FlowState {
    return PgFlow._state;
  }

  static setStage(stage: Stage) {
    PgFlow._dispatch({ type: "set-stage", stage });
  }

  static onDidChange(cb: (s: FlowState) => void): Disposable {
    PgFlow._listeners.add(cb);
    cb(PgFlow._state);
    return { dispose: () => PgFlow._listeners.delete(cb) };
  }

  static reduce(state: FlowState, ev: FlowEvent): FlowState {
    switch (ev.type) {
      case "build-start":
        return { ...state, stage: "build", build: "running" };
      case "build-finish":
        return ev.failed
          ? {
              ...state,
              stage: "build",
              build: "failed",
              buildErrorCount: ev.errorCount,
              buildMs: ev.ms,
            }
          : {
              ...state,
              stage: "write",
              build: "done",
              deploy: state.deploy === "upcoming" ? "active" : state.deploy,
              buildErrorCount: 0,
              buildMs: ev.ms,
            };
      case "deploy-start":
        return { ...state, stage: "deploy", deploy: "running" };
      case "deploy-finish":
        return ev.ok
          ? { ...state, stage: "deploy", deploy: "done", interact: "active" }
          : { ...state, stage: "deploy", deploy: "failed" };
      case "set-stage":
        return { ...state, stage: ev.stage };
      case "workspace-change":
        return INITIAL_FLOW_STATE;
    }
  }

  /** Subscribe to client events. Call once from the Flow layout. */
  static init(): Disposable {
    let startedAt = 0;
    const subs: Disposable[] = [
      PgCommand.build.onDidStart(() => {
        startedAt = Date.now();
        PgFlow._dispatch({ type: "build-start" });
      }),
      PgBuildOutput.onDidChange((out) => {
        if (!out) return;
        PgFlow._dispatch({
          type: "build-finish",
          failed: out.failed,
          errorCount: out.failed ? Math.max(1, countErrors(out.stderr)) : 0,
          ms: startedAt ? out.at - startedAt : 0,
        });
      }),
      PgCommand.deploy.onDidStart(() =>
        PgFlow._dispatch({ type: "deploy-start" })
      ),
      PgCommand.deploy.onDidFinish((result) =>
        PgFlow._dispatch({ type: "deploy-finish", ok: result !== undefined })
      ),
      PgExplorer.onDidSwitchWorkspace(() =>
        PgFlow._dispatch({ type: "workspace-change" })
      ),
    ];
    return { dispose: () => subs.forEach((s) => s.dispose()) };
  }

  private static _dispatch(ev: FlowEvent) {
    PgFlow._state = PgFlow.reduce(PgFlow._state, ev);
    for (const cb of PgFlow._listeners) cb(PgFlow._state);
  }

  private static _state: FlowState = INITIAL_FLOW_STATE;
  private static readonly _listeners = new Set<(s: FlowState) => void>();
}
```

Check the exact names before committing: `grep -n "onDidSwitchWorkspace" client-v2/src/utils/explorer/explorer.ts` and `grep -n "onDidFinish" client-v2/src/utils/command.ts`. If `onDidSwitchWorkspace` is named differently, use the explorer's actual workspace-switch event; if `deploy.onDidFinish` passes no result, treat `ok` as `PgProgramInfo.onChain` existing after finish.

- [ ] **Step 4: Run tests**

Run: `cd client-v2 && yarn test-unit --testPathPattern views/flow/state/stage && yarn test-types`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/state/stage.ts client-v2/src/views/flow/state/stage.test.ts
git commit -m "Add the Flow stepper state machine"
```

---

### Task 2: Deploy history store

**Files:**
- Create: `client-v2/src/views/flow/state/deploy-history.ts`
- Test: `client-v2/src/views/flow/state/deploy-history.test.ts`

**Interfaces:**
- Produces:
  - `interface DeployRecord { id: string; workspace: string; cluster: string; programId: string; signature: string | null; at: number }`
  - `class PgDeployHistory { static list(workspace: string): DeployRecord[]; static add(r: Omit<DeployRecord, "id" | "at">): DeployRecord; static latest(workspace: string): DeployRecord | null; static onDidChange(cb: () => void): Disposable; static init(): Disposable }`

- [ ] **Step 1: Write the failing test**

```ts
// client-v2/src/views/flow/state/deploy-history.test.ts
import { PgDeployHistory } from "./deploy-history";

describe("PgDeployHistory", () => {
  beforeEach(() => localStorage.clear());

  it("is empty for an unknown workspace", () => {
    expect(PgDeployHistory.list("none")).toEqual([]);
    expect(PgDeployHistory.latest("none")).toBeNull();
  });

  it("adds records newest-first and persists them", () => {
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "A",
      signature: "s1",
    });
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "B",
      signature: null,
    });
    const list = PgDeployHistory.list("w");
    expect(list.map((r) => r.programId)).toEqual(["B", "A"]);
    expect(PgDeployHistory.latest("w")?.programId).toBe("B");
    expect(JSON.parse(localStorage.getItem("flow.deploys") ?? "[]")).toHaveLength(
      2
    );
  });

  it("notifies listeners on add", () => {
    const cb = jest.fn();
    PgDeployHistory.onDidChange(cb);
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "A",
      signature: null,
    });
    expect(cb).toHaveBeenCalledTimes(2); // once immediately, once on add
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client-v2 && yarn test-unit --testPathPattern deploy-history`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// client-v2/src/views/flow/state/deploy-history.ts
import {
  PgCommand,
  PgConnection,
  PgExplorer,
  PgProgramInfo,
} from "../../../utils";
import type { Disposable } from "../../../utils";

export interface DeployRecord {
  id: string;
  workspace: string;
  cluster: string;
  programId: string;
  signature: string | null;
  at: number;
}

const KEY = "flow.deploys";

/** Every deploy this browser has made, newest first, keyed by workspace. */
export class PgDeployHistory {
  static list(workspace: string): DeployRecord[] {
    return PgDeployHistory._all().filter((r) => r.workspace === workspace);
  }

  static latest(workspace: string): DeployRecord | null {
    return PgDeployHistory.list(workspace)[0] ?? null;
  }

  static add(r: Omit<DeployRecord, "id" | "at">): DeployRecord {
    const record: DeployRecord = {
      ...r,
      id: `${r.programId}-${Date.now()}`,
      at: Date.now(),
    };
    const all = [record, ...PgDeployHistory._all()];
    localStorage.setItem(KEY, JSON.stringify(all));
    for (const cb of PgDeployHistory._listeners) cb();
    return record;
  }

  static onDidChange(cb: () => void): Disposable {
    PgDeployHistory._listeners.add(cb);
    cb();
    return { dispose: () => PgDeployHistory._listeners.delete(cb) };
  }

  /** Record real deploys as they finish. Call once from the Flow layout. */
  static init(): Disposable {
    return PgCommand.deploy.onDidFinish((result) => {
      const programId = PgProgramInfo.getPk()?.toBase58();
      const workspace = PgExplorer.currentWorkspaceName;
      if (!programId || !workspace) return;
      PgDeployHistory.add({
        workspace,
        cluster: PgConnection.cluster,
        programId,
        signature: typeof result === "string" ? result : null,
      });
    });
  }

  private static _all(): DeployRecord[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DeployRecord[];
    } catch {
      return [];
    }
  }

  private static readonly _listeners = new Set<() => void>();
}
```

Verify `PgConnection.cluster` and `PgProgramInfo.getPk()` exist (`grep -n "static get cluster\|getPk" client-v2/src/utils/connection.ts client-v2/src/utils/program-info.ts`); substitute the actual accessor names if they differ.

- [ ] **Step 4: Run tests + types**

Run: `cd client-v2 && yarn test-unit --testPathPattern deploy-history && yarn test-types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/state/deploy-history.ts client-v2/src/views/flow/state/deploy-history.test.ts
git commit -m "Add a per-workspace deploy history store"
```

---

### Task 3: Header with stepper, status chips, project switcher

**Skills:** invoke `frontend-design` (tokens only) and `ui-ux-pro-max` (stepper states/interaction) before writing JSX.

**Files:**
- Create: `client-v2/src/views/flow/header/Header.tsx`, `Stepper.tsx`, `StatusChips.tsx`, `ProjectSwitcher.tsx`

**Interfaces:**
- Consumes: `PgFlow.state/onDidChange/setStage`, `STAGES`, `Stage`, `StageStatus` (Task 1); `useBalance`, `useWallet`, `useConnection` hooks from `hooks/`; `PgExplorer.currentWorkspaceName`.
- Produces: `Header: FC<{ onOpenGallery: () => void; onOpenSettings: () => void }>`; `Stepper: FC<{ state: FlowState; onSelect: (s: Stage) => void }>`.

- [ ] **Step 1: Stepper**

```tsx
// client-v2/src/views/flow/header/Stepper.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import { STAGES } from "../state/stage";
import type { FlowState, Stage, StageStatus } from "../state/stage";

const LABEL: Record<Stage, string> = {
  write: "Write",
  build: "Build",
  deploy: "Deploy",
  interact: "Interact",
};

const statusOf = (state: FlowState, stage: Stage): StageStatus => {
  if (stage === "write") return state.stage === "write" ? "active" : "done";
  return state[stage];
};

interface StepperProps {
  state: FlowState;
  onSelect: (stage: Stage) => void;
}

const Stepper: FC<StepperProps> = ({ state, onSelect }) => (
  <Wrapper role="tablist" aria-label="Development loop">
    {STAGES.map((stage, i) => {
      const status = statusOf(state, stage);
      const selected = state.stage === stage;
      const suffix =
        stage === "build" && status === "failed"
          ? ` · ${state.buildErrorCount} error${
              state.buildErrorCount === 1 ? "" : "s"
            }`
          : "";
      return (
        <Item key={stage}>
          {i > 0 && <Connector $done={statusOf(state, STAGES[i - 1]) === "done"} />}
          <StageButton
            role="tab"
            aria-selected={selected}
            $status={status}
            $selected={selected}
            onClick={() => onSelect(stage)}
          >
            <Dot $status={status} />
            {LABEL[stage]}
            {suffix}
          </StageButton>
        </Item>
      );
    })}
  </Wrapper>
);

export default Stepper;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
`;

const Connector = styled.span<{ $done: boolean }>`
  ${({ theme, $done }) => css`
    width: 1.5rem;
    height: 1px;
    margin: 0 0.25rem;
    background: ${$done
      ? theme.colors.state.success.color
      : theme.colors.default.border};
  `}
`;

const Dot = styled.span<{ $status: StageStatus }>`
  ${({ theme, $status }) => css`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: ${$status === "done"
      ? theme.colors.state.success.color
      : $status === "failed"
      ? theme.colors.state.error.color
      : $status === "running" || $status === "active"
      ? theme.colors.default.primary
      : theme.colors.default.border};
    ${$status === "running" &&
    css`
      animation: pulse 1.2s ease-in-out infinite;
      @keyframes pulse {
        50% {
          opacity: 0.35;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
  `}
`;

const StageButton = styled.button<{ $status: StageStatus; $selected: boolean }>`
  ${({ theme, $status, $selected }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: ${theme.default.borderRadius};
    background: ${$selected ? theme.colors.default.bgSecondary : "transparent"};
    color: ${$status === "upcoming"
      ? theme.colors.default.textSecondary
      : theme.colors.default.textPrimary};
    font: inherit;
    font-size: ${theme.font.other.size.small};
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
    ${$status === "failed" &&
    css`
      border-color: ${theme.colors.state.error.color};
    `}
    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;
```

Check token names once against `client-v2/src/themes/solana-v2/theme.ts` and `utils/theme/interface.ts` (`theme.colors.state.success.color`, `theme.colors.default.primary`, `theme.font.other.size.small`); adjust to the actual names if they differ.

- [ ] **Step 2: StatusChips and ProjectSwitcher**

```tsx
// client-v2/src/views/flow/header/StatusChips.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import { useBalance, useConnection, useWallet } from "../../../hooks";
import { PgCommon } from "../../../utils";

interface StatusChipsProps {
  onOpenSettings: () => void;
}

const StatusChips: FC<StatusChipsProps> = ({ onOpenSettings }) => {
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const { balance } = useBalance();
  const cluster = connection?.rpcEndpoint.includes("devnet")
    ? "devnet"
    : connection?.rpcEndpoint.includes("testnet")
    ? "testnet"
    : connection?.rpcEndpoint.includes("localhost")
    ? "localhost"
    : "custom";

  return (
    <Wrapper>
      <Chip title={connection?.rpcEndpoint}>{cluster}</Chip>
      <Chip>
        {wallet
          ? `${PgCommon.shortenPk(wallet.publicKey)} · ${
              balance === null ? "…" : `${balance.toFixed(2)} SOL`
            }`
          : "no wallet"}
      </Chip>
      <IconButton aria-label="Settings" onClick={onOpenSettings}>
        &#9881;
      </IconButton>
    </Wrapper>
  );
};

export default StatusChips;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Chip = styled.span`
  ${({ theme }) => css`
    padding: 0.25rem 0.625rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const IconButton = styled.button`
  ${({ theme }) => css`
    width: 2rem;
    height: 2rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    cursor: pointer;
    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;
```

```tsx
// client-v2/src/views/flow/header/ProjectSwitcher.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import { useRenderOnChange } from "../../../hooks";
import { PgExplorer } from "../../../utils";

interface ProjectSwitcherProps {
  onOpenGallery: () => void;
}

const ProjectSwitcher: FC<ProjectSwitcherProps> = ({ onOpenGallery }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  return (
    <Button onClick={onOpenGallery} aria-haspopup="dialog">
      {PgExplorer.currentWorkspaceName ?? "No project"} <Caret>&#9662;</Caret>
    </Button>
  );
};

export default ProjectSwitcher;

const Button = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const Caret = styled.span`
  opacity: 0.6;
`;
```

Verify hook signatures with `sed -n '1,40p' client-v2/src/hooks/useBalance.tsx client-v2/src/hooks/useWallet.tsx client-v2/src/hooks/useConnection.tsx` and `PgCommon.shortenPk` / the explorer's workspace-switch event name; adapt.

- [ ] **Step 3: Header**

```tsx
// client-v2/src/views/flow/header/Header.tsx
import { FC, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ProjectSwitcher from "./ProjectSwitcher";
import StatusChips from "./StatusChips";
import Stepper from "./Stepper";
import { INITIAL_FLOW_STATE, PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";

interface HeaderProps {
  onOpenGallery: () => void;
  onOpenSettings: () => void;
}

const Header: FC<HeaderProps> = ({ onOpenGallery, onOpenSettings }) => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  useEffect(() => PgFlow.onDidChange(setState).dispose, []);

  return (
    <Bar>
      <Zone>
        <Logo aria-hidden>&#9673;</Logo>
        <ProjectSwitcher onOpenGallery={onOpenGallery} />
      </Zone>
      <Zone $center>
        <Stepper state={state} onSelect={PgFlow.setStage} />
      </Zone>
      <Zone $end>
        <StatusChips onOpenSettings={onOpenSettings} />
      </Zone>
    </Bar>
  );
};

export default Header;

const Bar = styled.header`
  ${({ theme }) => css`
    height: 3.5rem;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 0.75rem;
    background: ${theme.colors.default.bgPrimary};
    border-bottom: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.other.family};
  `}
`;

const Zone = styled.div<{ $center?: boolean; $end?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: ${({ $center, $end }) =>
    $center ? "center" : $end ? "flex-end" : "flex-start"};
`;

const Logo = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.primary};
    font-size: 1.25rem;
  `}
`;
```

- [ ] **Step 4: Types**

Run: `cd client-v2 && yarn test-types`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/header
git commit -m "Add the Flow header: stepper, status chips, project switcher"
```

---

### Task 4: Flow layout, stage router, console drawer, and the Panels entry point

**Files:**
- Create: `client-v2/src/views/flow/Flow.tsx`, `index.ts`, `stages/StageRouter.tsx`, `stages/Write.tsx`, `console/ConsoleDrawer.tsx`, `left/LeftPanel.tsx`, `left/ProjectsTab.tsx`
- Modify: `client-v2/src/app/Panels/Panels.tsx` (import + conditional, ~3 lines)

**Interfaces:**
- Consumes: `Header` (Task 3), `PgFlow`, `PgDeployHistory.init`. Existing: `EditorWithTabs` from `components/`, the explorer tree component (`views/sidebar/explorer/Component/Folders` + `Workspaces`), `Terminal` from `views/main/secondary/terminal/Component`, assistant panel component from `views/sidebar/assistant/Component`.
- Produces: `Flow` default export; placeholder `Build`/`Deploy`/`Interact` components replaced in Tasks 5–6; `useKeybind("Ctrl+J")` drawer toggle.

- [ ] **Step 1: Stage surfaces router with placeholders**

```tsx
// client-v2/src/views/flow/stages/Write.tsx
import EditorWithTabs from "../../../components/EditorWithTabs";

const Write = () => <EditorWithTabs />;

export default Write;
```

```tsx
// client-v2/src/views/flow/stages/StageRouter.tsx
import { FC, lazy, Suspense } from "react";

import Write from "./Write";
import { Loading } from "../../../components/Loading";
import type { Stage } from "../state/stage";

const Build = lazy(() => import("./Build"));
const Deploy = lazy(() => import("./Deploy"));
const Interact = lazy(() => import("./Interact"));

interface StageRouterProps {
  stage: Stage;
}

const StageRouter: FC<StageRouterProps> = ({ stage }) => (
  <Suspense fallback={<Loading />}>
    {stage === "write" && <Write />}
    {stage === "build" && <Build />}
    {stage === "deploy" && <Deploy />}
    {stage === "interact" && <Interact />}
  </Suspense>
);

export default StageRouter;
```

Create temporary `Build.tsx`, `Deploy.tsx`, `Interact.tsx` each rendering `<div>Build</div>` etc. — replaced in Tasks 5–6.

- [ ] **Step 2: Console drawer**

```tsx
// client-v2/src/views/flow/console/ConsoleDrawer.tsx
import { FC, useState } from "react";
import styled, { css } from "styled-components";

import Terminal from "../../main/secondary/terminal/Component/Terminal";
import { useKeybind } from "../../../hooks";

const ConsoleDrawer: FC = () => {
  const [open, setOpen] = useState(false);
  useKeybind("Ctrl+J", () => setOpen((o) => !o));

  return (
    <Wrapper $open={open}>
      <Handle
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Console {open ? "▾" : "▴"}
        <Hint>Cmd+J</Hint>
      </Handle>
      <Body $open={open}>
        <Terminal />
      </Body>
    </Wrapper>
  );
};

export default ConsoleDrawer;

const Wrapper = styled.div<{ $open: boolean }>`
  ${({ theme }) => css`
    border-top: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
    display: flex;
    flex-direction: column;
  `}
`;

const Handle = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 1.75rem;
    padding: 0 0.75rem;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    cursor: pointer;
    text-align: left;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const Hint = styled.span`
  margin-left: auto;
  opacity: 0.6;
`;

const Body = styled.div<{ $open: boolean }>`
  height: ${({ $open }) => ($open ? "16rem" : "0")};
  overflow: hidden;
  transition: height 320ms cubic-bezier(0.2, 0, 0, 1);
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
```

The terminal must stay mounted (xterm keeps its buffer), hence height-collapse not unmount. Verify `useKeybind` signature in `hooks/useKeybind.tsx` and `Terminal` default export path.

- [ ] **Step 3: Left panel**

```tsx
// client-v2/src/views/flow/left/ProjectsTab.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import { useRenderOnChange } from "../../../hooks";
import { PgExplorer } from "../../../utils";

interface ProjectsTabProps {
  onNew: () => void;
}

const ProjectsTab: FC<ProjectsTabProps> = ({ onNew }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  const names = PgExplorer.allWorkspaceNames ?? [];
  const current = PgExplorer.currentWorkspaceName;

  return (
    <Wrapper>
      <List>
        {names.map((name) => (
          <Row
            key={name}
            $active={name === current}
            onClick={() => PgExplorer.switchWorkspace(name)}
          >
            {name}
          </Row>
        ))}
      </List>
      <NewButton onClick={onNew}>+ New project</NewButton>
    </Wrapper>
  );
};

export default ProjectsTab;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Row = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    text-align: left;
    padding: 0.5rem 0.625rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: ${$active ? theme.colors.default.bgSecondary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;
    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const NewButton = styled.button`
  ${({ theme }) => css`
    margin: 0.5rem;
    padding: 0.625rem;
    border: 1px dashed ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;
    &:hover {
      border-color: ${theme.colors.default.primary};
    }
  `}
`;
```

```tsx
// client-v2/src/views/flow/left/LeftPanel.tsx
import { FC, useState } from "react";
import styled, { css } from "styled-components";

import ProjectsTab from "./ProjectsTab";
import Folders from "../../sidebar/explorer/Component/Folders";

type Tab = "projects" | "files";

interface LeftPanelProps {
  onNewProject: () => void;
}

const LeftPanel: FC<LeftPanelProps> = ({ onNewProject }) => {
  const [tab, setTab] = useState<Tab>("files");
  return (
    <Wrapper>
      <Tabs role="tablist">
        {(["projects", "files"] as const).map((t) => (
          <TabButton
            key={t}
            role="tab"
            aria-selected={tab === t}
            $active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "projects" ? "Projects" : "Files"}
          </TabButton>
        ))}
      </Tabs>
      <Body>
        {tab === "projects" ? <ProjectsTab onNew={onNewProject} /> : <Folders />}
      </Body>
    </Wrapper>
  );
};

export default LeftPanel;

const Wrapper = styled.aside`
  ${({ theme }) => css`
    width: 14.5rem;
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
  `}
`;

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    flex: 1;
    padding: 0.625rem;
    border: none;
    border-bottom: 2px solid
      ${$active ? theme.colors.default.primary : "transparent"};
    background: transparent;
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  overflow: hidden;
`;
```

Check `Folders` renders standalone (it reads `PgExplorer` directly); if it needs the explorer page wrapper, import the explorer page's Component instead.

- [ ] **Step 4: Flow layout**

```tsx
// client-v2/src/views/flow/Flow.tsx
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import Header from "./header/Header";
import LeftPanel from "./left/LeftPanel";
import StageRouter from "./stages/StageRouter";
import { PgDeployHistory } from "./state/deploy-history";
import { INITIAL_FLOW_STATE, PgFlow } from "./state/stage";
import type { FlowState } from "./state/stage";
import Assistant from "../sidebar/assistant/Component";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { PgView } from "../../utils";

const Flow = () => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    const subs = [PgFlow.init(), PgDeployHistory.init(), PgFlow.onDidChange(setState)];
    return () => subs.forEach((s) => s.dispose());
  }, []);

  // Gallery and settings are wired in Tasks 7 and 8; until then they no-op.
  const openGallery = () => PgView.setModal(null);
  const openSettings = () => undefined;

  return (
    <Wrapper>
      <Header onOpenGallery={openGallery} onOpenSettings={openSettings} />
      <Columns $assistant={assistantOpen}>
        <LeftPanel onNewProject={openGallery} />
        <Center>
          <Stage>
            <StageRouter stage={state.stage} />
          </Stage>
          <ConsoleDrawer />
        </Center>
        <Right $open={assistantOpen}>
          <Collapse
            type="button"
            aria-label={assistantOpen ? "Collapse assistant" : "Expand assistant"}
            onClick={() => setAssistantOpen((o) => !o)}
          >
            {assistantOpen ? "›" : "‹"}
          </Collapse>
          {assistantOpen && <Assistant />}
        </Right>
      </Columns>

      <Wallet />
      <PortalAbove id={PgView.ids.PORTAL_ABOVE} />
      <StyledModalBackdrop />
      <PortalBelow id={PgView.ids.PORTAL_BELOW}>
        <Toast />
      </PortalBelow>
    </Wrapper>
  );
};

export default Flow;

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const Columns = styled.div<{ $assistant: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr ${({ $assistant }) =>
      $assistant ? "21.75rem" : "1.5rem"};
  overflow: hidden;
`;

const Center = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const Stage = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Right = styled.aside<{ $open: boolean }>`
  ${({ theme }) => css`
    position: relative;
    border-left: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `}
`;

const Collapse = styled.button`
  ${({ theme }) => css`
    position: absolute;
    top: 0.5rem;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    z-index: 1;
  `}
`;

const PortalAbove = styled.div`
  z-index: 4;
`;
const StyledModalBackdrop = styled(ModalBackdrop)`
  z-index: 3;
`;
const PortalBelow = styled.div`
  z-index: 2;
`;
```

```ts
// client-v2/src/views/flow/index.ts
export { default } from "./Flow";
```

Confirm the assistant panel's component export (`ls client-v2/src/views/sidebar/assistant/Component/index.ts`) and that it renders without the sidebar page wrapper; if it expects `PgView` sidebar state, render the assistant's inner `Assistant.tsx` directly.

- [ ] **Step 5: Panels entry point (the one upstream edit)**

In `client-v2/src/app/Panels/Panels.tsx`, add at the top:

```tsx
import Flow from "../../views/flow";

const useClassic = new URLSearchParams(window.location.search).has("classic");
```

and change the component to:

```tsx
const Panels = () =>
  useClassic ? (
    <Wrapper>{/* existing body unchanged */}</Wrapper>
  ) : (
    <Flow />
  );
```

Keep the existing JSX inside the `useClassic` branch verbatim.

- [ ] **Step 6: Run it**

Run: `cd client-v2 && yarn test-types && BROWSER=none npx craco start` (background), open `http://localhost:3000` and `http://localhost:3000/?classic`.
Expected: Flow renders header + left tabs + editor + collapsed console + assistant; classic renders the old layout. Build from the terminal (Cmd+J) and watch the stepper turn Build running → failed/done.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow client-v2/src/app/Panels/Panels.tsx
git commit -m "Mount the Flow layout with a classic fallback"
```

---

### Task 5: Build surface and report parser

**Files:**
- Create: `client-v2/src/views/flow/stages/build-report.ts`, `build-report.test.ts`, `stages/Build.tsx` (replace placeholder), `stages/IdlActions.tsx`

**Interfaces:**
- Consumes: `PgBuildOutput`, `stripKnownNoise`, `PgFlow.state`, `PgAssistant.addUserMessage` (assistant store; check it triggers a send or whether a `PgAssistant.send`-like entry exists — if only the composer can send, expose `PgAssistant.setDraft(text)` by adding a `draft` field to the store, a 6-line change inside our own assistant code).
- Produces: `parseBuildReport(stderr: string): BuildReport` where `interface BuildDiagnostic { code: string | null; title: string; file: string | null; line: number | null; col: number | null; excerpt: string }` and `interface BuildReport { diagnostics: BuildDiagnostic[]; raw: string }`; `IdlActions: FC<{ showGenerate?: boolean; showUpload?: boolean }>`.

- [ ] **Step 1: Parser test**

```ts
// client-v2/src/views/flow/stages/build-report.test.ts
import { parseBuildReport } from "./build-report";

const STDERR = `Compiling hello v0.1.0
error[E0308]: mismatched types
  --> src/lib.rs:12:18
   |
12 |         let x: u64 = "1";
   |                ---   ^^^ expected \`u64\`, found \`&str\`
   |                |
   |                expected due to this

error: could not compile \`hello\` due to previous error`;

describe("parseBuildReport", () => {
  it("extracts code, title, location and excerpt", () => {
    const r = parseBuildReport(STDERR);
    expect(r.diagnostics).toHaveLength(1);
    const d = r.diagnostics[0];
    expect(d.code).toBe("E0308");
    expect(d.title).toBe("mismatched types");
    expect(d.file).toBe("src/lib.rs");
    expect(d.line).toBe(12);
    expect(d.col).toBe(18);
    expect(d.excerpt).toContain('let x: u64 = "1";');
  });

  it("returns no diagnostics for a clean build", () => {
    expect(parseBuildReport("Compiling hello\nFinished").diagnostics).toEqual(
      []
    );
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `cd client-v2 && yarn test-unit --testPathPattern build-report`
Expected: FAIL — module not found.

- [ ] **Step 3: Parser**

```ts
// client-v2/src/views/flow/stages/build-report.ts
import { stripKnownNoise } from "../../sidebar/assistant/bridge/build-output";

export interface BuildDiagnostic {
  code: string | null;
  title: string;
  file: string | null;
  line: number | null;
  col: number | null;
  excerpt: string;
}

export interface BuildReport {
  diagnostics: BuildDiagnostic[];
  raw: string;
}

const HEADER = /^error(?:\[(E\d+)\])?: (.+)$/;
const LOCATION = /^\s*--> (.+?):(\d+):(\d+)\s*$/;

/** Split rustc's stderr into one entry per `error` block. */
export const parseBuildReport = (stderr: string): BuildReport => {
  const raw = stripKnownNoise(stderr);
  const lines = raw.split("\n");
  const diagnostics: BuildDiagnostic[] = [];
  let current: BuildDiagnostic | null = null;
  let excerpt: string[] = [];

  const flush = () => {
    if (!current) return;
    current.excerpt = excerpt.join("\n").trim();
    diagnostics.push(current);
    current = null;
    excerpt = [];
  };

  for (const line of lines) {
    const head = line.match(HEADER);
    if (head) {
      flush();
      // The summary line is not a diagnostic
      if (/^could not compile/.test(head[2])) continue;
      current = {
        code: head[1] ?? null,
        title: head[2],
        file: null,
        line: null,
        col: null,
        excerpt: "",
      };
      continue;
    }
    if (!current) continue;
    const loc = line.match(LOCATION);
    if (loc && current.file === null) {
      current.file = loc[1];
      current.line = Number(loc[2]);
      current.col = Number(loc[3]);
      continue;
    }
    if (/^\s*\d+ \|/.test(line) || /^\s*\|/.test(line)) excerpt.push(line);
  }
  flush();

  return { diagnostics, raw };
};
```

- [ ] **Step 4: Run to pass**

Run: `cd client-v2 && yarn test-unit --testPathPattern build-report`
Expected: PASS.

- [ ] **Step 5: IdlActions**

```tsx
// client-v2/src/views/flow/stages/IdlActions.tsx
import { ChangeEvent, FC } from "react";
import styled from "styled-components";

import Button from "../../../components/Button";
import { useRenderOnChange } from "../../../hooks";
import { PgProgramInfo } from "../../../utils";

interface IdlActionsProps {
  showGenerate?: boolean;
  showUpload?: boolean;
}

const IdlActions: FC<IdlActionsProps> = ({ showGenerate, showUpload }) => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl);

  const handleUpload = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      PgProgramInfo.update({ idl: JSON.parse(await file.text()) });
    } catch (e) {
      console.error("Invalid IDL file", e);
    }
  };

  return (
    <Row>
      {showGenerate && idl && (
        <Button.Export href={idl} fileName="idl.json">
          Generate IDL
        </Button.Export>
      )}
      {showGenerate && !idl && (
        <Button disabled title="Build successfully first">
          Generate IDL
        </Button>
      )}
      {showUpload && (
        <Button.Import accept=".json" onImport={handleUpload} showImportText>
          Upload IDL
        </Button.Import>
      )}
    </Row>
  );
};

export default IdlActions;

const Row = styled.div`
  display: flex;
  gap: 0.5rem;
`;
```

"Generate IDL" is honest: the build already produced it; the button surfaces and downloads it (spec: "reveals/downloads the idl.json the build produced").

- [ ] **Step 6: Build surface**

```tsx
// client-v2/src/views/flow/stages/Build.tsx
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import IdlActions from "./IdlActions";
import { parseBuildReport } from "./build-report";
import type { BuildReport } from "./build-report";
import Button from "../../../components/Button";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import type { BuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { GradientButton } from "../../sidebar/assistant/Component";
import { PgAssistant } from "../../sidebar/assistant/store";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgCommand, PgExplorer, PgFramework } from "../../../utils";

const Build = () => {
  const [out, setOut] = useState<BuildOutput | null>(null);
  const [flow, setFlow] = useState<FlowState>(PgFlow.state);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const a = PgBuildOutput.onDidChange(setOut);
    const b = PgFlow.onDidChange(setFlow);
    return () => {
      a.dispose();
      b.dispose();
    };
  }, []);

  const report: BuildReport | null = out ? parseBuildReport(out.stderr) : null;
  const ms = flow.buildMs === null ? "" : ` · ${(flow.buildMs / 1000).toFixed(1)}s`;

  if (!out) {
    return (
      <Surface>
        <Headline>Nothing built yet</Headline>
        <Muted>Build compiles your program on the server. Nothing leaves your browser except the source.</Muted>
        <GradientButton onClick={() => PgCommand.build.execute()}>Build</GradientButton>
      </Surface>
    );
  }

  if (!out.failed) {
    return (
      <Surface>
        <Headline $ok>Build succeeded{ms}</Headline>
        <Actions>
          <GradientButton onClick={() => PgFlow.setStage("deploy")}>
            Continue to Deploy
          </GradientButton>
          <IdlActions showGenerate />
          <Button onClick={() => PgFramework.exportWorkspace()}>Export project</Button>
        </Actions>
      </Surface>
    );
  }

  const n = report?.diagnostics.length ?? flow.buildErrorCount;
  return (
    <Surface>
      <Headline $error>
        Build failed · {n} error{n === 1 ? "" : "s"}{ms}
      </Headline>
      {report?.diagnostics.map((d, i) => (
        <Card key={i}>
          <CardTitle>
            {d.code && <Code>{d.code}</Code>} {d.title}
          </CardTitle>
          {d.file && (
            <Location>
              {d.file}:{d.line}:{d.col}
            </Location>
          )}
          {d.excerpt && <Excerpt>{d.excerpt}</Excerpt>}
          <Actions>
            <GradientButton
              onClick={() => {
                PgAssistant.addUserMessage(
                  `Explain this build error and propose a fix: ${d.code ?? ""} ${d.title} at ${d.file}:${d.line}`
                );
              }}
            >
              Fix with assistant
            </GradientButton>
            {d.file && (
              <Button
                onClick={() => PgExplorer.openFile(d.file as string, { line: d.line ?? 1 })}
              >
                Open in editor
              </Button>
            )}
          </Actions>
        </Card>
      ))}
      <Toggle type="button" onClick={() => setShowRaw((s) => !s)}>
        {showRaw ? "Hide" : "Show"} raw compiler output
      </Toggle>
      {showRaw && <Raw>{report?.raw}</Raw>}
    </Surface>
  );
};

export default Build;

const Surface = styled.div`
  ${({ theme }) => css`
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: ${theme.font.other.family};
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Headline = styled.h2<{ $ok?: boolean; $error?: boolean }>`
  ${({ theme, $ok, $error }) => css`
    margin: 0;
    font-size: ${theme.font.other.size.xlarge};
    color: ${$ok
      ? theme.colors.state.success.color
      : $error
      ? theme.colors.state.error.color
      : theme.colors.default.textPrimary};
  `}
`;

const Muted = styled.p`
  ${({ theme }) => css`
    margin: 0;
    max-width: 40rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Card = styled.section`
  ${({ theme }) => css`
    padding: 1rem;
    border: 1px solid ${theme.colors.default.border};
    border-left: 3px solid ${theme.colors.state.error.color};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  `}
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;

const Code = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    color: ${theme.colors.state.error.color};
  `}
`;

const Location = styled.div`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Excerpt = styled.pre`
  ${({ theme }) => css`
    margin: 0;
    padding: 0.75rem;
    overflow-x: auto;
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
  `}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const Toggle = styled.button`
  ${({ theme }) => css`
    align-self: flex-start;
    border: none;
    background: none;
    color: ${theme.colors.default.textSecondary};
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  `}
`;

const Raw = styled(Excerpt)`
  white-space: pre-wrap;
`;
```

Verify: `PgExplorer.openFile` signature (`grep -n "static async openFile\|static openFile" client-v2/src/utils/explorer/explorer.ts`), `PgAssistant.addUserMessage` behaviour (if it only appends without sending, add to `store.ts` a `static send(text: string)` that appends and dispatches through the current provider, or set a draft the composer reads — keep it inside our assistant code), `GradientButton` export, `theme.font.other.size.xlarge`.

- [ ] **Step 7: Types + manual check**

Run: `cd client-v2 && yarn test-types`. In the browser: build the `E0308` fixture project → stepper shows "Build · 1 error" → Build surface shows the card → "Open in editor" jumps to the line → "Fix with assistant" posts to the assistant.

- [ ] **Step 8: Commit**

```bash
git add client-v2/src/views/flow/stages
git commit -m "Add the Build report surface with IDL and export actions"
```

---

### Task 6: Deploy and Interact surfaces

**Files:**
- Create/replace: `client-v2/src/views/flow/stages/Deploy.tsx`, `stages/Interact.tsx`

**Interfaces:**
- Consumes: `PgDeployHistory.list/latest/onDidChange`, `DeployRecord` (Task 2); `IdlActions` (Task 5); `PgProgramInfo`, `PgCommand.deploy.execute()`, `useBlockExplorer` hook (`hooks/useBlockExplorer.tsx`) for Explorer URLs; the IDL test panel: `views/sidebar/test/Component/Test.tsx` (default export) — check whether it needs `IdlProvider` wrapping.

- [ ] **Step 1: Deploy**

```tsx
// client-v2/src/views/flow/stages/Deploy.tsx
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import IdlActions from "./IdlActions";
import Button from "../../../components/Button";
import Link from "../../../components/Link";
import { useBlockExplorer, useRenderOnChange } from "../../../hooks";
import { PgCommand, PgExplorer, PgProgramInfo } from "../../../utils";
import { GradientButton } from "../../sidebar/assistant/Component";
import { PgDeployHistory } from "../state/deploy-history";
import type { DeployRecord } from "../state/deploy-history";
import { PgFlow } from "../state/stage";

const Deploy = () => {
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const explorer = useBlockExplorer();
  useRenderOnChange(PgProgramInfo.onDidChangePk);
  const pk = PgProgramInfo.getPk()?.toBase58() ?? null;
  const built = PgFlow.state.build === "done";

  useEffect(
    () =>
      PgDeployHistory.onDidChange(() =>
        setHistory(PgDeployHistory.list(PgExplorer.currentWorkspaceName ?? ""))
      ).dispose,
    []
  );

  const latest = history[0] ?? null;

  return (
    <Surface>
      <Headline>Deploy</Headline>
      {!built && <Muted>Build successfully first. The stepper will unlock Deploy.</Muted>}
      <Actions>
        <GradientButton disabled={!built} onClick={() => PgCommand.deploy.execute()}>
          {latest ? "Redeploy to devnet" : "Deploy to devnet"}
        </GradientButton>
        <IdlActions showUpload />
      </Actions>

      {latest && (
        <Card>
          <CardTitle>Latest deployment</CardTitle>
          <Row>
            <Key>Program id</Key>
            <Mono>{latest.programId}</Mono>
            <Link href={explorer.getAddressUrl(latest.programId)}>Explorer</Link>
          </Row>
          <Row>
            <Key>Cluster</Key>
            <Mono>{latest.cluster}</Mono>
          </Row>
          {latest.signature && (
            <Row>
              <Key>Transaction</Key>
              <Mono>{latest.signature.slice(0, 20)}&hellip;</Mono>
              <Link href={explorer.getTxUrl(latest.signature)}>Explorer</Link>
            </Row>
          )}
          <Row>
            <Key>When</Key>
            <Mono>{new Date(latest.at).toLocaleString()}</Mono>
          </Row>
          <Actions>
            <Button onClick={() => PgFlow.setStage("interact")}>Interact</Button>
          </Actions>
        </Card>
      )}

      <CardTitle as="h3">Deploy history</CardTitle>
      {history.length === 0 && <Muted>No deployments yet for this project.</Muted>}
      <List>
        {history.map((r) => (
          <HistoryRow key={r.id}>
            <Mono>{r.cluster}</Mono>
            <Mono title={r.programId}>{r.programId.slice(0, 8)}&hellip;{r.programId.slice(-4)}</Mono>
            <Muted as="span">{new Date(r.at).toLocaleString()}</Muted>
            <Link href={explorer.getAddressUrl(r.programId)}>Explorer</Link>
          </HistoryRow>
        ))}
      </List>
      {pk && !latest && <Muted>Program id: {pk}</Muted>}
    </Surface>
  );
};

export default Deploy;

const Surface = styled.div`
  ${({ theme }) => css`
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: ${theme.font.other.family};
    color: ${theme.colors.default.textPrimary};
  `}
`;
const Headline = styled.h2`
  margin: 0;
`;
const Muted = styled.p`
  ${({ theme }) => css`
    margin: 0;
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Card = styled.section`
  ${({ theme }) => css`
    padding: 1rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `}
`;
const CardTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;
const Row = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
`;
const Key = styled.span`
  ${({ theme }) => css`
    width: 7rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Mono = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
  `}
`;
const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;
const List = styled.div`
  display: flex;
  flex-direction: column;
`;
const HistoryRow = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: 6rem 1fr 1fr auto;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;
```

Verify `useBlockExplorer()` return shape (`sed -n '1,40p' client-v2/src/hooks/useBlockExplorer.tsx`) and `PgProgramInfo.onDidChangePk`; adapt.

- [ ] **Step 2: Interact**

```tsx
// client-v2/src/views/flow/stages/Interact.tsx
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import IdlActions from "./IdlActions";
import Test from "../../sidebar/test/Component/Test";
import { PgExplorer, PgProgramInfo, PgWeb3 } from "../../../utils";
import { PgDeployHistory } from "../state/deploy-history";
import type { DeployRecord } from "../state/deploy-history";

const Interact = () => {
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(
    () =>
      PgDeployHistory.onDidChange(() => {
        const list = PgDeployHistory.list(PgExplorer.currentWorkspaceName ?? "");
        setHistory(list);
        setSelected((s) => s ?? list[0]?.id ?? null);
      }).dispose,
    []
  );

  const pick = (id: string) => {
    setSelected(id);
    const r = history.find((h) => h.id === id);
    if (!r) return;
    // The IDL panel targets PgProgramInfo's pk; point it at the chosen deploy.
    PgProgramInfo.update({ importedProgram: { pk: new PgWeb3.PublicKey(r.programId) } });
  };

  return (
    <Surface>
      <Toolbar>
        <label>
          Deployment{" "}
          <Select
            value={selected ?? ""}
            onChange={(e) => pick(e.target.value)}
            disabled={history.length === 0}
          >
            {history.length === 0 && <option value="">none yet</option>}
            {history.map((r, i) => (
              <option key={r.id} value={r.id}>
                {i === 0 ? "latest · " : ""}
                {r.cluster} · {r.programId.slice(0, 6)}&hellip; ·{" "}
                {new Date(r.at).toLocaleTimeString()}
              </option>
            ))}
          </Select>
        </label>
        <IdlActions showUpload />
      </Toolbar>
      <Panel>
        <Test />
      </Panel>
    </Surface>
  );
};

export default Interact;

const Surface = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;
const Toolbar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.other.family};
  `}
`;
const Select = styled.select`
  ${({ theme }) => css`
    padding: 0.375rem 0.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.code.family};
  `}
`;
const Panel = styled.div`
  flex: 1;
  overflow-y: auto;
`;
```

Check how `PgProgramInfo` stores the program pk for the test panel (`grep -n "importedProgram\|customPk\|getPk" client-v2/src/utils/program-info.ts`): if there is a `customPk` field, set that instead of `importedProgram`. Check `Test` renders without the sidebar wrapper.

- [ ] **Step 3: Types + manual**

Run: `cd client-v2 && yarn test-types`. Deploy the built fixture (devnet, needs airdropped wallet) → history gets a row → Interact shows the program's instructions → switching the select changes the target.

- [ ] **Step 4: Commit**

```bash
git add client-v2/src/views/flow/stages
git commit -m "Add Deploy history and the Interact deployment switcher"
```

---

### Task 7: New Workspace gallery

**Skills:** invoke `frontend-design` and `ui-ux-pro-max` before writing the modal.

**Files:**
- Create: `client-v2/src/views/flow/gallery/NewWorkspaceModal.tsx`, `StartFromScratch.tsx`, `TutorialsTab.tsx`, `ProgramsTab.tsx`, `ecosystem.ts`
- Modify: `client-v2/src/views/flow/Flow.tsx` (`openGallery` opens the modal; open on mount when `PgExplorer.allWorkspaceNames` is empty)

**Interfaces:**
- Consumes: `PgView.setModal(Component)` (`utils/view.ts:219`), `PgTutorial.all` + `PgTutorial.open(name)` (check `utils/tutorial.ts`), framework list `PgFramework.all` or `FRAMEWORKS` (check `utils/framework.ts`), `PgExplorer.createWorkspace(name, { files })`, the programs data used by `routes/programs/programs.tsx`, existing `ProgramCard`/`TutorialCard` components from `views/main/primary`.
- Produces: `NewWorkspaceModal` default export (rendered via `PgView.setModal`).

- [ ] **Step 1: Ecosystem cards (static, view-only)**

```ts
// client-v2/src/views/flow/gallery/ecosystem.ts
export interface EcosystemProgram {
  name: string;
  tagline: string;
  tags: string[];
  repo: string;
}

/** Shown for orientation only: they cannot compile on the fixed crate list. */
export const ECOSYSTEM_PROGRAMS: EcosystemProgram[] = [
  {
    name: "drift-v2",
    tagline: "On-chain perpetuals DEX with multiple liquidity mechanisms.",
    tags: ["DeFi", "Trading"],
    repo: "https://github.com/drift-labs/protocol-v2",
  },
  {
    name: "mango-v4",
    tagline: "Lend, borrow, swap and leverage-trade in one venue.",
    tags: ["DeFi", "Lending"],
    repo: "https://github.com/blockworks-foundation/mango-v4",
  },
  {
    name: "futarchy",
    tagline: "Programs for market-driven governance.",
    tags: ["Governance"],
    repo: "https://github.com/metaDAOproject/futarchy",
  },
  {
    name: "token-2022",
    tagline: "The SPL token program with extensions.",
    tags: ["SPL", "Token"],
    repo: "https://github.com/solana-program/token-2022",
  },
];
```

- [ ] **Step 2: StartFromScratch**

```tsx
// client-v2/src/views/flow/gallery/StartFromScratch.tsx
import { FC, useState } from "react";
import styled, { css } from "styled-components";

import { PgExplorer, PgFramework, PgView } from "../../../utils";
import { GradientButton } from "../../sidebar/assistant/Component";

const StartFromScratch: FC = () => {
  const [framework, setFramework] = useState(PgFramework.all[0]?.name ?? "");
  const [name, setName] = useState("");

  const create = async () => {
    const fw = PgFramework.all.find((f) => f.name === framework);
    if (!fw) return;
    const files = await fw.getFiles();
    await PgExplorer.createWorkspace(name || `${fw.name.toLowerCase()}-project`, {
      files,
    });
    PgView.setModal(null);
  };

  return (
    <Row>
      <Plus aria-hidden>+</Plus>
      <Text>
        <Eyebrow>Blank canvas</Eyebrow>
        <Title>Start from scratch</Title>
        <Sub>A working starter you shape with the assistant.</Sub>
      </Text>
      <Controls>
        <select value={framework} onChange={(e) => setFramework(e.target.value)}>
          {PgFramework.all.map((f) => (
            <option key={f.name}>{f.name}</option>
          ))}
        </select>
        <input
          placeholder="project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <GradientButton onClick={create}>Start &rarr;</GradientButton>
      </Controls>
    </Row>
  );
};

export default StartFromScratch;

const Row = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid ${theme.colors.default.primary};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
  `}
`;
const Plus = styled.span`
  ${({ theme }) => css`
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 50%;
    color: ${theme.colors.default.primary};
    font-size: 1.25rem;
  `}
`;
const Text = styled.div``;
const Eyebrow = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.xsmall};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.primary};
  `}
`;
const Title = styled.div`
  font-weight: 600;
`;
const Sub = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.other.size.small};
  `}
`;
const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;
```

Verify `PgFramework.all` / `getFiles` names (`grep -n "static get all\|getFiles\|files" client-v2/src/utils/framework.ts`) and `createWorkspace` params (`explorer.ts:417`); adapt.

- [ ] **Step 3: TutorialsTab and ProgramsTab**

```tsx
// client-v2/src/views/flow/gallery/TutorialsTab.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import { PgTutorial, PgView } from "../../../utils";

interface TutorialsTabProps {
  query: string;
}

const TutorialsTab: FC<TutorialsTabProps> = ({ query }) => {
  const q = query.toLowerCase();
  const items = PgTutorial.all.filter(
    (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  );
  return (
    <Grid>
      {items.map((t) => (
        <Card key={t.name}>
          {t.thumbnail && <Thumb src={t.thumbnail} alt="" />}
          <div>
            <Eyebrow>
              {t.level} · {t.framework}
            </Eyebrow>
            <Title>{t.name}</Title>
            <Sub>{t.description}</Sub>
          </div>
          <Button
            onClick={async () => {
              await PgTutorial.open(t.name);
              PgView.setModal(null);
            }}
          >
            Open
          </Button>
        </Card>
      ))}
    </Grid>
  );
};

export default TutorialsTab;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
  gap: 0.75rem;
`;
export const Card = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
  `}
`;
const Thumb = styled.img`
  width: 4.5rem;
  height: 3rem;
  object-fit: cover;
  border-radius: 0.25rem;
`;
export const Eyebrow = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.xsmall};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.primary};
  `}
`;
export const Title = styled.div`
  font-weight: 600;
`;
export const Sub = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.other.size.small};
  `}
`;
```

```tsx
// client-v2/src/views/flow/gallery/ProgramsTab.tsx
import { FC } from "react";
import styled, { css } from "styled-components";

import { Card, Eyebrow, Grid, Sub, Title } from "./TutorialsTab";
import { ECOSYSTEM_PROGRAMS } from "./ecosystem";
import Button from "../../../components/Button";
import Link from "../../../components/Link";

interface ProgramsTabProps {
  query: string;
}

const ProgramsTab: FC<ProgramsTabProps> = ({ query }) => {
  const q = query.toLowerCase();
  const items = ECOSYSTEM_PROGRAMS.filter((p) => p.name.includes(q));
  return (
    <Grid>
      {items.map((p) => (
        <Card key={p.name}>
          <Badge>view only</Badge>
          <div>
            <Eyebrow>Anchor · program</Eyebrow>
            <Title>{p.name}</Title>
            <Sub>{p.tagline}</Sub>
            <Tags>
              {p.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </Tags>
          </div>
          <Link href={p.repo}>
            <Button>Source</Button>
          </Link>
        </Card>
      ))}
      <Note>
        Ecosystem programs are shown for orientation. They target newer Anchor
        versions than this environment compiles (anchor-lang 0.29), so they open
        as source, not as buildable projects.
      </Note>
    </Grid>
  );
};

export default ProgramsTab;

const Badge = styled.span`
  ${({ theme }) => css`
    padding: 0.125rem 0.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    font-size: ${theme.font.other.size.xsmall};
    color: ${theme.colors.default.textSecondary};
    white-space: nowrap;
  `}
`;
const Tags = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 0.375rem;
`;
const Tag = styled.span`
  ${({ theme }) => css`
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
    background: ${theme.colors.default.bgPrimary};
    font-size: ${theme.font.other.size.xsmall};
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Note = styled.p`
  ${({ theme }) => css`
    grid-column: 1 / -1;
    margin: 0;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.other.size.small};
  `}
`;
```

If the upstream programs registry (`routes/programs/programs.tsx`) exposes a list with names/descriptions, prepend those as buildable "Open" cards above the ecosystem ones using the same `Card`; otherwise ship the ecosystem cards only and note it in the commit message.

- [ ] **Step 4: Modal**

```tsx
// client-v2/src/views/flow/gallery/NewWorkspaceModal.tsx
import { useState } from "react";
import styled, { css } from "styled-components";

import ProgramsTab from "./ProgramsTab";
import StartFromScratch from "./StartFromScratch";
import TutorialsTab from "./TutorialsTab";
import Modal from "../../../components/Modal";
import { PgTutorial } from "../../../utils";
import { ECOSYSTEM_PROGRAMS } from "./ecosystem";

type Tab = "tutorials" | "programs";

const NewWorkspaceModal = () => {
  const [tab, setTab] = useState<Tab>("tutorials");
  const [query, setQuery] = useState("");

  return (
    <Modal title="What do you want to build?" closeButton>
      <Wrapper>
        <Lead>
          Start clean, open a focused program, or learn through a tutorial.
          Everything stays in this browser.
        </Lead>
        <StartFromScratch />
        <Bar>
          <Tabs role="tablist">
            <TabButton
              role="tab"
              aria-selected={tab === "tutorials"}
              $active={tab === "tutorials"}
              onClick={() => setTab("tutorials")}
            >
              Tutorials <Count>{PgTutorial.all.length}</Count>
            </TabButton>
            <TabButton
              role="tab"
              aria-selected={tab === "programs"}
              $active={tab === "programs"}
              onClick={() => setTab("programs")}
            >
              Programs <Count>{ECOSYSTEM_PROGRAMS.length}</Count>
            </TabButton>
          </Tabs>
          <Search
            placeholder={`Search ${tab}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Bar>
        {tab === "tutorials" ? (
          <TutorialsTab query={query} />
        ) : (
          <ProgramsTab query={query} />
        )}
      </Wrapper>
    </Modal>
  );
};

export default NewWorkspaceModal;

const Wrapper = styled.div`
  ${({ theme }) => css`
    width: min(64rem, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: ${theme.font.other.family};
  `}
`;
const Lead = styled.p`
  ${({ theme }) => css`
    margin: 0;
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Bar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;
const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    padding: 0.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
  `}
`;
const TabButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: calc(${theme.default.borderRadius} - 2px);
    background: ${$active ? theme.colors.default.bgSecondary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;
const Count = styled.span`
  ${({ theme }) => css`
    margin-left: 0.375rem;
    padding: 0 0.375rem;
    border-radius: 999px;
    background: ${theme.colors.default.bgPrimary};
    font-size: ${theme.font.other.size.xsmall};
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Search = styled.input`
  ${({ theme }) => css`
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
  `}
`;
```

Check `components/Modal` props (`sed -n '1,60p' client-v2/src/components/Modal/Modal.tsx`) and `PgTutorial` item fields (`name`, `description`, `level`, `framework`, `thumbnail`); adapt names.

- [ ] **Step 5: Wire into Flow**

In `Flow.tsx` replace `openGallery` with:

```tsx
const openGallery = () => PgView.setModal(NewWorkspaceModal);
useEffect(() => {
  if ((PgExplorer.allWorkspaceNames ?? []).length === 0) openGallery();
}, []);
```

and import `NewWorkspaceModal` and `PgExplorer`.

- [ ] **Step 6: Types + manual**

`yarn test-types`; in the browser: project switcher → modal → Start from scratch creates and switches; Tutorials → Open works; Programs show view-only cards; search filters.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow
git commit -m "Add the New Workspace gallery"
```

---

### Task 8: Gear settings overlay

**Skills:** invoke `frontend-design` before writing.

**Files:**
- Create: `client-v2/src/views/flow/settings/GearSidebar.tsx`
- Modify: `client-v2/src/views/flow/Flow.tsx` (`openSettings` toggles it)

**Interfaces:**
- Consumes: `PgSettings` (check `utils/settings.ts` for `connection.endpoint`, `connection.commitment`, theme/font setters — `grep -n "endpoint\|commitment\|theme\|font" client-v2/src/utils/settings.ts`), `PgFramework.exportWorkspace()`, the explorer import modal (`views/sidebar/explorer/Component/Modals/ImportWorkspace` or equivalent — `ls client-v2/src/views/sidebar/explorer/Component/Modals`), `useBlockExplorer`, `useOnClickOutside` hook.
- Produces: `GearSidebar: FC<{ open: boolean; onClose: () => void }>`.

- [ ] **Step 1: Component**

```tsx
// client-v2/src/views/flow/settings/GearSidebar.tsx
import { FC, useRef } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import Link from "../../../components/Link";
import { useBlockExplorer, useOnClickOutside, useRenderOnChange, useWallet } from "../../../hooks";
import { PgFramework, PgProgramInfo, PgSettings, PgView } from "../../../utils";
import ImportWorkspace from "../../sidebar/explorer/Component/Modals/ImportWorkspace";

const ENDPOINTS = [
  { label: "devnet", url: "https://api.devnet.solana.com" },
  { label: "testnet", url: "https://api.testnet.solana.com" },
  { label: "localhost", url: "http://localhost:8899" },
];

interface GearSidebarProps {
  open: boolean;
  onClose: () => void;
}

const GearSidebar: FC<GearSidebarProps> = ({ open, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, onClose, open);
  useRenderOnChange(PgSettings.onDidChangeConnectionEndpoint);
  const explorer = useBlockExplorer();
  const { wallet } = useWallet();
  const endpoint = PgSettings.connection.endpoint;
  const pk = PgProgramInfo.getPk()?.toBase58();

  return (
    <Panel ref={ref} $open={open} aria-hidden={!open} role="dialog" aria-label="Settings">
      <Head>
        <h2>Settings</h2>
        <Close aria-label="Close settings" onClick={onClose}>&times;</Close>
      </Head>

      <Section>
        <Label>Network</Label>
        <Options>
          {ENDPOINTS.map((e) => (
            <Option
              key={e.url}
              $active={endpoint === e.url}
              onClick={() => (PgSettings.connection.endpoint = e.url)}
            >
              {e.label}
            </Option>
          ))}
        </Options>
        <Input
          value={endpoint}
          onChange={(ev) => (PgSettings.connection.endpoint = ev.target.value)}
          aria-label="Custom RPC endpoint"
        />
      </Section>

      <Section>
        <Label>Commitment</Label>
        <Options>
          {(["processed", "confirmed", "finalized"] as const).map((c) => (
            <Option
              key={c}
              $active={PgSettings.connection.commitment === c}
              onClick={() => (PgSettings.connection.commitment = c)}
            >
              {c}
            </Option>
          ))}
        </Options>
      </Section>

      <Section>
        <Label>Project</Label>
        <Row>
          <Button onClick={() => PgFramework.exportWorkspace()}>Export project (zip)</Button>
          <Button onClick={() => PgView.setModal(ImportWorkspace)}>Import</Button>
        </Row>
      </Section>

      <Section>
        <Label>Explorer</Label>
        {wallet && <Link href={explorer.getAddressUrl(wallet.publicKey.toBase58())}>Wallet</Link>}
        {pk && <Link href={explorer.getAddressUrl(pk)}>Program</Link>}
        {pk && <Link href={`${explorer.getAddressUrl(pk)}/idl`}>Program IDL</Link>}
      </Section>
    </Panel>
  );
};

export default GearSidebar;

const Panel = styled.div<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    position: fixed;
    top: 3.5rem;
    right: 0;
    bottom: 0;
    width: 22rem;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: ${theme.colors.default.bgPrimary};
    border-left: 1px solid ${theme.colors.default.border};
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.35);
    font-family: ${theme.font.other.family};
    transform: translateX(${$open ? "0" : "100%"});
    transition: transform 320ms cubic-bezier(0.2, 0, 0, 1);
    z-index: 5;
    overflow-y: auto;
    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;
const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  h2 {
    margin: 0;
    font-size: 1.125rem;
  }
`;
const Close = styled.button`
  ${({ theme }) => css`
    border: none;
    background: none;
    color: ${theme.colors.default.textSecondary};
    font-size: 1.5rem;
    cursor: pointer;
  `}
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;
const Label = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.xsmall};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;
const Options = styled.div`
  display: flex;
  gap: 0.375rem;
`;
const Option = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    padding: 0.375rem 0.75rem;
    border: 1px solid ${$active ? theme.colors.default.primary : theme.colors.default.border};
    border-radius: 999px;
    background: ${$active ? theme.colors.default.bgSecondary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-size: ${theme.font.other.size.small};
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;
const Input = styled.input`
  ${({ theme }) => css`
    padding: 0.5rem 0.625rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
  `}
`;
const Row = styled.div`
  display: flex;
  gap: 0.5rem;
`;
```

Verify the settings setter shape (`PgSettings.connection.endpoint = ...` is the upstream pattern via `updatable`; confirm with `grep -n "connection" client-v2/src/utils/settings.ts`), the endpoint change event name, and the import modal's file name.

- [ ] **Step 2: Wire into Flow**

In `Flow.tsx`: `const [settingsOpen, setSettingsOpen] = useState(false);`, `openSettings = () => setSettingsOpen(true)`, render `<GearSidebar open={settingsOpen} onClose={() => setSettingsOpen(false)} />` inside `Wrapper` after `Columns`.

- [ ] **Step 3: Types + manual**

`yarn test-types`; gear opens the panel; switching to testnet updates the header chip; Export downloads a zip.

- [ ] **Step 4: Commit**

```bash
git add client-v2/src/views/flow
git commit -m "Add the gear settings overlay with network, export and Explorer links"
```

---

### Task 9: Stage transitions and motion tokens

**Files:**
- Modify: `client-v2/src/views/flow/stages/StageRouter.tsx`

- [ ] **Step 1: Crossfade**

Wrap the rendered surface in:

```tsx
const Fade = styled.div`
  animation: rise 220ms cubic-bezier(0.2, 0, 0, 1);
  height: 100%;
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
```

and key it by stage (`<Fade key={stage}>`), so each stage switch plays the rise once.

- [ ] **Step 2: Types + commit**

```bash
git add client-v2/src/views/flow/stages/StageRouter.tsx
git commit -m "Add the stage crossfade"
```

---

### Task 10: Build-stage routing polish and "Fix with assistant" verification

**Files:**
- Modify: `client-v2/src/views/flow/stages/Build.tsx`, possibly `client-v2/src/views/sidebar/assistant/store.ts`

- [ ] **Step 1:** Run the demo path with the `anthropic` or `scripted` provider connected. If "Fix with assistant" only appends a user message without sending, add to `PgAssistant` a `static sendFromOutside(text: string)` that routes through the same path the composer's submit uses (find the submit handler in `Component/Chat.tsx` and extract its provider call into the store). Keep the change inside assistant code.
- [ ] **Step 2:** `yarn test-types`; commit: `git commit -am "Let the Build surface hand an error to the assistant"`.

---

### Task 11: Screenshots and honesty notes

**Files:**
- Create: `docs/design/screenshots/flow-build/` (png per stage: write, build-failed, build-ok, deploy, interact, gallery, gear)
- Modify: `docs/assistant-context.md` (Status + "What is real and what is mocked" — add the Flow layout, deploy history, view-only ecosystem cards, `?classic` fallback)

- [ ] **Step 1:** Capture with the browser at 1440x900 on the Solana V2 theme.
- [ ] **Step 2:** Update the two sections of `assistant-context.md`; run `cd client-v2 && yarn sync-assistant-context`.
- [ ] **Step 3:** Commit: `git add docs && git commit -m "docs: Record the Flow build and its real/mocked boundary"`.

---

### Task 12: Decision record

**Files:**
- Modify: `docs/decisions.md` (append D13)

- [ ] **Step 1:** Append:

```markdown
## D13 — Flow shipped as the default layout, classic behind a flag

**Date:** 2026-08-21 · **Status:** implemented (prototype)

`views/flow/` composes the existing bricks into the D10 anatomy and is
mounted by `app/Panels/Panels.tsx` unless `?classic` is present — the only
pre-existing file this iteration edits. Stepper state is derived, not
stored: build start/finish from `PgCommand.build` and the D4
`PgBuildOutput`, deploy from `PgCommand.deploy`. Deploy history is a new
client-side store in `localStorage` keyed by workspace.

**Rejected — editing `Panels/Main` and `Side` in place:** it would spread
the change over three upstream files for no gain over a sibling layout.

**Rejected — compiling ecosystem programs:** the crate whitelist and
anchor-lang 0.29 make it impossible; they ship as view-only cards so the
gallery is honest.

**Revisit when:** the stepper is tested with newcomers (D10's trigger), or
when the classic layout has had no use for a milestone — then delete it.
```

- [ ] **Step 2:** Commit: `git add docs/decisions.md && git commit -m "docs: Record D13, Flow as the default layout"`.

---

### Task 13: Final audit and handoff

- [ ] **Step 1:** Invoke `web-design-guidelines` on `client-v2/src/views/flow/**`; fix focus states, contrast, labels it flags (commit per fix).
- [ ] **Step 2:** `cd client-v2 && yarn test-types && yarn test-unit` — both clean.
- [ ] **Step 3:** Walk the full demo path once more: gallery → create → build (error) → Fix with assistant → apply → build (ok) → Generate IDL → deploy → history row → Interact → switch deployment → gear: switch network → export zip. Also open `/?classic`.
- [ ] **Step 4:** Push the branch: `git push`.
