# Tutorials as a Scenario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn one existing tutorial into a verified lesson path, where a
step is finished by the toolchain rather than by clicking Next, and the
assistant coaches through a hint ladder instead of answering.

**Architecture:** A fork-owned metadata layer
(`client-v2/src/views/flow/lessons/`) declares an ordered list of steps
over an unmodified upstream tutorial. A pure grader reads Flow's existing
`FlowState` and the IDL that an Anchor build regenerates, so no checker is
hand-written and no network call is added. Progress is a monotonic ratchet
in the lesson's own workspace. The Flow left rail gains a Steps tab, the
header switcher absorbs the rail's Projects tab, and an objective band
above the editor carries one ask plus the assistant action.

**Tech Stack:** React 17, TypeScript, styled-components, CRA 5 + craco,
Jest (`craco test`), Playwright.

**Spec:** `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md`
(on the `context-archive` branch, alongside
`docs/research/2026-08-27-tutorials-as-scenario.md`)

## Global Constraints

- **All work happens in `client-v2/`.** `client/` stays byte-identical to
  upstream.
- **Never commit `CLAUDE.md` or `docs/` to a PR branch.** Those live on
  `context-archive`. This plan and the spec are read from there, not
  copied into the feature branch.
- **Prettier, 80 columns, 2-space indent.** `yarn check-format` must pass.
- **No `any`, no `@ts-ignore`.** `yarn test-types` must pass.
- **`import type` for types; named exports everywhere except React
  components, which use default exports.**
- **No non-ASCII characters in source.** Use `--` not an em dash, and
  `->` not an arrow glyph, inside `client-v2/src`.
- **Import `PgWeb3`, never `@solana/web3.js`.** (`Idl` from
  `@coral-xyz/anchor` is fine -- `utils/program-info.ts` already does it.)
- **Only one pre-existing upstream file may be touched:**
  `client-v2/src/routes/tutorials/tutorials.tsx`, in Task 1 and Task 12.
  Everything else is new files or fork-owned files under
  `client-v2/src/views/flow/`.
- **Anything that changes state needs an explicit human action.** Nothing
  in this feature writes files, builds, or deploys on its own.
- **Commit style:** present tense, no prefix (`"Add lesson path types"`).
- **Node 22:** `~/.nvm/versions/node/v22.23.2/bin` must be on `PATH`.

Run from `client-v2/`:

- One unit suite: `npx craco test --watchAll=false --testPathPattern "<pattern>"`
- All unit tests: `yarn test-unit`
- Types: `yarn test-types`
- Format: `yarn check-format`
- E2E: `yarn test-e2e` (boots `yarn dev` on port 3000 itself)

---

### Task 1: Fix D16 -- the tutorial route crashes on first open

Opening a tutorial that has never been started, from an active project,
throws `Current tutorial has not been set` or silently bounces to `/`.
The route sets `PgView.sidebar.name = "Tutorials"` synchronously while
`PgTutorial.refresh()` is still resolving inside the async
`setMainPrimary` callback. The resulting `onDidChangeCurrentSidebarPage`
takes the `PgTutorial.openAboutPage()` branch, which throws because
`PgTutorial.current` is not set yet. Every entry point in this plan uses
that path, so it is fixed first.

**Files:**
- Modify: `client-v2/src/routes/tutorials/tutorials.tsx:105-124`
- Test: `client-v2/e2e/lesson-path.e2e.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Unblocks every later task's entry point.

- [ ] **Step 1: Write the failing test**

Create `client-v2/e2e/lesson-path.e2e.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/**
 * D16: opening a tutorial that has never been started, while a real
 * project is the active workspace, used to throw
 * `Current tutorial has not been set` or bounce back to `/`. An
 * already-started tutorial always worked, so the regression only shows
 * on a first open.
 */
test("opens an unstarted tutorial from an active project", async ({
  page,
}) => {
  // Booting the dev server, creating a project and importing a tutorial
  // is well past the 30s default.
  test.setTimeout(120_000);

  await page.goto("/");

  // The gallery opens by itself when there are no workspaces.
  const gallery = page.getByRole("dialog");
  await expect(gallery).toBeVisible();

  await gallery.getByRole("tab", { name: /tutorials/i }).click();
  await gallery.getByText("Hello Anchor", { exact: true }).click();

  // The tutorial's own editor must appear, and the app must not have
  // fallen back to the home route.
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor/);
  await expect(page.getByText("Current tutorial has not been set")).toHaveCount(
    0
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test-e2e --grep "unstarted tutorial"`
Expected: FAIL -- either the error text is present, or the URL assertion
fails because the app navigated back to `/`.

If it passes on the first run, the environment did not reproduce D16.
Stop and report that rather than editing the guard blind: the fix below
is only correct if the failure is real.

- [ ] **Step 3: Guard both branches of the listener**

In `client-v2/src/routes/tutorials/tutorials.tsx`, inside the
`PgView.onDidChangeCurrentSidebarPage` callback, replace:

```ts
          if (p.name === "Tutorials") PgTutorial.openAboutPage();
          else if (!PgTutorial.isStarted(tutorial.name)) PgRouter.navigate();
          else PgTutorial.open(tutorial.name);
```

with:

```ts
          // `setMainPrimary`'s callback is async, so `PgTutorial.refresh()`
          // may not have resolved when the synchronous sidebar-name
          // assignment below fires this listener. Both branches read
          // tutorial state that does not exist yet at that moment:
          // `openAboutPage()` throws, and the `isStarted` branch navigates
          // away mid-open. Wait for the next change instead. See D16.
          if (!PgTutorial.current) return;

          if (p.name === "Tutorials") PgTutorial.openAboutPage();
          else if (!PgTutorial.isStarted(tutorial.name)) PgRouter.navigate();
          else PgTutorial.open(tutorial.name);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test-e2e --grep "unstarted tutorial"`
Expected: PASS

- [ ] **Step 5: Verify nothing else regressed**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass.

Then manually check the case D16 says already worked, because the guard
sits on its path too: open a tutorial, leave it, and open it again from
the gallery. It must still restore the page you were on.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/routes/tutorials/tutorials.tsx client-v2/e2e/lesson-path.e2e.spec.ts
git commit -m "Fix opening an unstarted tutorial from an active project"
```

---

### Task 2: Lesson path types and validation

The metadata layer. Pure data plus a validator that fails the build rather
than the demo.

**Files:**
- Create: `client-v2/src/views/flow/lessons/types.ts`
- Create: `client-v2/src/views/flow/lessons/registry.ts`
- Test: `client-v2/src/views/flow/lessons/registry.test.ts`

**Interfaces:**
- Consumes: `Stage` from `../state/stage`.
- Produces:
  - `type VerifyCondition` -- the four-variant union below.
  - `interface LessonStep { id, objective, verifiedBy, verify, target, readPage?, hints }`
  - `interface LessonPath { tutorial: string; steps: LessonStep[] }`
  - `validatePath(path: LessonPath, tutorialNames: string[]): void` -- throws on invalid.
  - `getLessonPath(tutorialName: string | null | undefined): LessonPath | null`
  - `registerPaths(paths: LessonPath[], tutorialNames: string[]): void`

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/registry.test.ts`:

```ts
import { getLessonPath, registerPaths, validatePath } from "./registry";
import type { LessonPath } from "./types";

const TUTORIALS = ["Hello Anchor", "Hello Solana"];

const validPath: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "write",
      objective: "Define the hello instruction",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints: ["one", "two", "three"],
    },
    {
      id: "deploy",
      objective: "Deploy it to devnet",
      verifiedBy: "the program is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints: ["one", "two", "three"],
    },
  ],
};

describe("validatePath", () => {
  it("accepts a well-formed path", () => {
    expect(() => validatePath(validPath, TUTORIALS)).not.toThrow();
  });

  it("rejects a tutorial that does not exist", () => {
    const path = { ...validPath, tutorial: "No Such Tutorial" };
    expect(() => validatePath(path, TUTORIALS)).toThrow(/No Such Tutorial/);
  });

  it("rejects duplicate step ids", () => {
    const path: LessonPath = {
      ...validPath,
      steps: [validPath.steps[0], { ...validPath.steps[1], id: "write" }],
    };
    expect(() => validatePath(path, TUTORIALS)).toThrow(/duplicate step id/i);
  });

  it("rejects an empty path", () => {
    expect(() => validatePath({ ...validPath, steps: [] }, TUTORIALS)).toThrow(
      /at least one step/i
    );
  });

  it("rejects an idl condition with no instruction", () => {
    const path: LessonPath = {
      ...validPath,
      steps: [
        {
          ...validPath.steps[0],
          verify: { kind: "idl", instruction: "" },
        },
      ],
    };
    expect(() => validatePath(path, TUTORIALS)).toThrow(/instruction/i);
  });
});

describe("registry", () => {
  beforeEach(() => registerPaths([validPath], TUTORIALS));

  it("finds a path by tutorial name", () => {
    expect(getLessonPath("Hello Anchor")?.steps).toHaveLength(2);
  });

  it("returns null for a tutorial with no path", () => {
    expect(getLessonPath("Hello Solana")).toBeNull();
  });

  it("returns null for no workspace", () => {
    expect(getLessonPath(null)).toBeNull();
    expect(getLessonPath(undefined)).toBeNull();
  });

  it("validates every path it registers", () => {
    const bad = { ...validPath, tutorial: "Nope" };
    expect(() => registerPaths([bad], TUTORIALS)).toThrow(/Nope/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/registry"`
Expected: FAIL -- `Cannot find module './registry'`

- [ ] **Step 3: Write the types**

Create `client-v2/src/views/flow/lessons/types.ts`:

```ts
import type { Stage } from "../state/stage";

/**
 * What proves a step is finished. Every variant is answered from state
 * the client already holds -- no network call, no hand-written checker.
 * See the spec's "the grader" section.
 */
export type VerifyCondition =
  /** The last build succeeded */
  | { kind: "build-passes" }
  /** The program reached devnet */
  | { kind: "deployed" }
  /**
   * The IDL an Anchor build regenerates carries this shape. A real
   * artifact of the learner's own code, and free to check.
   */
  | { kind: "idl"; instruction: string; arg?: string; account?: string }
  /** Nothing free proves this one; the learner continues by hand */
  | { kind: "read" };

/** The three rungs of the hint ladder, coarse to specific */
export type Hints = [question: string, locate: string, propose: string];

export interface LessonStep {
  /** Stable across edits: it is the progress storage key */
  id: string;
  /** The single ask, one action */
  objective: string;
  /** What proves it, in the learner's own words */
  verifiedBy: string;
  /** The machine-checkable form of `verifiedBy` */
  verify: VerifyCondition;
  /** Which stage the stepper rings while this step is current */
  target: Stage;
  /**
   * Full prose for the reader overlay. A loader rather than a path
   * because a custom tutorial's pages are `require`d at build time from
   * `src/tutorials/<name>/pages/`, while a Markdown tutorial's are
   * fetched at runtime from `public/tutorials/<name>/pages/`.
   */
  readPage?: () => string | Promise<string>;
  /** Sent to the assistant, one per rung */
  hints: Hints;
}

export interface LessonPath {
  /** Must be a name in `TUTORIALS` */
  tutorial: string;
  steps: LessonStep[];
}
```

- [ ] **Step 4: Write the registry**

Create `client-v2/src/views/flow/lessons/registry.ts`:

```ts
import type { LessonPath } from "./types";

/**
 * Fail at module load rather than at demo time, the way
 * `createTutorial` already throws on too many categories.
 *
 * @param path the path to check
 * @param tutorialNames every name in `TUTORIALS`
 */
export const validatePath = (path: LessonPath, tutorialNames: string[]) => {
  if (!tutorialNames.includes(path.tutorial)) {
    throw new Error(
      `Lesson path targets "${path.tutorial}", which is not a tutorial`
    );
  }

  if (path.steps.length === 0) {
    throw new Error(`Lesson path "${path.tutorial}" needs at least one step`);
  }

  const seen = new Set<string>();
  for (const step of path.steps) {
    if (seen.has(step.id)) {
      throw new Error(
        `Lesson path "${path.tutorial}" has a duplicate step id "${step.id}"`
      );
    }
    seen.add(step.id);

    if (step.verify.kind === "idl" && !step.verify.instruction) {
      throw new Error(
        `Step "${step.id}" verifies against the IDL but names no instruction`
      );
    }
  }
};

let paths: LessonPath[] = [];

/** Validate and install the paths the app knows about. */
export const registerPaths = (
  next: LessonPath[],
  tutorialNames: string[]
) => {
  for (const path of next) validatePath(path, tutorialNames);
  paths = next;
};

/**
 * @param tutorialName the current workspace name
 * @returns the path for that tutorial, or `null` when it has none -- which
 * is the normal case for the tutorials we have not converted
 */
export const getLessonPath = (tutorialName: string | null | undefined) => {
  if (!tutorialName) return null;
  return paths.find((p) => p.tutorial === tutorialName) ?? null;
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/registry"`
Expected: PASS, 10 tests.

- [ ] **Step 6: Check types and format**

Run: `yarn test-types && yarn check-format`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow/lessons/
git commit -m "Add lesson path types and a validating registry"
```

---

### Task 3: The grader

Pure, synchronous, no network. This is the whole thesis in one function.

**Files:**
- Create: `client-v2/src/views/flow/lessons/verify.ts`
- Test: `client-v2/src/views/flow/lessons/verify.test.ts`

**Interfaces:**
- Consumes: `VerifyCondition` from `./types`, `FlowState` from `../state/stage`, `Idl` from `@coral-xyz/anchor`.
- Produces: `isSatisfied(c: VerifyCondition, flow: FlowState, idl: Idl | null): boolean`

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/verify.test.ts`:

```ts
import { isSatisfied } from "./verify";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";
import type { Idl } from "@coral-xyz/anchor";

const flow = (over: Partial<FlowState>): FlowState => ({
  ...INITIAL_FLOW_STATE,
  ...over,
});

/** Shaped like what an Anchor build regenerates for `hello-anchor`. */
const IDL_WITHOUT_ARG = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

const IDL_WITH_ARG = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [
    {
      name: "hello",
      accounts: [],
      args: [{ name: "name", type: "string" }],
    },
  ],
  accounts: [
    { name: "Greeting", type: { kind: "struct", fields: [] } },
  ],
} as Idl;

describe("build-passes", () => {
  it("is satisfied only when the build is done", () => {
    const c = { kind: "build-passes" } as const;
    expect(isSatisfied(c, flow({ build: "done" }), null)).toBe(true);
    expect(isSatisfied(c, flow({ build: "failed" }), null)).toBe(false);
    expect(isSatisfied(c, flow({ build: "running" }), null)).toBe(false);
    expect(isSatisfied(c, flow({ build: "upcoming" }), null)).toBe(false);
  });
});

describe("deployed", () => {
  it("is satisfied only when the deploy is done", () => {
    const c = { kind: "deployed" } as const;
    expect(isSatisfied(c, flow({ deploy: "done" }), null)).toBe(true);
    expect(isSatisfied(c, flow({ deploy: "failed" }), null)).toBe(false);
    expect(isSatisfied(c, flow({ deploy: "active" }), null)).toBe(false);
  });
});

describe("idl", () => {
  const state = flow({ build: "done" });

  it("is never satisfied without an IDL", () => {
    const c = { kind: "idl", instruction: "hello" } as const;
    expect(isSatisfied(c, state, null)).toBe(false);
  });

  it("finds an instruction by name", () => {
    const c = { kind: "idl", instruction: "hello" } as const;
    expect(isSatisfied(c, state, IDL_WITHOUT_ARG)).toBe(true);
  });

  it("does not find an instruction that is absent", () => {
    const c = { kind: "idl", instruction: "goodbye" } as const;
    expect(isSatisfied(c, state, IDL_WITHOUT_ARG)).toBe(false);
  });

  it("requires the named argument when one is asked for", () => {
    const c = { kind: "idl", instruction: "hello", arg: "name" } as const;
    expect(isSatisfied(c, state, IDL_WITHOUT_ARG)).toBe(false);
    expect(isSatisfied(c, state, IDL_WITH_ARG)).toBe(true);
  });

  it("requires the named account when one is asked for", () => {
    const c = {
      kind: "idl",
      instruction: "hello",
      account: "Greeting",
    } as const;
    expect(isSatisfied(c, state, IDL_WITHOUT_ARG)).toBe(false);
    expect(isSatisfied(c, state, IDL_WITH_ARG)).toBe(true);
  });

  it("matches names case-insensitively, since casing conventions differ", () => {
    const c = { kind: "idl", instruction: "Hello", arg: "Name" } as const;
    expect(isSatisfied(c, state, IDL_WITH_ARG)).toBe(true);
  });
});

describe("read", () => {
  it("is never satisfied automatically", () => {
    const c = { kind: "read" } as const;
    expect(isSatisfied(c, flow({ build: "done", deploy: "done" }), IDL_WITH_ARG)).toBe(
      false
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/verify"`
Expected: FAIL -- `Cannot find module './verify'`

- [ ] **Step 3: Write the grader**

Create `client-v2/src/views/flow/lessons/verify.ts`:

```ts
import type { Idl } from "@coral-xyz/anchor";

import type { VerifyCondition } from "./types";
import type { FlowState } from "../state/stage";

const sameName = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

/**
 * Whether a step's condition is met right now.
 *
 * Pure and synchronous on purpose: everything it reads is already in
 * memory, so evaluation costs nothing and can run on every state change.
 *
 * @param c the step's condition
 * @param flow the dev loop's current state
 * @param idl the IDL the last successful Anchor build regenerated
 * @returns whether the step is finished
 */
export const isSatisfied = (
  c: VerifyCondition,
  flow: FlowState,
  idl: Idl | null
): boolean => {
  switch (c.kind) {
    case "build-passes":
      return flow.build === "done";

    case "deployed":
      return flow.deploy === "done";

    case "idl": {
      if (!idl) return false;

      const ix = idl.instructions.find((i) => sameName(i.name, c.instruction));
      if (!ix) return false;

      if (c.arg && !ix.args.some((a) => sameName(a.name, c.arg!))) {
        return false;
      }

      if (
        c.account &&
        !(idl.accounts ?? []).some((a) => sameName(a.name, c.account!))
      ) {
        return false;
      }

      return true;
    }

    // Nothing free proves a reading step. The objective band gives it a
    // `Continue`; no other kind gets one.
    case "read":
      return false;
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/verify"`
Expected: PASS, 10 tests.

- [ ] **Step 5: Check types and format**

Run: `yarn test-types && yarn check-format`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/views/flow/lessons/verify.ts client-v2/src/views/flow/lessons/verify.test.ts
git commit -m "Add the lesson step grader"
```

---

### Task 4: The ratchet

Progress that only ever moves forward, held in memory and written through
to the lesson's own workspace.

**Files:**
- Create: `client-v2/src/views/flow/lessons/progress.ts`
- Test: `client-v2/src/views/flow/lessons/progress.test.ts`

**Interfaces:**
- Consumes: `LessonPath`, `LessonStep` from `./types`; `isSatisfied` from `./verify`; `FlowState` from `../state/stage`.
- Produces:
  - `interface LessonProgress { completedStepIds: string[]; currentStepId: string | null }`
  - `advance(path, progress, flow, idl): LessonProgress` -- pure reducer.
  - `continueRead(path, progress): LessonProgress` -- pure, the manual advance for a `read` step.
  - `currentStep(path, progress): LessonStep | null`
  - `stepNumber(path, progress): number` -- 1-based; `path.steps.length + 1` when finished.

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/progress.test.ts`:

```ts
import {
  advance,
  continueRead,
  currentStep,
  EMPTY_PROGRESS,
  stepNumber,
} from "./progress";
import type { LessonProgress } from "./progress";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";
import type { LessonPath } from "./types";
import type { Idl } from "@coral-xyz/anchor";

const flow = (over: Partial<FlowState>): FlowState => ({
  ...INITIAL_FLOW_STATE,
  ...over,
});

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "write",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "deploy",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
    {
      id: "client",
      objective: "Call it from the client",
      verifiedBy: "you have read the page",
      verify: { kind: "read" },
      target: "interact",
      hints,
    },
  ],
};

const IDL = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

describe("currentStep and stepNumber", () => {
  it("start at the first step", () => {
    expect(currentStep(PATH, EMPTY_PROGRESS)?.id).toBe("write");
    expect(stepNumber(PATH, EMPTY_PROGRESS)).toBe(1);
  });

  it("skip past everything completed", () => {
    const p: LessonProgress = {
      completedStepIds: ["write"],
      currentStepId: "deploy",
    };
    expect(currentStep(PATH, p)?.id).toBe("deploy");
    expect(stepNumber(PATH, p)).toBe(2);
  });

  it("report no current step once the path is finished", () => {
    const p: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    };
    expect(currentStep(PATH, p)).toBeNull();
    expect(stepNumber(PATH, p)).toBe(4);
  });
});

describe("advance", () => {
  it("does nothing while the condition is unmet", () => {
    const next = advance(PATH, EMPTY_PROGRESS, flow({}), null);
    expect(next).toEqual(EMPTY_PROGRESS);
  });

  it("completes the current step when its condition is met", () => {
    const next = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    expect(next.completedStepIds).toEqual(["write"]);
    expect(next.currentStepId).toBe("deploy");
  });

  it("completes several steps in one pass when both are satisfied", () => {
    const next = advance(
      PATH,
      EMPTY_PROGRESS,
      flow({ build: "done", deploy: "done" }),
      IDL
    );
    expect(next.completedStepIds).toEqual(["write", "deploy"]);
    expect(next.currentStepId).toBe("client");
  });

  it("stops at a read step, which nothing free can satisfy", () => {
    const next = advance(
      PATH,
      EMPTY_PROGRESS,
      flow({ build: "done", deploy: "done" }),
      IDL
    );
    expect(next.completedStepIds).not.toContain("client");
  });

  it("never un-completes a step when a later build fails", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    const after = advance(PATH, done, flow({ build: "failed" }), null);
    expect(after.completedStepIds).toEqual(["write"]);
    expect(after.currentStepId).toBe("deploy");
  });

  it("returns the same object when nothing changed, so renders are cheap", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    expect(advance(PATH, done, flow({ build: "done" }), IDL)).toBe(done);
  });
});

describe("continueRead", () => {
  it("advances past a read step", () => {
    const p: LessonProgress = {
      completedStepIds: ["write", "deploy"],
      currentStepId: "client",
    };
    const next = continueRead(PATH, p);
    expect(next.completedStepIds).toContain("client");
    expect(next.currentStepId).toBeNull();
  });

  it("refuses to advance a step that is not a read step", () => {
    const next = continueRead(PATH, EMPTY_PROGRESS);
    expect(next).toEqual(EMPTY_PROGRESS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/progress"`
Expected: FAIL -- `Cannot find module './progress'`

- [ ] **Step 3: Write the ratchet**

Create `client-v2/src/views/flow/lessons/progress.ts`:

```ts
import type { Idl } from "@coral-xyz/anchor";

import { isSatisfied } from "./verify";
import type { LessonPath, LessonStep } from "./types";
import type { FlowState } from "../state/stage";

/** Persisted per lesson, inside that lesson's own workspace */
export interface LessonProgress {
  /** Ids of finished steps. Entries are never removed. */
  completedStepIds: string[];
  /** `null` once every step is finished */
  currentStepId: string | null;
}

export const EMPTY_PROGRESS: LessonProgress = {
  completedStepIds: [],
  currentStepId: null,
};

const firstUnfinished = (path: LessonPath, completed: string[]) =>
  path.steps.find((s) => !completed.includes(s.id)) ?? null;

/**
 * @returns the step the learner is on, or `null` when the path is done
 */
export const currentStep = (
  path: LessonPath,
  progress: LessonProgress
): LessonStep | null => firstUnfinished(path, progress.completedStepIds);

/**
 * @returns a 1-based step number, or one past the end when finished, so
 * the UI can render "4 of 4" and "done" from the same value
 */
export const stepNumber = (path: LessonPath, progress: LessonProgress) => {
  const step = currentStep(path, progress);
  if (!step) return path.steps.length + 1;
  return path.steps.indexOf(step) + 1;
};

/**
 * Move the ratchet forward as far as the toolchain allows.
 *
 * Monotonic by construction: this only ever appends to
 * `completedStepIds`, so a later failing build moves the stepper and
 * never the lesson. Several steps can complete in one pass -- a learner
 * who builds and deploys before reading anything should not have to
 * re-trigger each one.
 *
 * @returns the same object when nothing changed, so React can bail out
 */
export const advance = (
  path: LessonPath,
  progress: LessonProgress,
  flow: FlowState,
  idl: Idl | null
): LessonProgress => {
  const completed = [...progress.completedStepIds];

  for (;;) {
    const step = firstUnfinished(path, completed);
    if (!step) break;
    if (!isSatisfied(step.verify, flow, idl)) break;
    completed.push(step.id);
  }

  if (completed.length === progress.completedStepIds.length) return progress;

  return {
    completedStepIds: completed,
    currentStepId: firstUnfinished(path, completed)?.id ?? null,
  };
};

/**
 * The manual advance, offered only for a `read` step. Every other kind
 * has no way past it: a click that skipped a verified step would give
 * back exactly what this design exists to take away.
 */
export const continueRead = (
  path: LessonPath,
  progress: LessonProgress
): LessonProgress => {
  const step = currentStep(path, progress);
  if (!step || step.verify.kind !== "read") return progress;

  const completed = [...progress.completedStepIds, step.id];
  return {
    completedStepIds: completed,
    currentStepId: firstUnfinished(path, completed)?.id ?? null,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/progress"`
Expected: PASS, 11 tests.

- [ ] **Step 5: Check types and format**

Run: `yarn test-types && yarn check-format`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/views/flow/lessons/progress.ts client-v2/src/views/flow/lessons/progress.test.ts
git commit -m "Add the monotonic lesson progress ratchet"
```

---

### Task 5: The hint ladder

Three rungs, a counter that resets per step, and a cap before the learner
has attempted anything. No change to `PgAssistant` -- the ladder is a
fork-owned module that hands finished prompt text to the existing
`requestPrompt`.

**Files:**
- Create: `client-v2/src/views/flow/lessons/hints.ts`
- Test: `client-v2/src/views/flow/lessons/hints.test.ts`

**Interfaces:**
- Consumes: `LessonStep`, `Hints` from `./types`.
- Produces:
  - `class PgLessonHints` with `nextPrompt(step: LessonStep, attempted: boolean): string | null`, `rung(stepId: string): number`, `reset(): void`
  - `RUNG_COUNT = 3`

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/hints.test.ts`:

```ts
import { PgLessonHints, RUNG_COUNT } from "./hints";
import type { LessonStep } from "./types";

const step: LessonStep = {
  id: "greet",
  objective: "Give hello a name argument",
  verifiedBy: "the interface shows hello(name)",
  verify: { kind: "idl", instruction: "hello", arg: "name" },
  target: "build",
  hints: [
    "Ask me a question that points at what I am missing.",
    "Name the concept and where to look.",
    "Propose the patch.",
  ],
};

const other: LessonStep = { ...step, id: "deploy" };

describe("PgLessonHints", () => {
  beforeEach(() => PgLessonHints.reset());

  it("starts every step at rung zero", () => {
    expect(PgLessonHints.rung(step.id)).toBe(0);
  });

  it("climbs one rung per ask once an attempt exists", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 1 of 3");
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 2 of 3");
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 3 of 3");
    expect(PgLessonHints.rung(step.id)).toBe(RUNG_COUNT);
  });

  it("carries the step's own text for the rung it is on", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.hints[0]);
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.hints[1]);
  });

  it("names the objective, so the assistant answers inside the step", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.objective);
  });

  it("caps at rung one until an attempt exists", () => {
    expect(PgLessonHints.nextPrompt(step, false)).toContain("Hint 1 of 3");
    expect(PgLessonHints.nextPrompt(step, false)).toBeNull();
    expect(PgLessonHints.rung(step.id)).toBe(1);
  });

  it("releases the cap once an attempt exists", () => {
    PgLessonHints.nextPrompt(step, false);
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 2 of 3");
  });

  it("returns null past the last rung rather than repeating one", () => {
    for (let i = 0; i < RUNG_COUNT; i++) PgLessonHints.nextPrompt(step, true);
    expect(PgLessonHints.nextPrompt(step, true)).toBeNull();
  });

  it("counts each step separately", () => {
    PgLessonHints.nextPrompt(step, true);
    PgLessonHints.nextPrompt(step, true);
    expect(PgLessonHints.rung(step.id)).toBe(2);
    expect(PgLessonHints.rung(other.id)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/hints"`
Expected: FAIL -- `Cannot find module './hints'`

- [ ] **Step 3: Write the ladder**

Create `client-v2/src/views/flow/lessons/hints.ts`:

```ts
import type { LessonStep } from "./types";

/** Question -> locate -> propose */
export const RUNG_COUNT = 3;

/**
 * The hint ladder.
 *
 * Prompt policy is the lever here: the model would otherwise answer
 * immediately, so each rung asks for a different kind of help and the
 * rung is named inside the prompt itself. That makes it the learner's
 * own visible message in the transcript, which is what keeps a ladder
 * nobody counts from quietly becoming an answer machine.
 *
 * Counts live in memory only. A reload starting the learner back at rung
 * one is the safe direction to be wrong in.
 */
export class PgLessonHints {
  /**
   * @param step the step being worked on
   * @param attempted whether the learner has changed the project or run
   * a build since this step became current
   * @returns the prompt to send, or `null` when this step has no rung
   * left to climb -- either the ladder is spent or the first-attempt cap
   * is holding
   */
  static nextPrompt(step: LessonStep, attempted: boolean): string | null {
    const used = PgLessonHints._rungs.get(step.id) ?? 0;
    const ceiling = attempted ? RUNG_COUNT : 1;
    if (used >= ceiling) return null;

    const rung = used + 1;
    PgLessonHints._rungs.set(step.id, rung);

    return [
      `Hint ${rung} of ${RUNG_COUNT}.`,
      `I am on this lesson step: ${step.objective}`,
      `It is finished when ${step.verifiedBy}.`,
      step.hints[rung - 1],
    ].join("\n");
  }

  /** @returns how many rungs this step has spent */
  static rung(stepId: string) {
    return PgLessonHints._rungs.get(stepId) ?? 0;
  }

  /** Clear every count. Called when the workspace changes. */
  static reset() {
    PgLessonHints._rungs.clear();
  }

  private static readonly _rungs = new Map<string, number>();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/hints"`
Expected: PASS, 8 tests.

- [ ] **Step 5: Check types and format**

Run: `yarn test-types && yarn check-format`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/views/flow/lessons/hints.ts client-v2/src/views/flow/lessons/hints.test.ts
git commit -m "Add the lesson hint ladder"
```

---

### Task 6: The Hello Anchor path and the registry barrel

The content. Objectives and prompts are ours; the prose is upstream's,
unedited.

**Files:**
- Create: `client-v2/src/views/flow/lessons/paths/hello-anchor.ts`
- Create: `client-v2/src/views/flow/lessons/paths/index.ts`
- Test: `client-v2/src/views/flow/lessons/paths/hello-anchor.test.ts`

**Interfaces:**
- Consumes: `LessonPath` from `../types`; `validatePath` from `../registry`.
- Produces: `helloAnchorPath: LessonPath`, `LESSON_PATHS: LessonPath[]`

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/paths/hello-anchor.test.ts`:

```ts
import { helloAnchorPath } from "./hello-anchor";
import { validatePath } from "../registry";

describe("the Hello Anchor path", () => {
  it("is valid against the tutorial it names", () => {
    expect(() => validatePath(helloAnchorPath, ["Hello Anchor"])).not.toThrow();
  });

  it("has four steps", () => {
    expect(helloAnchorPath.steps).toHaveLength(4);
  });

  it("ends by checking that hello gained a name argument", () => {
    const last = helloAnchorPath.steps[3];
    expect(last.verify).toEqual({
      kind: "idl",
      instruction: "hello",
      arg: "name",
    });
  });

  it("gives every step three hints and a target stage", () => {
    for (const step of helloAnchorPath.steps) {
      expect(step.hints).toHaveLength(3);
      expect(["write", "build", "deploy", "interact"]).toContain(step.target);
    }
  });

  it("never promises a check it cannot make", () => {
    // The cut verifies the build, the deploy and the IDL. A step whose
    // `verifiedBy` mentions a transaction would be overclaiming -- see
    // the spec's honesty map.
    for (const step of helloAnchorPath.steps) {
      expect(step.verifiedBy.toLowerCase()).not.toContain("transaction");
    }
  });

  it("loads its prose from the tutorial", async () => {
    const page = await helloAnchorPath.steps[0].readPage?.();
    expect(typeof page).toBe("string");
    expect(page).toContain("Anchor");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "paths/hello-anchor"`
Expected: FAIL -- `Cannot find module './hello-anchor'`

- [ ] **Step 3: Write the path**

Create `client-v2/src/views/flow/lessons/paths/hello-anchor.ts`:

```ts
import type { LessonPath } from "../types";

/**
 * A verified path over upstream's `hello-anchor` tutorial.
 *
 * The prose is upstream's, loaded unedited from
 * `src/tutorials/hello-anchor/pages/`. Only the objectives, the
 * verification conditions and the hints are ours, so an upstream sync
 * keeps flowing through.
 *
 * Step 1 is satisfied only once a build has run, which is the point: you
 * find out by building, not by asserting. Step 3 is a reading step
 * because nothing free proves a client call happened -- the honest limit
 * of this cut, and the first thing log verification would fix.
 */
export const helloAnchorPath: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "write-program",
      objective: "Define the hello instruction and log a message",
      verifiedBy: "the built interface shows a hello instruction",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      readPage: () => require("../../../../tutorials/hello-anchor/pages/1.md"),
      hints: [
        "Ask me one question about what my program is still missing. Name no API and show no code.",
        "Name the Anchor macro I still need and the part of lib.rs it belongs in. Do not write the code for me.",
        "Propose the patch to lib.rs and explain each changed line.",
      ],
    },
    {
      id: "deploy",
      objective: "Deploy the program to devnet",
      verifiedBy: "the program is live on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      readPage: () => require("../../../../tutorials/hello-anchor/pages/2.md"),
      hints: [
        "Ask me one question about what has to be true before a deploy can succeed.",
        "Name what my wallet or my build is missing, and where in the UI to see it. Do not act for me.",
        "Walk me through the deploy, one action at a time.",
      ],
    },
    {
      id: "call-client",
      objective: "Call the instruction from the TypeScript client",
      verifiedBy: "you have run the client and read its output",
      verify: { kind: "read" },
      target: "interact",
      readPage: () => require("../../../../tutorials/hello-anchor/pages/3.md"),
      hints: [
        "Ask me one question about how the client knows my program's interface.",
        "Name where the generated client comes from and which file calls it. Do not write it for me.",
        "Propose the client code and explain each line.",
      ],
    },
    {
      id: "greet-by-name",
      objective: "Give hello a name argument and log it",
      verifiedBy: "the built interface shows hello taking a name",
      verify: { kind: "idl", instruction: "hello", arg: "name" },
      target: "build",
      readPage: () => require("../../../../tutorials/hello-anchor/pages/4.md"),
      hints: [
        "Ask me one question about what an instruction argument has to be for Anchor to serialize it. Show no code.",
        "Name the Rust type this argument needs and the two places it has to change. Do not write the patch.",
        "Propose the patch to lib.rs and the test, and explain each changed line.",
      ],
    },
  ],
};
```

Create `client-v2/src/views/flow/lessons/paths/index.ts`:

```ts
import { helloAnchorPath } from "./hello-anchor";
import type { LessonPath } from "../types";

/** Every lesson path the app knows about */
export const LESSON_PATHS: LessonPath[] = [helloAnchorPath];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "paths/hello-anchor"`
Expected: PASS, 6 tests.

The relative depth is four levels: `paths` -> `lessons` -> `flow` ->
`views` -> `src`. Confirm the pages exist with
`ls client-v2/src/tutorials/hello-anchor/pages/` -- there are four,
`1.md` through `4.md`. Upstream's own `HelloAnchor.tsx` `require`s the
same files, so CRA already resolves `.md` to a string.

- [ ] **Step 5: Add the barrel that registers the paths**

The registry is empty until something calls `registerPaths`. One module
does it as a side effect, so nothing can reach the registry before it is
populated.

Create `client-v2/src/views/flow/lessons/index.ts`:

```ts
import { LESSON_PATHS } from "./paths";
import { registerPaths } from "./registry";
import { TUTORIALS } from "../../../tutorials";

registerPaths(
  LESSON_PATHS,
  TUTORIALS.map((t) => t.name)
);

export { getLessonPath } from "./registry";
export { INITIAL_LESSON_STATE, PgLesson } from "./store";
export type { LessonState } from "./store";
```

`./store` does not exist until Task 7, so add only the `getLessonPath`
line now and append the two `store` lines at the end of Task 7. Until
then `yarn test-types` would fail on an unresolved import.

- [ ] **Step 6: Check types and format**

Run: `yarn test-types && yarn check-format`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow/lessons/paths/
git commit -m "Add the Hello Anchor lesson path"
```

---

### Task 7: The lesson store

One store: the loaded path, its progress, and whether the learner has
attempted the current step.

**Files:**
- Create: `client-v2/src/views/flow/lessons/store.ts`
- Test: `client-v2/src/views/flow/lessons/store.test.ts`

**Interfaces:**
- Consumes: `advance`, `continueRead`, `currentStep`, `stepNumber`, `EMPTY_PROGRESS` from `./progress`; `getLessonPath` from `./registry`; `PgLessonHints` from `./hints`; `PgFlow` from `../state/stage`.
- Produces:
  - `interface LessonState { path; progress; attempted; attemptBaseline }`
  - `class PgLesson` with `state`, `init(): Disposable`, `onDidChange(cb): Disposable`, `continueRead()`
  - `reduceLesson(state, ev): LessonState` -- the pure reducer the tests drive

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/store.test.ts`:

```ts
import { INITIAL_LESSON_STATE, reduceLesson } from "./store";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { LessonPath } from "./types";
import type { Idl } from "@coral-xyz/anchor";

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "one",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
  ],
};

const IDL = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

describe("reduceLesson", () => {
  const loaded = { ...INITIAL_LESSON_STATE, path: PATH };

  it("does nothing without a path", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done" },
      idl: IDL,
    });
    expect(next).toBe(INITIAL_LESSON_STATE);
  });

  it("advances the ratchet on evaluate", () => {
    const next = reduceLesson(loaded, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done" },
      idl: IDL,
    });
    expect(next.progress.completedStepIds).toEqual(["one"]);
  });

  it("counts a build started since the step began as an attempt", () => {
    const next = reduceLesson(loaded, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, buildStartedAt: 1000 },
      idl: null,
    });
    expect(next.attempted).toBe(true);
  });

  it("does not count a build that predates the step", () => {
    const started = { ...loaded, attemptBaseline: 1000 };
    const next = reduceLesson(started, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, buildStartedAt: 1000 },
      idl: null,
    });
    expect(next.attempted).toBe(false);
  });

  it("clears the attempt when the step advances", () => {
    const attempted = { ...loaded, attempted: true, attemptBaseline: null };
    const next = reduceLesson(attempted, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done", buildStartedAt: 1000 },
      idl: IDL,
    });
    expect(next.progress.completedStepIds).toEqual(["one"]);
    expect(next.attempted).toBe(false);
    expect(next.attemptBaseline).toBe(1000);
  });

  it("resets everything when the workspace stops being a lesson", () => {
    const dirty = {
      path: PATH,
      progress: { completedStepIds: ["one"], currentStepId: "two" },
      attempted: true,
      attemptBaseline: 1000,
    };
    const next = reduceLesson(dirty, { type: "load", path: null });
    expect(next).toEqual(INITIAL_LESSON_STATE);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/store"`
Expected: FAIL -- `Cannot find module './store'`

- [ ] **Step 3: Write the store**

Create `client-v2/src/views/flow/lessons/store.ts`:

```tsx
import type { Idl } from "@coral-xyz/anchor";

import { PgLessonHints } from "./hints";
import { advance, continueRead, currentStep, EMPTY_PROGRESS } from "./progress";
import type { LessonProgress } from "./progress";
import { getLessonPath } from "./registry";
import type { LessonPath } from "./types";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgExplorer, PgProgramInfo, PgTutorial } from "../../../utils";
import type { Disposable } from "../../../utils";

export interface LessonState {
  /** `null` whenever the active workspace is not a lesson with a path */
  path: LessonPath | null;
  progress: LessonProgress;
  /**
   * Whether the learner has run a build since the current step became
   * current. Gates the hint ladder above rung one -- an unaided first
   * attempt is the one intervention with RCT evidence behind it.
   */
  attempted: boolean;
  /**
   * `flow.buildStartedAt` at the moment the current step began. An
   * attempt is any build started after this. Derived rather than
   * event-driven because `PgExplorer` has no file-write event, and a
   * build is the truer signal anyway: editing without building is not
   * an attempt at a build-verified step.
   */
  attemptBaseline: number | null;
}

export const INITIAL_LESSON_STATE: LessonState = {
  path: null,
  progress: EMPTY_PROGRESS,
  attempted: false,
  attemptBaseline: null,
};

export type LessonEvent =
  | { type: "load"; path: LessonPath | null; progress?: LessonProgress }
  | { type: "evaluate"; flow: FlowState; idl: Idl | null }
  | { type: "continue-read" };

/** Pure reducer, so the ratchet's rules are testable without a browser. */
export const reduceLesson = (
  state: LessonState,
  ev: LessonEvent
): LessonState => {
  switch (ev.type) {
    case "load":
      return ev.path
        ? {
            path: ev.path,
            progress: ev.progress ?? EMPTY_PROGRESS,
            attempted: false,
            attemptBaseline: null,
          }
        : INITIAL_LESSON_STATE;

    case "evaluate": {
      if (!state.path) return state;

      const progress = advance(state.path, state.progress, ev.flow, ev.idl);
      const stepChanged = progress !== state.progress;

      // A new step starts with no attempt behind it, so the ladder caps
      // at rung one again and the baseline moves to now.
      if (stepChanged) {
        return {
          ...state,
          progress,
          attempted: false,
          attemptBaseline: ev.flow.buildStartedAt,
        };
      }

      const attempted =
        ev.flow.buildStartedAt !== null &&
        ev.flow.buildStartedAt !== state.attemptBaseline;
      if (attempted === state.attempted) return state;
      return { ...state, attempted };
    }

    case "continue-read": {
      if (!state.path) return state;
      const progress = continueRead(state.path, state.progress);
      if (progress === state.progress) return state;
      return { ...state, progress, attempted: false, attemptBaseline: null };
    }
  }
};

const STORAGE_DEFAULT: { lesson: LessonProgress } = {
  lesson: EMPTY_PROGRESS,
};

/**
 * The lesson the learner is in, if any.
 *
 * Progress is written through to `PgTutorial.getStorage`, whose file
 * lives at `.workspace/tutorial-storage.json` inside the lesson's own
 * workspace -- so it is scoped to the lesson and survives everything the
 * dev loop does. Reads and writes are async (IndexedDB under
 * `PgExplorer.fs`), so the store renders from memory and writes behind.
 */
export class PgLesson {
  static get state(): LessonState {
    return PgLesson._state;
  }

  static onDidChange(cb: (s: LessonState) => void): Disposable {
    PgLesson._listeners.add(cb);
    cb(PgLesson._state);
    return { dispose: () => PgLesson._listeners.delete(cb) };
  }

  /** The manual advance, offered only for a `read` step. */
  static continueRead() {
    PgLesson._dispatch({ type: "continue-read" });
  }

  /** Subscribe to client events. Call once from the Flow layout. */
  static init(): Disposable {
    const load = async () => {
      PgLessonHints.reset();
      const path = getLessonPath(PgExplorer.currentWorkspaceName);
      if (!path) {
        PgLesson._dispatch({ type: "load", path: null });
        return;
      }

      let progress = EMPTY_PROGRESS;
      try {
        const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
        progress = (await storage.getItem("lesson")) ?? EMPTY_PROGRESS;
      } catch {
        // A first visit has no file yet, and a read failure costs one
        // lesson's history rather than the session. Start clean.
      }
      PgLesson._dispatch({ type: "load", path, progress });
    };

    const subs: Disposable[] = [
      PgExplorer.onDidSwitchWorkspace(load),
      PgFlow.onDidChange((flow) =>
        PgLesson._dispatch({
          type: "evaluate",
          flow,
          idl: PgProgramInfo.idl ?? null,
        })
      ),
    ];

    load();
    return { dispose: () => subs.forEach((s) => s.dispose()) };
  }

  private static _dispatch(ev: LessonEvent) {
    const before = PgLesson._stepId(PgLesson._state);
    const next = reduceLesson(PgLesson._state, ev);
    if (next === PgLesson._state) return;

    PgLesson._state = next;

    // A fresh step gets a fresh ladder.
    if (PgLesson._stepId(next) !== before) PgLessonHints.reset();
    if (ev.type !== "load") void PgLesson._persist();
    for (const cb of PgLesson._listeners) cb(next);
  }

  /** @returns the current step's id, or `null` outside a lesson */
  private static _stepId(state: LessonState) {
    if (!state.path) return null;
    return currentStep(state.path, state.progress)?.id ?? null;
  }

  private static async _persist() {
    if (!PgLesson._state.path) return;
    try {
      const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
      await storage.setItem("lesson", PgLesson._state.progress);
    } catch {
      // The in-memory ratchet is still correct for this session; a
      // reload loses one step. An error toast mid-lesson costs more.
    }
  }

  private static _state: LessonState = INITIAL_LESSON_STATE;
  private static readonly _listeners = new Set<(s: LessonState) => void>();
}
```

`PgExplorer` has no file-write event -- the closest are
`onDidCreateItem` and `onDidOpenFile` -- which is why `attempted` is
derived from `flow.buildStartedAt` instead of subscribing to one.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/store"`
Expected: PASS, 6 tests.

The test imports only `reduceLesson` and `INITIAL_LESSON_STATE`, but the
module also imports `../../../utils`. If Jest fails resolving that
barrel, mock it at the top of the test the way
`src/views/flow/state/stage.test.ts` already does:

```ts
jest.mock("../../../utils", () => ({
  PgExplorer: {
    currentWorkspaceName: null,
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgProgramInfo: { idl: null },
  PgTutorial: { getStorage: jest.fn() },
}));
```

- [ ] **Step 5: Export the store from the barrel**

Append to `client-v2/src/views/flow/lessons/index.ts`, which Task 6
created:

```ts
export { INITIAL_LESSON_STATE, PgLesson } from "./store";
export type { LessonState } from "./store";
```

- [ ] **Step 6: Verify**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow/lessons/
git commit -m "Add the lesson store"
```

---


### Task 8: One project switcher, and the step rail

The header switcher becomes a menu listing projects and lessons; the
rail's Projects tab is deleted and its slot goes to the lesson's steps.
A started lesson is already a workspace (`PgTutorial.isStarted` is
`allWorkspaceNames.includes(name)`), so today it appears in that list as
a bare name and clicking it calls `switchWorkspace`, which is not
`PgTutorial.open`.

`LeftPanel.tsx` is edited once here rather than twice, so the Projects
tab never has to coexist with the Steps tab.

**Files:**
- Create: `client-v2/src/views/flow/header/workspaces.ts`
- Create: `client-v2/src/views/flow/header/workspaces.test.ts`
- Modify: `client-v2/src/views/flow/header/ProjectSwitcher.tsx` (whole file)
- Create: `client-v2/src/views/flow/lessons/StepRail.tsx`
- Modify: `client-v2/src/views/flow/left/LeftPanel.tsx:11-64`
- Delete: `client-v2/src/views/flow/left/ProjectsTab.tsx`

**Interfaces:**
- Consumes: `getLessonPath`, `PgLesson` from `../lessons`; `stepNumber` from `../lessons/progress`.
- Produces:
  - `interface WorkspaceEntry { name: string; isLesson: boolean; progress: string | null }`
  - `groupWorkspaces(names: string[], isLesson: (n: string) => boolean, progressOf: (n: string) => string | null): { lessons: WorkspaceEntry[]; projects: WorkspaceEntry[] }`
  - `StepRail` (default export React component)

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/header/workspaces.test.ts`:

```ts
import { groupWorkspaces } from "./workspaces";

const isLesson = (n: string) => n.startsWith("Hello ");
const progressOf = (n: string) => (n === "Hello Anchor" ? "3/4" : null);

describe("groupWorkspaces", () => {
  it("splits lessons from projects", () => {
    const { lessons, projects } = groupWorkspaces(
      ["flow-demo", "Hello Anchor", "token-vault", "Hello Solana"],
      isLesson,
      progressOf
    );
    expect(lessons.map((l) => l.name)).toEqual(["Hello Anchor", "Hello Solana"]);
    expect(projects.map((p) => p.name)).toEqual(["flow-demo", "token-vault"]);
  });

  it("carries progress for a lesson and none for a project", () => {
    const { lessons, projects } = groupWorkspaces(
      ["flow-demo", "Hello Anchor"],
      isLesson,
      progressOf
    );
    expect(lessons[0].progress).toBe("3/4");
    expect(projects[0].progress).toBeNull();
  });

  it("preserves the order it was given inside each group", () => {
    const { projects } = groupWorkspaces(
      ["zeta", "alpha"],
      isLesson,
      progressOf
    );
    expect(projects.map((p) => p.name)).toEqual(["zeta", "alpha"]);
  });

  it("handles an empty list", () => {
    expect(groupWorkspaces([], isLesson, progressOf)).toEqual({
      lessons: [],
      projects: [],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "header/workspaces"`
Expected: FAIL -- `Cannot find module './workspaces'`

- [ ] **Step 3: Write the grouping helper**

Create `client-v2/src/views/flow/header/workspaces.ts`:

```ts
export interface WorkspaceEntry {
  name: string;
  isLesson: boolean;
  /** e.g. "3/4", or `null` for a project or an unpathed lesson */
  progress: string | null;
}

/**
 * Split the workspace list the switcher shows.
 *
 * Lessons and projects are grouped rather than interleaved because they
 * behave differently: choosing a lesson has to go through
 * `PgTutorial.open`, which restores its route and page, while a project
 * is a plain `switchWorkspace`.
 */
export const groupWorkspaces = (
  names: string[],
  isLesson: (name: string) => boolean,
  progressOf: (name: string) => string | null
) => {
  const lessons: WorkspaceEntry[] = [];
  const projects: WorkspaceEntry[] = [];

  for (const name of names) {
    const entry: WorkspaceEntry = {
      name,
      isLesson: isLesson(name),
      progress: isLesson(name) ? progressOf(name) : null,
    };
    (entry.isLesson ? lessons : projects).push(entry);
  }

  return { lessons, projects };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "header/workspaces"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rewrite the switcher as a menu**

Replace the whole of `client-v2/src/views/flow/header/ProjectSwitcher.tsx`:

```tsx
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { groupWorkspaces } from "./workspaces";
import type { WorkspaceEntry } from "./workspaces";
import { getLessonPath, PgLesson } from "../lessons";
import { stepNumber } from "../lessons/progress";
import { useOnClickOutside, useRenderOnChange } from "../../../hooks";
import { PgExplorer, PgTutorial } from "../../../utils";

interface ProjectSwitcherProps {
  onOpenGallery: () => void;
}

/**
 * The one place a project is chosen, lessons included.
 *
 * A started lesson is a workspace, so it is already in
 * `allWorkspaceNames`. Choosing one has to go through
 * `PgTutorial.open`, which restores its route and page --
 * `switchWorkspace` alone would land the user in a lesson's files with
 * no lesson around them.
 *
 * Only existing workspaces are listed. Starting something new stays
 * `Browse gallery`, so this never grows into a catalog.
 */
const ProjectSwitcher: FC<ProjectSwitcherProps> = ({ onOpenGallery }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  const [, setLesson] = useState(PgLesson.state);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(wrapperRef, () => setOpen(false), open);

  const current = PgExplorer.currentWorkspaceName ?? null;
  const { lessons, projects } = groupWorkspaces(
    PgExplorer.allWorkspaceNames ?? [],
    (name) => PgTutorial.isWorkspaceTutorial(name),
    describeProgress
  );

  const choose = async (entry: WorkspaceEntry) => {
    setOpen(false);
    if (entry.name === current) return;
    if (entry.isLesson) await PgTutorial.open(entry.name);
    else await PgExplorer.switchWorkspace(entry.name);
  };

  const label = current
    ? `${current}${describeProgress(current) ? ` - ${describeProgress(current)}` : ""}`
    : "No project";

  return (
    <Wrapper ref={wrapperRef}>
      <Trigger
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Name>{label}</Name>
        <Caret viewBox="0 0 12 8" width="10" height="7" aria-hidden>
          <path
            d="M1 1.5L6 6.5L11 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Caret>
      </Trigger>

      {open && (
        <Menu role="menu">
          {lessons.length > 0 && <Group>Lessons</Group>}
          {lessons.map((entry) => (
            <Row
              key={entry.name}
              role="menuitem"
              $active={entry.name === current}
              onClick={() => choose(entry)}
            >
              <RowName>{entry.name}</RowName>
              {entry.progress && <RowMeta>{entry.progress}</RowMeta>}
            </Row>
          ))}

          {projects.length > 0 && <Group>Projects</Group>}
          {projects.map((entry) => (
            <Row
              key={entry.name}
              role="menuitem"
              $active={entry.name === current}
              onClick={() => choose(entry)}
            >
              <RowName>{entry.name}</RowName>
            </Row>
          ))}

          <Separator />
          <Row
            role="menuitem"
            $active={false}
            onClick={() => {
              setOpen(false);
              onOpenGallery();
            }}
          >
            <RowName>Browse gallery</RowName>
          </Row>
        </Menu>
      )}
    </Wrapper>
  );
};

export default ProjectSwitcher;

/**
 * The lesson you are in shows live progress, because `PgLesson` already
 * holds it. Every other lesson shows its length: their progress is on
 * disk in their own workspace and reading it would mean an async fan-out
 * every time the menu opens.
 */
const describeProgress = (name: string) => {
  const path = getLessonPath(name);
  if (!path) return null;

  const lesson = PgLesson.state;
  if (lesson.path?.tutorial === name) {
    return `${stepNumber(path, lesson.progress)} of ${path.steps.length}`;
  }

  return `${path.steps.length} steps`;
};

const Wrapper = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    max-width: 16rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-family: ${theme.font.other.family};
    font-weight: 600;
    cursor: pointer;
    transition: background 140ms ease;

    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Caret = styled.svg`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;

const Menu = styled.div`
  ${({ theme }) => css`
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    z-index: 5;
    min-width: 14rem;
    padding: 0.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    box-shadow: 0 12px 28px #00000066;
  `}
`;

const Group = styled.div`
  ${({ theme }) => css`
    padding: 0.5rem 0.5rem 0.25rem;
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Row = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: ${$active ? theme.colors.default.bgPrimary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.default.bgPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const RowName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowMeta = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Separator = styled.div`
  height: 1px;
  margin: 0.25rem;
  background: ${({ theme }) => theme.colors.default.border};
`;
```

- [ ] **Step 6: Write the step rail**

Create `client-v2/src/views/flow/lessons/StepRail.tsx`:

```tsx
import type { FC } from "react";
import styled, { css } from "styled-components";

import { currentStep } from "./progress";
import type { LessonState } from "./store";

interface StepRailProps {
  state: LessonState;
}

/**
 * The lesson's steps, marked with what actually confirmed them.
 *
 * Rows are deliberately not clickable. The ratchet is the navigation: a
 * click that skipped a verified step would hand back exactly what this
 * design exists to take away.
 */
const StepRail: FC<StepRailProps> = ({ state }) => {
  const { path, progress } = state;
  if (!path) return null;

  const active = currentStep(path, progress);

  return (
    <List>
      {path.steps.map((step) => {
        const done = progress.completedStepIds.includes(step.id);
        const isCurrent = step.id === active?.id;
        const status = done ? "done" : isCurrent ? "current" : "locked";

        return (
          <Row key={step.id} $status={status}>
            <Mark $status={status} aria-hidden>
              {done ? "✓" : isCurrent ? "●" : "○"}
            </Mark>
            <Text>
              <Objective>{step.objective}</Objective>
              <Meta>
                {done
                  ? step.verifiedBy
                  : isCurrent
                  ? `aiming at ${step.target}`
                  : "locked"}
              </Meta>
            </Text>
          </Row>
        );
      })}
    </List>
  );
};

export default StepRail;

type Status = "done" | "current" | "locked";

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Row = styled.div<{ $status: Status }>`
  ${({ theme, $status }) => css`
    display: grid;
    grid-template-columns: 1rem 1fr;
    gap: 0.5rem;
    align-items: start;
    padding: 0.5rem;
    border: 1px solid
      ${$status === "current" ? theme.colors.default.primary : "transparent"};
    border-radius: ${theme.default.borderRadius};
    background: ${$status === "current"
      ? theme.colors.default.bgSecondary
      : "transparent"};
    opacity: ${$status === "locked" ? 0.5 : 1};
  `}
`;

const Mark = styled.span<{ $status: Status }>`
  ${({ theme, $status }) => css`
    color: ${$status === "done"
      ? theme.colors.default.secondary
      : $status === "current"
      ? theme.colors.default.primary
      : theme.colors.default.textSecondary};
  `}
`;

const Text = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Objective = styled.span`
  color: ${({ theme }) => theme.colors.default.textPrimary};
`;

const Meta = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;
```

- [ ] **Step 7: Replace the rail's Projects tab with Steps**

```bash
git rm client-v2/src/views/flow/left/ProjectsTab.tsx
```

In `client-v2/src/views/flow/left/LeftPanel.tsx`, drop the `ProjectsTab`
import, add the lesson subscription, and render `Steps | Files` inside a
lesson and Files alone outside one -- a tab strip only appears when there
is more than one thing to switch between.

```tsx
import type { FC } from "react";
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import Eyebrow from "./Eyebrow";
import StepRail from "../lessons/StepRail";
import { INITIAL_LESSON_STATE, PgLesson } from "../lessons";
import Explorer from "../../sidebar/explorer/Component";
import { useCreateItem } from "../../sidebar/explorer/Component/useCreateItem";
import { PANEL_RADIUS } from "../tokens";

type Tab = "steps" | "files";

/**
 * Where you are inside the current project. Which project you are in is
 * the header switcher's job -- the rail used to answer that too, and two
 * controls for one question is what this change removed.
 */
const LeftPanel: FC = () => {
  const [lesson, setLesson] = useState(INITIAL_LESSON_STATE);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);

  const [tab, setTab] = useState<Tab>("steps");
  // The same upstream hook `ExplorerButtons.tsx` calls for its own hidden
  // "New file" icon button (`NewItemButton` -> `useCreateItem`) -- no
  // upstream edit, no programmatic `.click()` of a hidden button.
  const { createItem } = useCreateItem();

  const inLesson = !!lesson.path;
  const showSteps = inLesson && tab === "steps";

  return (
    <Wrapper>
      {inLesson && (
        <Tabs role="tablist">
          {(["steps", "files"] as const).map((t) => (
            <TabButton
              key={t}
              id={`flow-left-tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls="flow-left-tabpanel"
              $active={tab === t}
              onClick={() => setTab(t)}
            >
              {t === "steps" ? "Steps" : "Files"}
            </TabButton>
          ))}
        </Tabs>
      )}
      <Body
        id="flow-left-tabpanel"
        role={inLesson ? "tabpanel" : undefined}
        aria-labelledby={inLesson ? `flow-left-tab-${tab}` : undefined}
      >
        {showSteps ? (
          <StepRail state={lesson} />
        ) : (
          <>
            {!inLesson && <Eyebrow>Files</Eyebrow>}
            <ExplorerContainer>
              <Explorer />
            </ExplorerContainer>
          </>
        )}
      </Body>
      {!showSteps && (
        <Footer type="button" onClick={createItem}>
          + New file
        </Footer>
      )}
    </Wrapper>
  );
};

export default LeftPanel;
```

Keep every styled component in that file as it is -- only the component
body and its imports change. `LeftPanelProps` and its `onNewProject` are
gone, so remove the prop from `<LeftPanel />` in `Flow.tsx`; the gallery
is now reached from the switcher's `Browse gallery`.

- [ ] **Step 8: Verify the whole suite still passes**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass. `tsc` will name any leftover reference to the deleted
`ProjectsTab`.

- [ ] **Step 9: Check it by hand**

Run `yarn dev`, open `http://localhost:3000`, and confirm: the header
name opens a menu; the menu lists your workspaces, lessons grouped
separately; clicking outside closes it; `Browse gallery` opens the
gallery; and in a plain project the left rail shows Files with no tab
strip.

- [ ] **Step 10: Commit**

```bash
git add client-v2/src/views/flow/header/ client-v2/src/views/flow/left/ client-v2/src/views/flow/lessons/StepRail.tsx
git commit -m "Move project switching into one header menu and add the step rail"
```

---

### Task 9: The objective band

One ask, its verification condition in plain words, the reader button and
the assistant action.

**Files:**
- Create: `client-v2/src/views/flow/lessons/ObjectiveBand.tsx`
- Test: `client-v2/src/views/flow/lessons/band-copy.test.ts`
- Create: `client-v2/src/views/flow/lessons/band-copy.ts`

**Interfaces:**
- Consumes: `PgLesson`, `LessonState` from `./store`; `PgLessonHints` from `./hints`; `currentStep`, `stepNumber` from `./progress`; `PgAssistant` from `../../sidebar/assistant/store`.
- Produces:
  - `describeStep(state): { number: string; objective: string; verifiedBy: string } | null`
  - `assistantLabel(rung: number, attempted: boolean): string`
  - `ObjectiveBand` (default export React component)

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/views/flow/lessons/band-copy.test.ts`:

```ts
import { assistantLabel, describeStep } from "./band-copy";
import { INITIAL_LESSON_STATE } from "./store";
import type { LessonPath } from "./types";

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "one",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
  ],
};

describe("describeStep", () => {
  it("is null outside a lesson", () => {
    expect(describeStep(INITIAL_LESSON_STATE)).toBeNull();
  });

  it("names the current step and its position", () => {
    const d = describeStep({ ...INITIAL_LESSON_STATE, path: PATH });
    expect(d).toEqual({
      number: "Step 1 of 2",
      objective: "Define hello",
      verifiedBy: "Verified when the interface shows hello.",
    });
  });

  it("is null once the path is finished", () => {
    const d = describeStep({
      path: PATH,
      progress: { completedStepIds: ["one", "two"], currentStepId: null },
      attempted: false,
      attemptBaseline: null,
    });
    expect(d).toBeNull();
  });
});

describe("assistantLabel", () => {
  it("invites the learner to open the door", () => {
    expect(assistantLabel(0, false)).toBe("I'm stuck");
    expect(assistantLabel(0, true)).toBe("I'm stuck");
  });

  it("counts the rungs already spent", () => {
    expect(assistantLabel(1, true)).toBe("Another hint (2 of 3)");
    expect(assistantLabel(2, true)).toBe("Another hint (3 of 3)");
  });

  it("says why it is waiting when the cap is holding", () => {
    expect(assistantLabel(1, false)).toBe("Try it first");
  });

  it("says when the ladder is spent", () => {
    expect(assistantLabel(3, true)).toBe("No hints left");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/band-copy"`
Expected: FAIL -- `Cannot find module './band-copy'`

- [ ] **Step 3: Write the copy helpers**

Create `client-v2/src/views/flow/lessons/band-copy.ts`:

```ts
import { currentStep, stepNumber } from "./progress";
import { RUNG_COUNT } from "./hints";
import type { LessonState } from "./store";

/**
 * @returns what the band shows, or `null` when there is no current step
 * -- outside a lesson, or once the path is finished
 */
export const describeStep = (state: LessonState) => {
  if (!state.path) return null;

  const step = currentStep(state.path, state.progress);
  if (!step) return null;

  return {
    number: `Step ${stepNumber(state.path, state.progress)} of ${
      state.path.steps.length
    }`,
    objective: step.objective,
    verifiedBy: `Verified when ${step.verifiedBy}.`,
  };
};

/**
 * The assistant action's label.
 *
 * It reads "I'm stuck" rather than "Do it" on purpose: the learner opens
 * the door, which is the unaided first attempt the learning research
 * asks for, bought with one word of copy. The button is never disabled
 * -- a dead control in a demo is worse than a label that explains
 * itself.
 */
export const assistantLabel = (rung: number, attempted: boolean) => {
  if (rung === 0) return "I'm stuck";
  if (rung >= RUNG_COUNT) return "No hints left";
  if (!attempted) return "Try it first";
  return `Another hint (${rung + 1} of ${RUNG_COUNT})`;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lessons/band-copy"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the band**

Create `client-v2/src/views/flow/lessons/ObjectiveBand.tsx`:

```tsx
import type { FC } from "react";
import styled, { css } from "styled-components";

import { assistantLabel, describeStep } from "./band-copy";
import { PgLessonHints } from "./hints";
import { currentStep } from "./progress";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { PgAssistant } from "../../sidebar/assistant/store";

interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
}

/**
 * One ask, above the editor, always visible.
 *
 * The whole band is the granularity finding made concrete: a single
 * action per step reads faster than a chapter, and the verification
 * condition sits under it in plain words so the learner knows what they
 * are aiming at.
 */
const ObjectiveBand: FC<ObjectiveBandProps> = ({ state, onRead }) => {
  const described = describeStep(state);
  if (!described || !state.path) return null;

  const step = currentStep(state.path, state.progress);
  if (!step) return null;

  const rung = PgLessonHints.rung(step.id);
  const isRead = step.verify.kind === "read";

  const askForHelp = () => {
    const prompt = PgLessonHints.nextPrompt(step, state.attempted);
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  return (
    <Wrapper>
      <Text>
        <Eyebrow>{described.number}</Eyebrow>
        <Objective>{described.objective}</Objective>
        <VerifiedBy>{described.verifiedBy}</VerifiedBy>
      </Text>
      {step.readPage && (
        <Secondary type="button" onClick={onRead}>
          Read the page
        </Secondary>
      )}
      {isRead ? (
        <Primary type="button" onClick={() => PgLesson.continueRead()}>
          Continue
        </Primary>
      ) : (
        <Primary type="button" onClick={askForHelp}>
          {assistantLabel(rung, state.attempted)}
        </Primary>
      )}
    </Wrapper>
  );
};

export default ObjectiveBand;

const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 0.5rem;
    padding: 0.75rem 0.875rem;
    border: 1px solid ${theme.colors.default.primary};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const Text = styled.div`
  flex: 1;
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Eyebrow = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Objective = styled.span`
  color: ${({ theme }) => theme.colors.default.textPrimary};
  font-weight: 600;
`;

const VerifiedBy = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Secondary = styled.button`
  ${({ theme }) => css`
    padding: 0.375rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 9999px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;

    &:hover {
      border-color: ${theme.colors.default.primary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const Primary = styled(Secondary)`
  ${({ theme }) => css`
    border-color: transparent;
    background: ${theme.colors.default.primary};
    color: ${theme.colors.default.textPrimary};
  `}
`;
```

- [ ] **Step 6: Verify**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/flow/lessons/
git commit -m "Add the lesson objective band"
```

---

### Task 10: The reader overlay

Full prose on demand, over the editor, dismissed with Escape.

**Files:**
- Create: `client-v2/src/views/flow/lessons/Reader.tsx`

**Interfaces:**
- Consumes: `LessonStep` from `./types`; `Markdown` from `../../../components/Markdown`; `useKeybind` from `../../../hooks`.
- Produces: `Reader` (default export React component), props `{ step: LessonStep; onClose: () => void }`

- [ ] **Step 1: Write the component**

There is no unit test for this one: it is presentation over an existing
Markdown renderer, and the behaviour worth proving (it opens, it closes,
it does not disturb the editor) is covered by the e2e in Task 13.

Create `client-v2/src/views/flow/lessons/Reader.tsx`:

```tsx
import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import type { LessonStep } from "./types";
import Markdown from "../../../components/Markdown";
import { SpinnerWithBg } from "../../../components/Loading";
import { useAsyncEffect, useKeybind } from "../../../hooks";

interface ReaderProps {
  step: LessonStep;
  onClose: () => void;
}

/**
 * The lesson page, over the editor, only when asked for.
 *
 * Reading is deliberately not a stepper stage: it is not part of the dev
 * loop, and making it one would put a surface into the rotation whose
 * job is to hide the code.
 */
const Reader: FC<ReaderProps> = ({ step, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useAsyncEffect(async () => {
    if (!step.readPage) return;
    try {
      setContent(await step.readPage());
    } catch {
      setFailed(true);
    }
  }, [step]);

  useKeybind("Escape", onClose);

  return (
    <Sheet role="dialog" aria-modal="true" aria-label={step.objective}>
      <Bar>
        <Title>{step.objective}</Title>
        <Close type="button" onClick={onClose} aria-label="Close the page">
          {"×"}
        </Close>
      </Bar>
      <Body>
        {failed ? (
          <Failure>
            This page could not be loaded. The step is unaffected -- prose is
            not what verifies it.
          </Failure>
        ) : content === null ? (
          <SpinnerWithBg loading size="2rem" />
        ) : (
          <Markdown>{content}</Markdown>
        )}
      </Body>
    </Sheet>
  );
};

export default Reader;

const Sheet = styled.div`
  ${({ theme }) => css`
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const Bar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Title = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.other.family};
    font-weight: 600;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Close = styled.button`
  ${({ theme }) => css`
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.default.bgPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const Failure = styled.p`
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;
```

- [ ] **Step 2: Check the imports resolve**

Run: `yarn test-types`
Expected: PASS.

Both APIs were checked against the tree while this plan was written:
`useKeybind(key, handler)` is the two-argument form its own `getDeps`
switch expects, and `components/Markdown/index.ts` re-exports the
component as its default.

- [ ] **Step 3: Format and commit**

```bash
yarn check-format
git add client-v2/src/views/flow/lessons/Reader.tsx
git commit -m "Add the lesson reader overlay"
```

---

### Task 11: Wire the lesson into Flow

Mount the store, put the band above the stage, and host the reader.

**Files:**
- Modify: `client-v2/src/views/flow/Flow.tsx:26-124`
- Modify: `client-v2/src/views/flow/left/LeftPanel.tsx` (drop the prop at the call site)

**Interfaces:**
- Consumes: `PgLesson`, `INITIAL_LESSON_STATE`, `LessonState` from `./lessons` (the barrel, so importing it also registers the paths); `ObjectiveBand`, `Reader` from `./lessons/`; `currentStep` from `./lessons/progress`.
- Produces: nothing importable.

- [ ] **Step 1: Add the subscription and state**

In `client-v2/src/views/flow/Flow.tsx`, add to the imports:

```tsx
import ObjectiveBand from "./lessons/ObjectiveBand";
import Reader from "./lessons/Reader";
import { currentStep } from "./lessons/progress";
// The barrel registers every lesson path as a side effect, so importing
// it here is also what populates the registry for the whole app.
import { INITIAL_LESSON_STATE, PgLesson } from "./lessons";
import type { LessonState } from "./lessons";
```

Add state beside the others:

```tsx
  const [lesson, setLesson] = useState<LessonState>(INITIAL_LESSON_STATE);
  const [reading, setReading] = useState(false);
```

Add `PgLesson.init()` and `PgLesson.onDidChange(setLesson)` to the `subs`
array in the first `useEffect`, after `PgFlow.init()`:

```tsx
      PgFlow.init(),
      PgLesson.init(),
      PgDeployHistory.init(),
      PgFlow.onDidChange(setState),
      PgLesson.onDidChange(setLesson),
```

- [ ] **Step 2: Render the band and the reader**

Replace the `<Center>` block:

```tsx
        <Center>
          <ObjectiveBand state={lesson} onRead={() => setReading(true)} />
          <Stage>
            <StageRouter stage={state.stage} />
            {reading && readingStep && (
              <Reader step={readingStep} onClose={() => setReading(false)} />
            )}
          </Stage>
          <ConsoleDrawer />
        </Center>
```

and derive `readingStep` just above the `return`:

```tsx
  const readingStep = lesson.path
    ? currentStep(lesson.path, lesson.progress)
    : null;
```

Task 8 removed `LeftPanelProps`, so drop the prop at the call site too:
`<LeftPanel />` instead of `<LeftPanel onNewProject={openGallery} />`.
`openGallery` is still used by `Header` and by the empty-workspace
effect, so it stays.

`Stage` needs `position: relative` so the reader's `inset: 0` is measured
against it. Add that line to the `Stage` styled component:

```tsx
const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* The lesson reader covers the stage, not the whole layout */
  position: relative;
`;
```

- [ ] **Step 3: Close the reader when the step changes**

A learner who fixes the code while the page is open should come back to
the editor, not to the next step's prose. Add:

```tsx
  useEffect(() => {
    setReading(false);
  }, [readingStep?.id]);
```

- [ ] **Step 4: Verify**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/Flow.tsx
git commit -m "Mount the lesson band and reader in Flow"
```

---

### Task 12: The lesson surface and the route branch

Give a lesson its own main surface -- the editor alone -- so upstream's
tutorial pane does not compete with the assistant for the right edge.
Tutorials with no lesson path keep upstream's component untouched.

**Files:**
- Create: `client-v2/src/views/flow/lessons/LessonSurface.tsx`
- Modify: `client-v2/src/routes/tutorials/tutorials.tsx:95-100`

**Interfaces:**
- Consumes: `EditorWithTabs` from `../../../components/EditorWithTabs`; `getLessonPath` from `../lessons` (Task 6's barrel).
- Produces: `LessonSurface` (default export React component)

- [ ] **Step 1: Write the surface**

Create `client-v2/src/views/flow/lessons/LessonSurface.tsx`:

```tsx
import EditorWithTabs from "../../../components/EditorWithTabs";

/**
 * What a lesson shows in the main area: the editor, and nothing else.
 *
 * Upstream's `Tutorial` renders the editor beside a markdown pane, which
 * inside Flow would put the lesson text and the assistant on the same
 * edge. Flow supplies the lesson chrome itself -- steps in the rail, the
 * objective above the editor, the page in a reader -- so this surface
 * only has to be the code.
 */
const LessonSurface = () => <EditorWithTabs />;

export default LessonSurface;
```

- [ ] **Step 2: Branch the route**

In `client-v2/src/routes/tutorials/tutorials.tsx`, find the
`setMainPrimary` callback (around line 95, ending with
`return <Tutorial {...tutorial} />;`) and replace its tail:

```tsx
      // Refresh tutorial state
      await PgTutorial.refresh();

      const { default: Tutorial } = await tutorial.importComponent();
      return <Tutorial {...tutorial} />;
```

with:

```tsx
      // Refresh tutorial state
      await PgTutorial.refresh();

      // A tutorial the fork has given a lesson path gets Flow's own
      // chrome instead: steps in the rail, the objective above the
      // editor, the page in a reader. Upstream's component would put
      // its markdown pane on the same edge as the assistant. Every
      // other tutorial takes the branch below, unchanged.
      // The barrel, not `./registry` -- importing it is what registers
      // the paths, and this route can run before Flow has mounted.
      const { getLessonPath } = await import("../../views/flow/lessons");
      if (getLessonPath(tutorial.name)) {
        const { default: LessonSurface } = await import(
          "../../views/flow/lessons/LessonSurface"
        );
        return <LessonSurface />;
      }

      const { default: Tutorial } = await tutorial.importComponent();
      return <Tutorial {...tutorial} />;
```

The dynamic `import()` keeps the route from pulling Flow's lesson module
graph into every tutorial load, and matches how the file already loads
tutorial components.

- [ ] **Step 3: Verify**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass. A path naming a tutorial that does not exist now
fails at boot, which is the intent -- confirm by temporarily changing
`helloAnchorPath.tutorial` to `"Nope"`, running `yarn dev`, seeing the
thrown message in the console, and reverting.

- [ ] **Step 4: Check it by hand**

Run `yarn dev`. Open the gallery, start `Hello Anchor`, and confirm: the
rail shows `Steps | Files`; the objective band names step 1; the editor
fills the centre with no second markdown pane; `Read the page` opens the
tutorial's own page 1 and Escape closes it; another tutorial (e.g.
`Hello Solana`) still opens with upstream's two-pane layout.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/lessons/ client-v2/src/routes/tutorials/tutorials.tsx client-v2/src/views/flow/Flow.tsx
git commit -m "Give a lesson its own main surface"
```

---

### Task 13: The stepper's target ring

One decoration. No change to `FlowState`, to how status is derived, or to
what any stage means.

**Files:**
- Modify: `client-v2/src/views/flow/header/Stepper.tsx`
- Modify: `client-v2/src/views/flow/header/Header.tsx:21-38`

**Interfaces:**
- Consumes: `Stage` from `../state/stage`; `PgLesson`, `currentStep`.
- Produces: `Stepper` gains an optional `target?: Stage | null` prop.

- [ ] **Step 1: Add the prop**

In `client-v2/src/views/flow/header/Stepper.tsx`, extend the props:

```tsx
interface StepperProps {
  state: FlowState;
  onSelect: (stage: Stage) => void;
  /**
   * The stage the current lesson step is aiming at, drawn as a ring.
   * `null` outside a lesson. Nothing else about the stepper changes:
   * the loop stays a loop, and this only says where the lesson is
   * pointing.
   */
  target?: Stage | null;
}
```

Thread it into the map and onto the button:

```tsx
const Stepper: FC<StepperProps> = ({ state, onSelect, target }) => (
```

and on `StageButton` add `$target={stage === target}`, plus the styled
rule:

```tsx
const StageButton = styled.button<{
  $status: StageStatus;
  $selected: boolean;
  $target: boolean;
}>`
```

with, inside its `css` block:

```tsx
    ${({ theme, $target }) =>
      $target &&
      css`
        border-color: ${theme.colors.default.primary};
        box-shadow: 0 0 0 3px ${theme.colors.default.primary}33;
      `}
```

Also extend the `aria-label` so the ring is not colour-only:

```tsx
            aria-label={`${LABEL[stage]}: ${status}${suffix}${
              stage === target ? ", current lesson target" : ""
            }`}
```

- [ ] **Step 2: Pass it from the header**

In `client-v2/src/views/flow/header/Header.tsx`:

```tsx
  const [lesson, setLesson] = useState<LessonState>(INITIAL_LESSON_STATE);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);

  const target = lesson.path
    ? currentStep(lesson.path, lesson.progress)?.target ?? null
    : null;
```

and render `<Stepper state={state} onSelect={PgFlow.setStage} target={target} />`.

- [ ] **Step 3: Verify**

Run: `yarn test-types && yarn check-format && yarn test-unit`
Expected: all pass. The existing stepper has no unit test; `target` is
optional, so nothing that renders `Stepper` without it changes.

- [ ] **Step 4: Check it by hand**

Run `yarn dev`, open `Hello Anchor`, and confirm the ring sits on Build
for step 1 and moves to Deploy for step 2. Outside a lesson no stage is
ringed.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/views/flow/header/
git commit -m "Ring the stage a lesson step is aiming at"
```

---

### Task 14: Lesson context for the assistant

The assistant should answer inside the step the learner is on, and the
learner should be able to see that it read theirs.

**Files:**
- Modify: `client-v2/src/views/sidebar/assistant/bridge/playground-bridge.ts:20-38, 92-113`
- Test: `client-v2/src/views/sidebar/assistant/bridge/lesson-context.test.ts`
- Create: `client-v2/src/views/sidebar/assistant/bridge/lesson-context.ts`

**Interfaces:**
- Consumes: `PgLesson` from `../../../flow/lessons`; `currentStep`, `stepNumber` from `../../../flow/lessons/progress`.
- Produces:
  - `interface LessonContext { name, stepIndex, stepCount, objective, verifiedBy, satisfied }`
  - `describeLesson(state: LessonState): LessonContext | null`
  - `ProjectContext` gains `lesson: LessonContext | null`

- [ ] **Step 1: Write the failing test**

Create
`client-v2/src/views/sidebar/assistant/bridge/lesson-context.test.ts`:

```ts
import { describeLesson } from "./lesson-context";
import { INITIAL_LESSON_STATE } from "../../../flow/lessons/store";
import type { LessonPath } from "../../../flow/lessons/types";

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "one",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
  ],
};

describe("describeLesson", () => {
  it("is null outside a lesson", () => {
    expect(describeLesson(INITIAL_LESSON_STATE)).toBeNull();
  });

  it("describes the current step", () => {
    expect(describeLesson({ ...INITIAL_LESSON_STATE, path: PATH })).toEqual({
      name: "Hello Anchor",
      stepIndex: 1,
      stepCount: 2,
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      satisfied: false,
    });
  });

  it("reports a finished path without a current step", () => {
    const done = describeLesson({
      path: PATH,
      progress: { completedStepIds: ["one", "two"], currentStepId: null },
      attempted: false,
      attemptBaseline: null,
    });
    expect(done).toEqual({
      name: "Hello Anchor",
      stepIndex: 2,
      stepCount: 2,
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      satisfied: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx craco test --watchAll=false --testPathPattern "lesson-context"`
Expected: FAIL -- `Cannot find module './lesson-context'`

- [ ] **Step 3: Write the describer**

Create `client-v2/src/views/sidebar/assistant/bridge/lesson-context.ts`:

```ts
import { currentStep, stepNumber } from "../../../flow/lessons/progress";
import type { LessonState } from "../../../flow/lessons/store";

/** What the assistant may know about the lesson without asking */
export interface LessonContext {
  name: string;
  /** 1-based */
  stepIndex: number;
  stepCount: number;
  objective: string;
  verifiedBy: string;
  /** Whether the toolchain has already confirmed this step */
  satisfied: boolean;
}

/**
 * @returns the lesson's current step, or `null` outside a lesson
 *
 * A finished path reports its last step as satisfied rather than
 * disappearing, so the assistant can still answer questions about what
 * the learner just did.
 */
export const describeLesson = (state: LessonState): LessonContext | null => {
  if (!state.path) return null;

  const step = currentStep(state.path, state.progress);
  const last = state.path.steps[state.path.steps.length - 1];
  const shown = step ?? last;

  return {
    name: state.path.tutorial,
    stepIndex: step
      ? stepNumber(state.path, state.progress)
      : state.path.steps.length,
    stepCount: state.path.steps.length,
    objective: shown.objective,
    verifiedBy: shown.verifiedBy,
    satisfied: !step,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx craco test --watchAll=false --testPathPattern "lesson-context"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add the field to the bridge**

In `client-v2/src/views/sidebar/assistant/bridge/playground-bridge.ts`,
add the import:

```ts
import { describeLesson } from "./lesson-context";
import type { LessonContext } from "./lesson-context";
import { PgLesson } from "../../../flow/lessons";
```

add the field to `ProjectContext`, after `walletConnected`:

```ts
  /** The lesson step the learner is on, when they are in a lesson */
  lesson: LessonContext | null;
```

and fill it in `realBridge.getProjectContext`:

```ts
      walletConnected: !!PgWallet.current,
      lesson: describeLesson(PgLesson.state),
```

- [ ] **Step 6: Verify and fix the mock bridge**

Run: `yarn test-types`

`tsc` will name every other place that builds a `ProjectContext` -- the
mock bridge and any test fixture. Add `lesson: null` to each.

Run: `yarn check-format && yarn test-unit`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add client-v2/src/views/sidebar/assistant/
git commit -m "Tell the assistant which lesson step the learner is on"
```

---

### Task 15: The end-to-end path

One browser test that walks the loop the feature exists for, plus the
final checks.

**Files:**
- Modify: `client-v2/e2e/lesson-path.e2e.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing test**

Append to `client-v2/e2e/lesson-path.e2e.spec.ts`:

```ts
test("a lesson step is finished by the toolchain, not by a click", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto("/");

  const gallery = page.getByRole("dialog");
  await expect(gallery).toBeVisible();
  await gallery.getByRole("tab", { name: /tutorials/i }).click();
  await gallery.getByText("Hello Anchor", { exact: true }).click();

  // The rail switches to the lesson's steps, and the band names step 1.
  await expect(page.getByRole("tab", { name: "Steps" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(
    page.getByText("Define the hello instruction and log a message")
  ).toBeVisible();

  // Nothing has been verified, so no step is marked done.
  await expect(page.getByText("aiming at build")).toBeVisible();

  // The page opens over the editor and closes again.
  await page.getByRole("button", { name: "Read the page" }).click();
  await expect(page.getByRole("dialog", { name: /hello instruction/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /hello instruction/i })
  ).toHaveCount(0);

  // The first ask is a question, not a patch: the ladder starts at rung
  // one and says so.
  await page.getByRole("button", { name: "I'm stuck" }).click();
  await expect(page.getByText("Hint 1 of 3")).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `yarn test-e2e --grep "finished by the toolchain"`
Expected: PASS.

If the assistant panel is collapsed and `Hint 1 of 3` is not visible,
that is the buffered-prompt path in `PgAssistant.requestPrompt`: Flow
subscribes only to reopen the panel. Confirm the panel opened; if it did
not, the `PgAssistant.onDidRequestPrompt` subscription in `Flow.tsx` was
disturbed -- check it survived Task 11's edit.

- [ ] **Step 3: Run everything**

Run: `yarn test-types && yarn check-format && yarn test-unit && yarn test-e2e`
Expected: all pass.

Then run the full gate the repo defines: `yarn test` (types, unit,
build).

- [ ] **Step 4: Check the honesty map by hand**

Read the spec's "Real vs imitation" table and confirm each row against
the running app. In particular: no copy anywhere in the lesson claims a
transaction was checked. Search for it:

```bash
grep -rn "transaction" client-v2/src/views/flow/lessons/
```

Expected: no match in any user-facing string.

- [ ] **Step 5: Commit**

```bash
git add client-v2/e2e/lesson-path.e2e.spec.ts
git commit -m "Cover the lesson path end to end"
```

- [ ] **Step 6: Record the decision**

On the `context-archive` branch, append **D24** to `docs/decisions.md`
using the "Decision to record" section of the spec verbatim as its body:
what was chosen, the four rejected options, and the revisit triggers. Do
not commit it to the feature branch.

---

## Notes for the reviewer

**One prerequisite this plan does not take.** `CI=true yarn build` fails
on every branch, `master-2.0` included, because
`client-v2/src/tutorials/__template/` holds both `Template.tsx` and
`template.ts` and webpack's lazy tutorial context resolves both on a
case-insensitive filesystem. It is roadmap P1 and belongs to the
verification stream, not here -- but this plan adds fifteen commits'
worth of tests to a repository whose `client-v2` has no CI at all. If
that stream has not landed the rename by the time this merges, say so in
the PR rather than letting the first green CI run be impossible.

**Where the risk is.** Task 12's route branch is the only edit to a file
the fork does not own, and Task 1 edits the same file. If they conflict
with an upstream sync, both are small and self-describing.

**What is deliberately missing.** Verification by transaction log,
prerequisites between lessons, per-user progress, and any credential of
ours. Each is written up in the spec's concept section with the reason it
waits.

**What would make this wrong.** If a step turns out to be satisfiable
without the learner having done the work -- for instance if the IDL
survives a failed build and reports the previous shape -- the ratchet
would advance on nothing. Task 3's tests cover the shapes, but the first
manual run of Task 12 should include deliberately breaking `lib.rs`,
rebuilding, and confirming that no step advances.
