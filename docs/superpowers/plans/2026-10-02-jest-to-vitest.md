# Jest to vitest (HOO-1715) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `yarn test-unit` in `client-v2` runs under vitest and collects
exactly the 885 tests Jest collects today, with no `jest.*` left in `src/`.

**Architecture:** A `client-v2/vitest.config.ts` we own replaces the Jest
that `craco test` hides inside react-scripts 5. vitest resolves ESM and
`exports` maps natively, so the `jest` block in `package.json` (the
react-markdown 9 `transformIgnorePatterns` list and the two `vfile`/`unist`
`moduleNameMapper` entries) goes away instead of being ported. The suite is
ported mostly by a mechanical rename; the parts that are not mechanical are
the tests that `require()` a module after mocking it, and mock factories
that close over test-file variables.

**Tech Stack:** vitest 5.0.3 (Vite 6-8), jsdom, TypeScript `=5.0.4`
(pinned; HOO-1855 lifts it later), React 19, Node 22.

**Spec:** Linear HOO-1715 (scope and DoD), plus the design approved in chat
on 2026-10-02 and recorded as a D-entry in Task 5. Stacked on PR #45 (React
19, branch `slavakoreshkov/hoo-1850-move-client-v2-to-react-19`).

## Global Constraints

- Base: `origin/slavakoreshkov/hoo-1850-move-client-v2-to-react-19` at
  `6e304ad5`. Branch
  `slavakoreshkov/hoo-1715-move-the-client-v2-unit-suite-from-jest-to-vitest`,
  worktree `.claude/worktrees/hoo-1715`, upstream tracking unset.
- Baseline: **885 tests, 70 suites**, all passing, on `6e304ad5`. The
  per-test list is in the session scratchpad as `jest-baseline.txt`
  (`<file> :: <full name> :: <status>`, 885 unique lines).
- Done means the vitest list equals the baseline list, name for name.
- `client/` is not touched. Out of scope: `yarn test-api`, `yarn test-e2e`.
- No `any`, no `@ts-ignore`, `import type` for types, 80 columns, prettier.
- `GLOBAL_SETTINGS` is **not** defined in the vitest config (rejected in the
  design: no test needs it, and it would mean editing `craco.config.js`).
- Commit messages: present tense, no prefix (client change).
- No AI attribution in commits or the PR.

## Review Focus

1. **A suite that silently stops being collected.** The count check exists
   for this; compare names, not only the total.
2. **A test that passes because a mock stopped applying.** `require()` after
   `jest.mock` in `stage.test.ts`, `deploy-history.test.ts`,
   `connection.test.ts`: under vitest an un-hoisted import can see the real
   module. Each converted test must still fail if its mock is removed.
3. **Mock factories missing an export the code reads.** Jest returns
   `undefined`; vitest throws "No export is defined on the mock". Fix by
   adding the export to the factory, never by loosening the code.
4. **Fake timers leaking between tests.** `tab-sync`, `project-sync`,
   `two-devices` use fake timers; vitest fakes `Date` and `queueMicrotask`
   differently. A leak shows up as a hang or a later test timing out.
5. **`mockReset` semantics.** vitest restores a `vi.fn(impl)`'s `impl` on
   reset; Jest dropped it. A test that relied on the reset returning
   `undefined` would now pass vacuously; Task 3 Step 5 checks a sample.
6. **The two `node` environment specs** (`agent.integration.spec.ts`,
   `mcp.integration.spec.ts`) silently falling back to jsdom.

---

### Task 1: vitest runs beside Jest

**Files:**
- Create: `client-v2/vitest.config.ts`
- Modify: `client-v2/package.json` (devDependencies, a temporary
  `test-vitest` script)
- Modify: `client-v2/tsconfig.json` (`types`)

- [ ] **Step 1: Install**

```sh
cd client-v2 && yarn add -D vitest@5.0.3 jsdom
```

Do not install through a symlinked `node_modules` (check
`readlink node_modules` is empty first).

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

// Webpack loads `.md` as raw text (`asset/source` in craco.config.js), and
// the lesson loaders `require` it that way. Same here: a string export.
const markdownAsText: Plugin = {
  name: "markdown-as-text",
  transform(src, id) {
    if (!id.endsWith(".md")) return null;
    return { code: `export default ${JSON.stringify(src)};`, map: null };
  },
};

export default defineConfig({
  plugins: [markdownAsText],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/setupTests.ts"],
    // CRA's testMatch, so the same files are collected: not `e2e/`
    // (Playwright), not `*.test.mjs` (`node --test`).
    include: [
      "src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
    css: false,
    // CRA 5's Jest config sets `resetMocks: true`; this is vitest's name
    // for it.
    mockReset: true,
  },
});
```

`mockReset: true` matches `react-scripts/scripts/utils/createJestConfig.js:68`
(`resetMocks: true`). One difference: vitest's reset puts back the
implementation passed to `vi.fn(impl)`, Jest's drops it. That can only turn
a failing test into a passing one, which is why Task 3 Step 5 exists.

- [ ] **Step 3: Types**

In `tsconfig.json` `compilerOptions` add `"types": ["vitest/globals",
"node"]`. Run `yarn test-types`. Expected: errors only of the form
`Cannot find name 'jest'` (they go in Task 2). Any other new error means the
`types` list dropped an ambient package; add it to the list.

- [ ] **Step 4: Temporary script and first run**

Add `"test-vitest": "vitest run"`. Run `yarn test-vitest 2>&1 | tail -30`.
Expected: test files fail with `jest is not defined`; files that use no
`jest.*` pass. Record the passing count.

- [ ] **Step 5: Commit**

```sh
git add package.json yarn.lock vitest.config.ts tsconfig.json
git commit -m "Add vitest beside Jest"
```

### Task 2: Port the suite mechanically

**Files:** every `src/**/*.{test,spec}.{ts,tsx}` and `src/setupTests.ts`,
`src/test-utils/mock-fs.ts`.

- [ ] **Step 1: Rename calls**

```sh
grep -rlE '\bjest\.' src | xargs sed -i '' -E \
  -e 's/\bjest\.(fn|spyOn|mock|restoreAllMocks|clearAllMocks|resetModules|useFakeTimers|useRealTimers|advanceTimersByTime)\b/vi.\1/g'
```

- [ ] **Step 2: Rename types**

`jest.Mock` becomes `Mock`, `jest.SpyInstance` becomes `MockInstance`
(no generics are used anywhere today). Add
`import type { Mock, MockInstance } from "vitest";` with only the names the
file uses, at the top of each touched file.

- [ ] **Step 3: Environment comments**

`/** @jest-environment node */` becomes `// @vitest-environment node` in
`src/features/agent/agent.integration.spec.ts` and
`src/features/mcp/mcp.integration.spec.ts`. Fix the comment on the next
lines of `agent.integration.spec.ts` that names jest.

- [ ] **Step 4: Run and list what is left**

`yarn test-vitest 2>&1 | grep -E 'FAIL|Error' | sort | uniq`. What remains
belongs to Task 3. Do not fix anything here that is not a rename.

- [ ] **Step 5: Commit**

```sh
git commit -am "Rename the suite's jest calls to vi"
```

### Task 3: The parts that are not a rename

**Files:**
- `src/setupTests.ts:28-30` (`require` in the fs mock factory)
- `src/utils/github.test.ts:11-14` (factory closes over `mockSetModal`)
- `src/providers/globals/GlobalsProvider.test.tsx:14`,
  `src/commands/deploy/additional-len.test.ts:8` (`jest.requireActual`)
- `src/views/flow/console/status.test.ts:25` (`jest.requireMock`)
- `src/views/flow/state/stage.test.ts`,
  `src/views/flow/state/deploy-history.test.ts`,
  `src/constants/__tests__/connection.test.ts` (`require` in test bodies)
- `src/components/Editor/Monaco/editor-buffers.test.ts:11-18` (`require`
  of monaco internals)
- any other file Task 2 Step 4 listed

- [ ] **Step 1: Factories that `require`**

```ts
vi.mock("./utils/explorer/fs", async () =>
  (await import("./test-utils/mock-fs")).mockFsModule()
);
```

Update the usage example in the `mock-fs.ts` doc comment the same way.

- [ ] **Step 2: Factories that close over variables**

```ts
const { mockSetModal } = vi.hoisted(() => ({ mockSetModal: vi.fn() }));
vi.mock("./view", () => ({
  PgView: { setModal: (...args: unknown[]) => mockSetModal(...args) },
}));
```

Apply to every factory vitest reports as referencing an uninitialised
variable. Do the same for `mockFetch` in `server.test.ts` if reported.

- [ ] **Step 3: `requireActual` / `requireMock`**

```ts
vi.mock("../../hooks", async () => ({
  useAsyncEffect: (
    await vi.importActual<typeof import("../../hooks/useAsyncEffect")>(
      "../../hooks/useAsyncEffect"
    )
  ).useAsyncEffect,
}));
```

(Keep whatever the original factory picked off the actual module; the
shape above is the pattern.) For `status.test.ts`, replace
`jest.requireMock(path)` with a top-level
`import * as buildOutputModule from "<path>"` and read the mock through it;
`vi.mocked` gives the type.

- [ ] **Step 4: `require` inside test bodies**

Make each test `async` and replace `const { X } = require("p")` with
`const { X } = await import("p")`. In `connection.test.ts`, keep the
`vi.resetModules()` immediately before each `await import("../connection")`
so each test gets a fresh module. In `editor-buffers.test.ts`, replace the
`require` of monaco's `esm` internals with static `import` statements of the
same paths (they are ESM; that is why Jest had them in the transform list).

- [ ] **Step 5: Prove the converted mocks still bite**

For one test in each of `stage.test.ts`, `deploy-history.test.ts` and
`connection.test.ts`: temporarily delete its `vi.mock(...)` (or the env stub
for `connection`) and run the file. Expected: FAIL. Restore it. A test that
still passes without its mock was not testing through the mock; stop and
look before going on.

- [ ] **Step 6: Missing mock exports**

For each "No export is defined on the mock" error, add the named export to
that factory with the value the code under test needs (usually `{}` or
`vi.fn()`).

- [ ] **Step 7: Run to green**

`yarn test-vitest`. Expected: 70 files, 885 tests, all pass. Then
`yarn test-types` clean.

- [ ] **Step 8: Commit**

```sh
git commit -am "Port the mocks vitest does not take as a rename"
```

### Task 4: Jest leaves

**Files:**
- Modify: `client-v2/package.json` (`test-unit`, drop `test-vitest`, drop
  the `jest` block, drop `@types/jest`)
- Delete: `client-v2/config/jest/fileTransform.js` (and the empty dir)

- [ ] **Step 1: Switch the script and delete Jest config**

`"test-unit": "vitest run"`. Remove `test-vitest`, the whole `"jest": {...}`
block, and `@types/jest` (`yarn remove @types/jest`). Delete
`config/jest/`.

- [ ] **Step 2: Nothing named jest is left**

```sh
grep -rnE '\bjest\b' src config package.json vitest.config.ts
```

Expected: no output (prose comments that say "Jest" when explaining
history are rewritten to name vitest or removed).

- [ ] **Step 3: Same tests, name for name**

```sh
yarn vitest run --reporter=json --outputFile=$S/vitest.json
node -e '
const r=require(process.argv[1]);const p=require("path");
const out=r.testResults.flatMap(s=>s.assertionResults.map(a=>
  p.relative(process.cwd(),s.name)+" :: "+a.fullName+" :: "+a.status)).sort();
require("fs").writeFileSync(process.argv[2],out.join("\n")+"\n");
console.log(out.length)' $S/vitest.json $S/vitest.txt
diff $S/jest-baseline.txt $S/vitest.txt
```

Expected: `885` and an empty diff. If only `fullName` formatting differs
(vitest joins describe blocks with `>` or a space), normalise the separator
in the script, not the tests, and diff again.

- [ ] **Step 4: Full gate**

`yarn test-types && yarn test-unit && yarn check-format && yarn build-fast`.
All pass. `yarn test-api` still passes (untouched, but `package.json`
changed).

- [ ] **Step 5: Commit**

```sh
git commit -am "Run the unit suite on vitest and drop Jest"
```

### Task 5: Say so where people read it

**Files:**
- Modify: `CLAUDE.md:68-71` (the `api/*.mjs` gotcha names CRA's Jest)
- Modify: `.github/workflows/client-v2.yml:125-127` (comment names CRA's
  Jest)
- context-archive: `docs/decisions.md` (new D-entry),
  `docs/upstream-divergences.md` (test runner row)

- [ ] **Step 1: CLAUDE.md**

Replace "CRA's Jest is rooted at `src`" with "vitest only collects
`src/**/*.{test,spec}.*`", keep the rest of the bullet.

- [ ] **Step 2: CI comment**

"`node --test`, not CRA's Jest" becomes "`node --test`, not vitest". The
`run: yarn test-unit` step is unchanged: same command, same exit code.

- [ ] **Step 3: Commit (branch)**

```sh
git commit -am "Name vitest where the docs named Jest"
```

- [ ] **Step 4: D-entry and divergence row (context-archive)**

Next free D number. Chosen: vitest 5 with jsdom, own config. Rejected:
defining `GLOBAL_SETTINGS` in the config (no test needs it, costs a
`craco.config.js` edit); upgrading Jest inside react-scripts (overriding a
hidden config). Revisit: if a test needs the `utils` barrel. Divergence row:
`client-v2` runs unit tests on vitest, upstream `client/` on CRA Jest.
Commit on context-archive.

### Task 6: PR and tracking

- [ ] Push the branch; open the PR with base
  `slavakoreshkov/hoo-1850-move-client-v2-to-react-19` (retarget to
  `master-2.0` when #45 merges). Body: Linear link first, then "885/885
  tests, name-for-name diff empty", what went away (the `jest` block), what
  was not mechanical (Task 3). No screenshots: no visual change.
- [ ] Reviewers rogaldh and iamanikeev, assignee ocatave.
- [ ] HOO-1715 to In Review with the PR linked; mirror into the team sheet
  (`linear-sheet-sync`).
