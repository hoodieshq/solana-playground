# Lesson Entry Legibility (D34) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entering a lesson lands the learner on the lesson page, the band signposts the page until it has been opened, the reader names where you go next, and finishing the path leaves you somewhere.

**Architecture:** One new recorded fact in the lesson event log (`opened`), folded into `LessonView.opened` and carried by the trim snapshot. A pure `entryReading(state)` decides when the page opens by itself (only on the `enter` tail, only if unopened). `ObjectiveBand`, `Reader` and `ProjectSwitcher` read the fold; `Flow.tsx` wires the entry effect and records `opened` whenever the reader opens.

**Tech Stack:** React 17 + styled-components (CRA 5 / craco), TypeScript, jest via `craco test`, Playwright e2e. Node 22 at `~/.nvm/versions/node/v22.23.2/bin`; yarn 1.

**Spec:** `docs/superpowers/specs/2026-09-08-lesson-entry-design.md`

## Global Constraints

- Branch `feat/lesson-entry`, based on `feat/lesson-ledger` (PR #20). Never commit `docs/` or `CLAUDE.md` to this branch; they go to `context-archive`.
- No upstream file is touched. Only `client-v2/src/views/flow/**`, `client-v2/src/views/sidebar/**` and `client-v2/e2e/**`.
- CONTRIBUTING: 80 columns, 2-space indent, prettier (`yarn check-format`); no `any`, no `@ts-ignore`; `import type` for types; default export for React components, named for everything else; ASCII only in source.
- Commits: present tense, no prefix (`"Add ..."`), one logical change each. No co-author trailers.
- Copy, verbatim from the spec: `Read step N first` / `Read the page`; `Back to the code`; `Mark as read`; `You have finished <tutorial>.`; `N proved, M marked read.` / `N proved, M skipped -- go back to prove it.`; `Browse gallery`; switcher `done`.
- All commands run from `client-v2/` with `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`.
- Unit tests: `yarn test-unit -- --watchAll=false <pattern>`; types: `yarn test-types`; format: `yarn check-format`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/views/flow/lessons/events.ts` | Event and snapshot types. Gains `opened` event and `opened?` snapshot field; `trimRecord` carries it. |
| `src/views/flow/lessons/ledger.ts` | Folds. `LessonView.opened`; `admits` refuses a repeat `opened`. |
| `src/views/flow/lessons/store.ts` | Reducer and `PgLesson`. `opened` action, `PgLesson.opened(stepId)`. |
| `src/views/flow/lessons/reading.ts` (new) | `entryReading(state)`: the one rule for auto-opening. |
| `src/views/flow/lessons/band-copy.ts` | Copy: `readLabel`, `describeFinish`, `positionLabel`. |
| `src/views/flow/lessons/ObjectiveBand.tsx` | Read button first with unread state; finished state; `onOpenGallery`. |
| `src/views/flow/lessons/Reader.tsx` | Eyebrow, footer with criterion + one action. |
| `src/views/flow/lessons/index.ts` | Barrel exports for the new helpers. |
| `src/views/flow/Flow.tsx` | Entry effect; `read()` records `opened`; new props. |
| `src/views/flow/header/ProjectSwitcher.tsx` | `positionLabel` instead of raw `positionNumber`. |
| `e2e/lesson-path.e2e.spec.ts` | Start lands on the page. |

---

### Task 1: The record learns `opened`

**Files:**
- Modify: `src/views/flow/lessons/events.ts`
- Modify: `src/views/flow/lessons/ledger.ts`
- Test: `src/views/flow/lessons/ledger.test.ts`, `src/views/flow/lessons/events.test.ts`

**Interfaces:**
- Produces: `LessonRecordEvent` variant `{ type: "opened"; stepId: string }`; `LessonSnapshot.opened?: string[]`; `LessonView.opened: ReadonlySet<string>`; `trimRecord(r, foldMarks, foldOpened)` -- third parameter `(record: StoredLesson) => string[]`.

- [ ] **Step 1: Write the failing fold tests in `ledger.test.ts`**

Add a helper next to the other event helpers (after `hint`):

```ts
const opened = (stepId: string) => ({ type: "opened", stepId } as const);
```

Add a new `describe` block after `describe("queries over the log", ...)`:

```ts
describe("opened pages", () => {
  it("folds opened into a set and never touches marks or cursor", () => {
    const v = foldRecord(PATH, record(opened("write"), opened("deploy")));
    expect([...v.opened]).toEqual(["write", "deploy"]);
    expect(marksOf(v)).toEqual(["open", "open", "open"]);
    expect(v.cursor).toBe(0);
  });

  it("admits opened once per step", () => {
    const v = foldRecord(PATH, record(opened("write")));
    const base = { seq: 2, at: 2, actor: "learner" } as const;
    expect(admits(PATH, v, { ...base, ...opened("write") })).toBe(false);
    expect(admits(PATH, v, { ...base, ...opened("deploy") })).toBe(true);
  });

  it("restores opened from a snapshot", () => {
    const v = foldRecord(PATH, {
      v: 2,
      snapshot: { marks: [], opened: ["write"] },
      events: [],
    });
    expect(v.opened.has("write")).toBe(true);
  });
});
```

In the property block's `randomEvent`, widen the alphabet so the invariants are checked with the new kind: change `Math.floor(rand() * 7)` to `Math.floor(rand() * 8)` and add before `default`:

```ts
      case 6:
        return { ...base, type: "opened", stepId: id };
```

- [ ] **Step 2: Write the failing trim test in `events.test.ts`**

Add to `describe("trimRecord", ...)`:

```ts
  it("carries the opened set into the snapshot", () => {
    const long = record(
      Array.from({ length: TRIM_CAP + 1 }, (_, i) => attempt(i + 1))
    );
    const trimmed = trimRecord(long, foldMarks, () => ["write"]);
    expect(trimmed.snapshot?.opened).toEqual(["write"]);
  });
```

Update every existing `trimRecord(x, foldMarks)` call in this file to `trimRecord(x, foldMarks, foldOpened)` and add `const foldOpened = () => [] as string[];` beside `foldMarks`.

- [ ] **Step 3: Run the tests to see them fail**

Run: `yarn test-unit -- --watchAll=false lessons/ledger lessons/events`
Expected: FAIL -- type errors on `"opened"` and on `trimRecord`'s third argument.

- [ ] **Step 4: Add the event and snapshot field in `events.ts`**

In the `LessonRecordEvent` union, after the `hint` variant:

```ts
    /** The learner opened this step's page. Recorded once per step;
     * proves nothing -- `attest` is the only edge a read step has */
    | { type: "opened"; stepId: string }
```

In `LessonSnapshot`:

```ts
  /** Step ids whose page was opened, so the band's signpost survives a
   * trim -- a signpost that forgot would nag again */
  opened?: string[];
```

Change `trimRecord`'s signature and body:

```ts
export const trimRecord = (
  r: StoredLesson,
  foldMarks: (record: StoredLesson) => Array<[string, LessonMark]>,
  foldOpened: (record: StoredLesson) => string[]
): StoredLesson => {
  ...
    snapshot: {
      marks: foldMarks(r),
      opened: foldOpened(r),
      ...(moveTarget !== undefined ? { moveTarget } : {}),
    },
```

Update the doc comment above `LessonSnapshot`: "every mark, the opened set, and the last `move` target".

- [ ] **Step 5: Fold `opened` in `ledger.ts`**

`LessonView` gains:

```ts
  /** Step ids whose page the learner has opened, ever */
  opened: ReadonlySet<string>;
```

`FoldState` gains `opened: Set<string>;`. In `foldRecord`, initialise `opened: new Set(record.snapshot?.opened ?? [])`, and in the event loop, before `applyMarks`:

```ts
    if (ev.type === "opened") state.opened.add(ev.stepId);
```

Return `opened: state.opened` in the view. Add `case "opened":` to the no-op group in `applyCursor` (beside `attempt`/`checked`/`hint`). In `admits`:

```ts
    case "opened":
      return !view.opened.has(ev.stepId);
```

and keep `enter`/`attempt`/`checked`/`hint` returning `true`. In the `admits` "graded/pass/attest" branch the temporary `FoldState` literal needs `opened: new Set()`.

- [ ] **Step 6: Fix the one caller of `trimRecord` in `store.ts`**

In `append`:

```ts
  const record = trimRecord(
    { ...state.record, events: [...state.record.events, ev] },
    (r) => [...foldRecord(path, r).marks.entries()],
    (r) => [...foldRecord(path, r).opened]
  );
```

- [ ] **Step 7: Run the tests and types**

Run: `yarn test-unit -- --watchAll=false lessons/ && yarn test-types`
Expected: all lesson suites PASS, `tsc` clean.

- [ ] **Step 8: Commit**

```bash
git add src/views/flow/lessons/events.ts src/views/flow/lessons/events.test.ts src/views/flow/lessons/ledger.ts src/views/flow/lessons/ledger.test.ts src/views/flow/lessons/store.ts
git commit -m "Record which lesson pages the learner has opened"
```

---

### Task 2: The store action and the entry rule

**Files:**
- Modify: `src/views/flow/lessons/store.ts`
- Create: `src/views/flow/lessons/reading.ts`
- Create: `src/views/flow/lessons/reading.test.ts`
- Modify: `src/views/flow/lessons/index.ts`
- Test: `src/views/flow/lessons/store.test.ts`

**Interfaces:**
- Consumes: `LessonView.opened`, `opened` event (Task 1).
- Produces: `LessonAction` variant `{ type: "opened"; stepId: string; at: number }`; `PgLesson.opened(stepId: string): void`; `entryReading(state: LessonState): LessonStep | null`.

- [ ] **Step 1: Write the failing store tests**

Add to `describe("reduceLesson", ...)` in `store.test.ts`:

```ts
  it("records an opened page once", () => {
    let state = reduceLesson(load(), { type: "opened", stepId: "one", at: 2 });
    expect(view(state).opened.has("one")).toBe(true);
    const again = reduceLesson(state, { type: "opened", stepId: "one", at: 3 });
    expect(again).toBe(state);
  });

  it("refuses opened outside a lesson", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "opened",
      stepId: "one",
      at: 2,
    });
    expect(next).toBe(INITIAL_LESSON_STATE);
  });
```

- [ ] **Step 2: Write the failing `reading.test.ts`**

```ts
jest.mock("../../../utils", () => ({
  PgExplorer: {
    currentWorkspaceName: null,
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgProgramInfo: { idl: null },
  PgTutorial: { getStorage: jest.fn() },
}));

import { entryReading } from "./reading";
import { INITIAL_LESSON_STATE, reduceLesson } from "./store";
import type { LessonState } from "./store";
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
      readPage: () => "# One",
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      hints,
    },
  ],
};

const load = (state = INITIAL_LESSON_STATE): LessonState =>
  reduceLesson(state, { type: "load", path: PATH, at: 1 });

describe("entryReading", () => {
  it("is null outside a lesson", () => {
    expect(entryReading(INITIAL_LESSON_STATE)).toBeNull();
  });

  it("names the cursor step right after enter when its page is unopened", () => {
    expect(entryReading(load())?.id).toBe("one");
  });

  it("is null once the page has been opened", () => {
    const state = reduceLesson(load(), { type: "opened", stepId: "one", at: 2 });
    expect(entryReading(state)).toBeNull();
    // ...and stays null on the next enter, since the record remembers
    expect(entryReading(load(state))).toBeNull();
  });

  it("is null when the tail is not enter", () => {
    const state = reduceLesson(load(), { type: "hint", at: 2 });
    expect(entryReading(state)).toBeNull();
  });

  it("is null when the cursor step has no page", () => {
    const state = reduceLesson(load(), { type: "pass", at: 2 });
    // cursor is now on "two", which has no readPage; re-enter
    expect(entryReading(load(state))).toBeNull();
  });

  it("is null at the end of the path", () => {
    let state = reduceLesson(load(), { type: "pass", at: 2 });
    state = reduceLesson(state, { type: "pass", at: 3 });
    expect(entryReading(load(state))).toBeNull();
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `yarn test-unit -- --watchAll=false lessons/store lessons/reading`
Expected: FAIL -- `opened` is not a `LessonAction`; `./reading` does not exist.

- [ ] **Step 4: Add the action to `store.ts`**

In `LessonAction`, after `hint`:

```ts
  | { type: "opened"; stepId: string; at: number };
```

In `append`'s payload union, after `hint`:

```ts
    | { type: "opened"; stepId: string },
```

In `reduceLesson`, after the `hint` case:

```ts
    case "opened":
      return append(
        state,
        { type: "opened", stepId: action.stepId },
        "learner",
        action.at
      );
```

On `PgLesson`, after `requestHint`:

```ts
  /** Record that the learner opened this step's page. A fact, not a
   * proof: it drives the band's signpost and nothing else. */
  static opened(stepId: string) {
    PgLesson._dispatch({ type: "opened", stepId, at: Date.now() });
  }
```

- [ ] **Step 5: Create `reading.ts`**

```ts
import { cursorStep, foldRecord } from "./ledger";
import type { LessonState } from "./store";
import type { LessonStep } from "./types";

/**
 * The one rule for opening the page by itself: only on entering the
 * lesson, and only when the learner has never opened that page.
 *
 * "Entering" is read off the record rather than off a mount: the store
 * appends `enter` on every load, and every later event moves the tail
 * off it, so a state whose last event is `enter` is exactly the state
 * that landed. Recording `opened` is itself such a later event, which
 * is what keeps the caller's effect from opening twice.
 *
 * @returns the step whose page should open on this state, or `null`
 */
export const entryReading = (state: LessonState): LessonStep | null => {
  if (!state.path) return null;
  const tail = state.record.events[state.record.events.length - 1];
  if (!tail || tail.type !== "enter") return null;

  const view = foldRecord(state.path, state.record);
  const step = cursorStep(state.path, view);
  if (!step || !step.readPage) return null;
  if (view.opened.has(step.id)) return null;
  return step;
};
```

- [ ] **Step 6: Export from the barrel**

In `index.ts` add `export { entryReading } from "./reading";`.

- [ ] **Step 7: Run tests and types**

Run: `yarn test-unit -- --watchAll=false lessons/ && yarn test-types`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/flow/lessons/store.ts src/views/flow/lessons/store.test.ts src/views/flow/lessons/reading.ts src/views/flow/lessons/reading.test.ts src/views/flow/lessons/index.ts
git commit -m "Decide when a lesson page opens by itself"
```

---

### Task 3: Copy for the signpost, the finish and the position

**Files:**
- Modify: `src/views/flow/lessons/band-copy.ts`
- Test: `src/views/flow/lessons/band-copy.test.ts`
- Modify: `src/views/flow/lessons/index.ts`

**Interfaces:**
- Produces:
  - `readLabel(position: number, opened: boolean): string`
  - `positionLabel(path: LessonPath, view: LessonView): string`
  - `describeFinish(state: LessonState): { number: string; objective: string; verifiedBy: string } | null`
  - `describeStep` return gains `opened: boolean` and `position: number`.

- [ ] **Step 1: Write the failing tests in `band-copy.test.ts`**

Extend the import line to `import { assistantLabel, describeFinish, describeStep, positionLabel, primaryLabel, readLabel } from "./band-copy";` and add `import { foldRecord } from "./ledger";`.

Extend the existing `"names the current step, its position and its criterion"` expectation with `opened: false, position: 1`.

Add:

```ts
describe("readLabel", () => {
  it("points at the page until it has been opened", () => {
    expect(readLabel(2, false)).toBe("Read step 2 first");
    expect(readLabel(2, true)).toBe("Read the page");
  });
});

describe("positionLabel", () => {
  it("counts within the path and says done past its end", () => {
    const start = withEvents(PATH, []);
    expect(positionLabel(PATH, foldRecord(PATH, start.record))).toBe("1 of 2");
    const done = withEvents(PATH, [
      {
        seq: 1,
        at: 1,
        actor: "toolchain",
        type: "graded",
        stepIds: ["one", "two"],
      },
    ]);
    expect(positionLabel(PATH, foldRecord(PATH, done.record))).toBe("done");
  });
});

describe("describeFinish", () => {
  it("is null while any step is ahead", () => {
    expect(describeFinish(INITIAL_LESSON_STATE)).toBeNull();
    expect(describeFinish(withEvents(PATH, []))).toBeNull();
  });

  it("summarises an all-proved path", () => {
    const done = withEvents(PATH, [
      {
        seq: 1,
        at: 1,
        actor: "toolchain",
        type: "graded",
        stepIds: ["one", "two"],
      },
    ]);
    expect(describeFinish(done)).toEqual({
      number: "2 of 2 steps",
      objective: "You have finished Hello Anchor.",
      verifiedBy: "2 proved.",
    });
  });

  it("names attested and skipped steps in the record's own words", () => {
    const mixed = withEvents(READ_PATH, [
      { seq: 1, at: 1, actor: "learner", type: "attest", stepId: "one" },
    ]);
    expect(describeFinish(mixed)?.verifiedBy).toBe("1 marked read.");

    const skipped = withEvents(PATH, [
      { seq: 1, at: 1, actor: "learner", type: "pass", stepId: "one" },
      {
        seq: 2,
        at: 2,
        actor: "toolchain",
        type: "graded",
        stepIds: ["two"],
      },
    ]);
    expect(describeFinish(skipped)?.verifiedBy).toBe(
      "1 proved, 1 skipped -- go back to prove it."
    );
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `yarn test-unit -- --watchAll=false lessons/band-copy`
Expected: FAIL -- the three functions are not exported.

- [ ] **Step 3: Implement in `band-copy.ts`**

Add `import type { LessonView } from "./ledger";` and `import type { LessonPath } from "./types";`.

```ts
/**
 * The read button's label. Until the page has been opened it is the
 * signpost D34 asked for -- the one thing that says "read first".
 */
export const readLabel = (position: number, opened: boolean): string =>
  opened ? "Read the page" : `Read step ${position} first`;

/** "2 of 4" inside the path, "done" past its end -- never "5 of 4" */
export const positionLabel = (path: LessonPath, view: LessonView): string =>
  view.cursor === "end"
    ? "done"
    : `${positionNumber(path, view)} of ${path.steps.length}`;
```

In `describeStep`'s returned object add:

```ts
    position: positionNumber(state.path, view),
    opened: view.opened.has(step.id),
```

Add after `describeStep`:

```ts
/**
 * @returns what the band shows once the cursor is past the last step,
 * or `null` while any step is ahead. The summary uses the record's own
 * vocabulary so it can never claim more than the marks do.
 */
export const describeFinish = (state: LessonState) => {
  if (!state.path) return null;
  const view = foldRecord(state.path, state.record);
  if (view.cursor !== "end") return null;

  const count = (mark: LessonMark) =>
    state.path!.steps.filter((s) => view.marks.get(s.id) === mark).length;
  const proved = count("proved");
  const attested = count("attested");
  const passed = count("passed");

  const parts = [
    proved > 0 ? `${proved} proved` : null,
    attested > 0 ? `${attested} marked read` : null,
    passed > 0 ? `${passed} skipped -- go back to prove it` : null,
  ].filter((p): p is string => p !== null);

  return {
    number: `${state.path.steps.length} of ${state.path.steps.length} steps`,
    objective: `You have finished ${state.path.tutorial}.`,
    verifiedBy: `${parts.join(", ")}.`,
  };
};
```

(`state.path!` inside `count` is safe -- the guard above returned; if the linter objects, capture `const { path } = state;` after the null check and use `path` instead.)

- [ ] **Step 4: Export from the barrel**

In `index.ts` add `export { positionLabel } from "./band-copy";`.

- [ ] **Step 5: Run tests and types**

Run: `yarn test-unit -- --watchAll=false lessons/band-copy && yarn test-types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/flow/lessons/band-copy.ts src/views/flow/lessons/band-copy.test.ts src/views/flow/lessons/index.ts
git commit -m "Name the read signpost, the finished path and the position"
```

---

### Task 4: The band signposts and finishes; the switcher says done

**Files:**
- Modify: `src/views/flow/lessons/ObjectiveBand.tsx`
- Modify: `src/views/flow/header/ProjectSwitcher.tsx`
- Modify: `src/views/flow/Flow.tsx` (prop only)

**Interfaces:**
- Consumes: `readLabel`, `describeFinish`, `positionLabel`, `describeStep().opened/.position` (Task 3).
- Produces: `ObjectiveBandProps` gains `onOpenGallery: () => void`.

- [ ] **Step 1: Rewire `ObjectiveBand.tsx`**

Imports: add `describeFinish`, `readLabel` to the `./band-copy` import. Props:

```ts
interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
  onOpenGallery: () => void;
}
```

Replace the body's early returns and the JSX with:

```tsx
const ObjectiveBand: FC<ObjectiveBandProps> = ({
  state,
  onRead,
  onOpenGallery,
}) => {
  const described = describeStep(state);
  const finished = describeFinish(state);
  if (!state.path || (!described && !finished)) return null;

  const view = foldRecord(state.path, state.record);
  const canGoBack = prevLegal(state.path, view) !== null;
  const canGoForward = nextLegal(state.path, view) !== null;

  const nav = (
    <>
      <Nav
        type="button"
        disabled={!canGoBack}
        aria-label="Previous step"
        title={
          canGoBack
            ? "Go back a step. Nothing already proved is undone."
            : "There is nothing to go back to"
        }
        onClick={() => PgLesson.moveBack()}
      >
        &#8592;
      </Nav>
      <Nav
        type="button"
        disabled={!canGoForward}
        aria-label="Next step"
        title={
          canGoForward
            ? "Move forward. Nothing is recorded either way."
            : "This is as far as anything proved reaches"
        }
        onClick={() => PgLesson.moveForward()}
      >
        &#8594;
      </Nav>
    </>
  );

  // Past the last step: say so, and say where to go. The rail's rows
  // are still legal, so the back arrow still works.
  if (finished) {
    return (
      <Wrapper>
        <Text>
          <Eyebrow>{finished.number}</Eyebrow>
          <Objective>{finished.objective}</Objective>
          <VerifiedBy>{finished.verifiedBy}</VerifiedBy>
        </Text>
        <Actions>
          {nav}
          <Secondary type="button" onClick={onOpenGallery}>
            Browse gallery
          </Secondary>
        </Actions>
      </Wrapper>
    );
  }

  const step = cursorStep(state.path, view)!;
  const spent = rung(view, step.id);
  const tried = attempted(state.path, view, step.id);

  const askForHelp = () => {
    const prompt = PgLesson.requestHint();
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  const prove = () => {
    const stage = verifyingStage(step.verify);
    if (stage) PgCommand[stage].execute();
    else PgLesson.attest();
  };

  return (
    <Wrapper>
      <Text>
        <Eyebrow>{described!.number}</Eyebrow>
        <Objective>{described!.objective}</Objective>
        <VerifiedBy>{described!.verifiedBy}</VerifiedBy>
      </Text>
      <Actions>
        {nav}
        {/* First among the actions on purpose: reading comes before
            proving, and until the page has been opened this is the
            band's signpost (D34) */}
        {step.readPage && (
          <Secondary
            type="button"
            $unread={!described!.opened}
            onClick={onRead}
          >
            {!described!.opened && <Dot aria-hidden />}
            {readLabel(described!.position, described!.opened)}
          </Secondary>
        )}
        <Secondary type="button" onClick={askForHelp}>
          {assistantLabel(spent, tried)}
        </Secondary>
        {described!.offersPrimary && (
          <Primary type="button" onClick={prove}>
            {primaryLabel(step.verify)}
          </Primary>
        )}
      </Actions>
    </Wrapper>
  );
};
```

(If the `described!` assertions read badly, narrow once: `const shown = described as NonNullable<typeof described>;` after the `finished` return and use `shown`.)

Style: `Secondary` gains an optional `$unread` prop and a `Dot`:

```ts
const Secondary = styled.button<{ $unread?: boolean }>`
  ${({ theme, $unread }) => css`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid
      ${$unread ? theme.colors.default.primary : theme.colors.default.border};
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

// The unread marker: one dot in the primary colour, nothing that could
// be mistaken for a badge count
const Dot = styled.span`
  ${({ theme }) => css`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: ${theme.colors.default.primary};
  `}
`;
```

`Primary = styled(Secondary)` stays as is.

- [ ] **Step 2: Pass the prop from `Flow.tsx`**

```tsx
<ObjectiveBand
  state={lesson}
  onRead={() => setReading(true)}
  onOpenGallery={openGallery}
/>
```

(`onRead` is rewired in Task 6; this keeps the tree compiling now.)

- [ ] **Step 3: `ProjectSwitcher.tsx` says done**

Replace `positionNumber` with `positionLabel` in the `../lessons` import, and in `describeProgress`:

```ts
  if (lesson.path?.tutorial === name) {
    return positionLabel(path, foldRecord(path, lesson.record));
  }
```

- [ ] **Step 4: Types, format, and a look in the browser**

Run: `yarn test-types && yarn check-format`
Expected: clean (run `yarn format` if prettier complains, then re-check).

Dev server on :3000 (already running with HMR): open Hello Anchor, START, confirm the band reads `<- -> [• Read step 1 first] [I'm stuck] [Build to prove this]`; click Read, close: label stays `Read step 1 first` (the `opened` wiring lands in Task 6). Skip every step: the band reads `4 of 4 steps / You have finished Hello Anchor. / 3 skipped -- go back to prove it, 1 marked read.` and the switcher reads `Hello Anchor - done`.

- [ ] **Step 5: Commit**

```bash
git add src/views/flow/lessons/ObjectiveBand.tsx src/views/flow/header/ProjectSwitcher.tsx src/views/flow/Flow.tsx
git commit -m "Signpost the page in the band and name the finished path"
```

---

### Task 5: The reader names where you are and where you go

**Files:**
- Modify: `src/views/flow/lessons/Reader.tsx`

**Interfaces:**
- Produces: `ReaderProps = { step: LessonStep; position: string; criterion: string; offersAttest: boolean; onClose: () => void; onAttest: () => void }`.

- [ ] **Step 1: Extend the props and the JSX**

```ts
interface ReaderProps {
  step: LessonStep;
  /** "Step 2 of 4" */
  position: string;
  /** The band's criterion line, so the sheet and the band agree */
  criterion: string;
  /** Whether "Mark as read" is the step's edge right now (an
   * attestation kind, cursor at the frontier) -- then the proof sits
   * where the reading ends */
  offersAttest: boolean;
  onClose: () => void;
  onAttest: () => void;
}
```

Bar:

```tsx
      <Bar>
        <Heading>
          <Eyebrow>{position}</Eyebrow>
          <Title>{step.objective}</Title>
        </Heading>
        <Close ...>&times;</Close>
      </Bar>
```

After `<Body>...</Body>`, before `</Sheet>`:

```tsx
      {/* Always visible under the page: what proves this step, and the
          one way on. Esc and the close button still work. */}
      <Footer>
        <Criterion>{criterion}</Criterion>
        {offersAttest ? (
          <FooterPrimary type="button" onClick={onAttest}>
            Mark as read
          </FooterPrimary>
        ) : (
          <FooterAction type="button" onClick={onClose}>
            Back to the code
          </FooterAction>
        )}
      </Footer>
```

Styles to add:

```ts
const Heading = styled.div`
  min-width: 0;
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

const Footer = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid ${theme.colors.default.border};
  `}
`;

const Criterion = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const FooterAction = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
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

const FooterPrimary = styled(FooterAction)`
  ${({ theme }) => css`
    border-color: transparent;
    background: ${theme.colors.default.primary};
  `}
`;
```

- [ ] **Step 2: Types**

Run: `yarn test-types`
Expected: one error in `Flow.tsx` (missing props) -- fixed in Task 6. Commit this task together with Task 6 if that is cleaner; otherwise pass placeholders from Flow now: `position=""`, `criterion=""`, `offersAttest={false}`, `onAttest={() => {}}` and replace them in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/views/flow/lessons/Reader.tsx src/views/flow/Flow.tsx
git commit -m "Give the lesson reader a position and a way on"
```

---

### Task 6: Flow wires entry, `opened`, and the reader's props

**Files:**
- Modify: `src/views/flow/Flow.tsx`

**Interfaces:**
- Consumes: `entryReading` (Task 2), `PgLesson.opened` (Task 2), `describeStep` (Task 3), `ReaderProps` (Task 5).

- [ ] **Step 1: Imports**

From `./lessons` also import `entryReading`; from `./lessons/band-copy` import `describeStep`.

- [ ] **Step 2: The read callback and the two effects**

Replace the existing block from `const readingStep = ...` through the `setReading(false)` effect with:

```tsx
  const readingStep = lesson.path
    ? cursorStep(lesson.path, foldRecord(lesson.path, lesson.record))
    : null;
  const described = describeStep(lesson);

  // Every way the page opens goes through here, so the record learns
  // about it exactly once per step and the band's signpost can rest
  const read = (stepId: string) => {
    setReading(true);
    PgLesson.opened(stepId);
  };

  // A learner who fixes the code while the page is open should come back
  // to the editor, not to the next step's prose.
  useEffect(() => {
    setReading(false);
  }, [readingStep?.id]);

  // Entering the lesson lands on the page -- once. Declared after the
  // effect above so that, on the commit where both fire (a load moves
  // the cursor too), open wins. Recording `opened` moves the record's
  // tail off `enter`, so the next state returns null here and the
  // effect is inert; closing the sheet by hand does not reopen it.
  const entryStep = entryReading(lesson);
  useEffect(() => {
    if (entryStep) read(entryStep.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryStep?.id]);
```

- [ ] **Step 3: The JSX**

```tsx
          <ObjectiveBand
            state={lesson}
            onRead={() => readingStep && read(readingStep.id)}
            onOpenGallery={openGallery}
          />
          <Stage>
            <StageRouter stage={state.stage} />
            {reading && readingStep && described && (
              <Reader
                key={readingStep.id}
                step={readingStep}
                position={described.number}
                criterion={described.verifiedBy}
                offersAttest={
                  described.offersPrimary && readingStep.verify.kind === "read"
                }
                onClose={() => setReading(false)}
                onAttest={() => {
                  PgLesson.attest();
                  setReading(false);
                }}
              />
            )}
          </Stage>
```

- [ ] **Step 4: Types, format, full unit run**

Run: `yarn test-types && yarn check-format && yarn test-unit -- --watchAll=false`
Expected: all green (baseline 265 tests / 29 suites, plus this plan's additions).

- [ ] **Step 5: Browser check**

Fresh profile (private window or clear site data): gallery -> Tutorials -> Hello Anchor -> Open -> START. Expected: page 1 opens over the editor with `Step 1 of 4` eyebrow and a footer `Verified when the built interface shows a hello instruction.` + `Back to the code`. Esc: band reads `Read the page` (opened). Reload: editor, no page. Skip step 1 (rail footer), then skip 2: the band reads `Read step 3 first`; open it: footer shows `Mark as read`; click it: sheet closes, band on step 4 reads `Read step 4 first`.

- [ ] **Step 6: Commit**

```bash
git add src/views/flow/Flow.tsx
git commit -m "Land on the lesson page when entering a lesson"
```

---

### Task 7: The e2e follows the new entry

**Files:**
- Modify: `e2e/lesson-path.e2e.spec.ts`

- [ ] **Step 1: Update the second test**

Replace the block that starts `// The page opens over the editor and closes again.` with:

```ts
  // Entering the lesson lands on its page (D34): the sheet is open with
  // no click, and closing it leaves the band pointing at the code with
  // the plain label, since the record now knows the page was opened.
  await expect(
    page.getByRole("dialog", { name: /hello instruction/i })
  ).toBeVisible();
  await expect(page.getByText("Back to the code")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /hello instruction/i })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Read the page" })
  ).toBeVisible();
```

The `Step 1 of 4` assertion earlier in the test now matches two elements (band eyebrow and reader eyebrow). Change it to `await expect(page.getByText("Step 1 of 4").first()).toBeVisible();` and the `band` locator to `page.getByText("Step 1 of 4").first().locator("..")` -- the band renders before the sheet in DOM order, so `.first()` is the band.

- [ ] **Step 2: Run it against the running dev server**

Run: `yarn test-e2e e2e/lesson-path.e2e.spec.ts`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/lesson-path.e2e.spec.ts
git commit -m "Cover landing on the lesson page in the e2e"
```

---

### Task 8: PR

- [ ] Take the after-screenshots (same states as the before set: after Start, reader, finished, finished switcher) at 1440x900.
- [ ] Copy before/after shots to `docs/internal/assets/2026-09-08-lesson-entry/` on `context-archive` and commit there together with the spec and this plan.
- [ ] `git push -u origin feat/lesson-entry`; `gh pr create --draft --base feat/lesson-ledger` with: what and why (D34, the four gaps), how (the one rule; `opened` in the record), links (spec on context-archive, D34), test instructions (the Task 6 browser check), before/after screenshots via `raw.githubusercontent.com` URLs, and the D25 amendment note.
