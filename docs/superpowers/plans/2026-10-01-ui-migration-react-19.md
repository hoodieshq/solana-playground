# UI Migration: Streams and the React 19 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `client-v2` on React 19 with the product unchanged, as the first stream of the UI migration, and lay out the other streams so they can run in parallel.

**Architecture:** The spike (`spike/react-19`, HOO-1840) already proved the move: the same walk-through is pixel-identical on React 17 and 19. This plan rebuilds that result as a clean branch off `master-2.0`, in commits a reviewer can read one at a time (the race fix, the runtime, the codemod, the hand fixes, the library bumps, the deep-link fix), and turns the spike's walk-through into a permanent end-to-end spec.

**Tech Stack:** React 19.2, react-dom 19.2, CRA 5 + craco 6, TypeScript 5.0.4 (pin kept), Jest 27 via `craco test`, Playwright (`client-v2/e2e`), styled-components 5.3 with `@types/styled-components` 5.1.36, `types-react-codemod`.

**Spec:** `docs/superpowers/specs/2026-10-01-ui-migration-design.md` on `context-archive` (section "The React 19 spike, measured").

## Global Constraints

- `client/` stays byte-identical to upstream; all changes are in `client-v2/`.
- React strict mode stays on (`src/index.tsx`). It is what finds these races.
- TypeScript stays at `=5.0.4` in this stream; lifting the pin is its own ticket.
- Jest stays the runner in this stream; HOO-1715 (vitest) runs beside it.
- Ids, `aria-label`s and test ids never change.
- No `any` or `@ts-ignore` in new code; `import type` for types; 80 columns; prettier as in CI.
- Never install through a symlinked `node_modules`: `test ! -L client-v2/node_modules` before any `yarn add`.
- Commits: present tense, no prefix for client changes. No AI attribution anywhere.

## Review Focus

1. **A deep link into a lesson that has not been started** (`/tutorials/<name>/<page>` on a fresh profile) must stay on that page, as it does on React 17 — pinned by Task 5's e2e test.
2. **Two route handlers running at once** (strict mode mounts the router effect twice) must not double-initialize the explorer — pinned by Task 1's unit test and Task 6's "create a project" step.
3. **A markdown code block** (lesson pages, assistant answers) must still render through `CodeBlock` after `react-markdown` 9 changed `children` from an array to one node — pinned by Task 4's unit test.
4. **The copy buttons** (`useCopy`, built on `react-use-clipboard`, whose peer range stops at React 18) must still copy and flip to "Copied" — checked by hand in Task 7, because jsdom has no clipboard worth testing.
5. **A thrown error inside a panel** must still reach the error boundary's fallback with its Refresh button, after `ErrorBoundaryChildren` retyped what panels pass it — pinned by Task 3's type check and Task 6's walk-through (any boundary fallback fails the "editor visible" assertion).

---

## The streams

The spec's plan runs as parallel streams, each in its own worktree with its own ticket and small PRs. Only Stream A is planned in detail here; each other stream gets its own plan when it starts.

| Stream | Ticket | Depends on | First deliverable |
| --- | --- | --- | --- |
| A. React 19 upgrade | new, In Progress at Task 0 | — | This plan |
| B. Rules | new | — | `client-v2/CLAUDE.md` and the nine decisions in `decisions.md` |
| C. Design system into the repo | new | — | `design-system/` on `master-2.0` with a registry that has no outside URLs |
| D. Foundation | new | B | Browser floor raised, Tailwind 4 beside styled-components, the `@/` alias |
| E. Token bridge | HOO-1802, rescoped | C, D | One palette, two themes, Monaco and xterm reading resolved colours |
| F. Layout shell | HOO-1793, folded in | A, C, E | The new arrangement with today's panels inside |
| G. vitest | HOO-1715 | — | Same test count on vitest (657 tests, 59 suites today) |

---

### Task 0: Branch, ticket, setup

**Files:** none in the repo.

- [ ] **Step 1: Create the ticket** — Linear, team Hoodies, project "Solana Playground", assigned to Slava, state In Progress, title "Move client-v2 to React 19", related to HOO-1840. Body: TLDR (this plan's Goal), Ballpark "2-3 days", DOD = Task 7's checklist. Note its id as `HOO-XXXX` and its git branch name.

- [ ] **Step 2: Worktree off master-2.0**

```bash
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground
git fetch origin master-2.0
git worktree add -b <ticket-branch> .claude/worktrees/react-19 origin/master-2.0
cd .claude/worktrees/react-19
./wasm/stub-packages.sh
SRC=$(realpath ../react19-baseline/client-v2/node_modules)
cp -c -R "$SRC" client-v2/node_modules && test ! -L client-v2/node_modules
cd client-v2 && yarn install --frozen-lockfile --check-files && yarn generate-fast
```

Expected: `Done`, and `node -p 'require("react/package.json").version'` prints `17.0.2`.

- [ ] **Step 3: Baseline numbers**

Run: `CI=true npx craco test --watchAll=false 2>&1 | grep -E "^Tests:|^Test Suites:"`
Expected: `Test Suites: 59 passed`, `Tests: 657 passed`. Write these down; Task 7 compares against them.

---

### Task 1: Run explorer inits one after another

The race exists on React 17 too; strict mode on React 18+ makes it certain. Landing it first, alone, lets a reviewer judge it without the upgrade around it.

**Files:**
- Modify: `client-v2/src/utils/explorer/explorer.ts` (the `static async init(...)` at about line 131)
- Test: `client-v2/src/utils/explorer/explorer.test.ts`

**Interfaces:**
- Produces: `PgExplorer.init(params?)` keeps its public signature and returns `Promise<void>`; the body moves to `private static async _init(params?)`; `private static _initQueue: Promise<void>`.

- [ ] **Step 1: Write the failing test** — append to `explorer.test.ts`:

```ts
describe("init calls that overlap", () => {
  beforeEach(reset);

  // Strict mode mounts the router effect twice, which starts two route
  // handlers, and each one awaits `PgExplorer.init()`. Run side by side, both
  // create the workspace directories and the second fails with EEXIST.
  it("run one after another", async () => {
    const statics = PgExplorer as unknown as {
      _init: (params?: unknown) => Promise<void>;
    };
    const real = statics._init.bind(PgExplorer);
    const order: string[] = [];
    jest.spyOn(statics, "_init").mockImplementation(async (params) => {
      order.push("start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await real(params);
      order.push("end");
    });

    await Promise.all([PgExplorer.init(), PgExplorer.init()]);

    expect(order).toEqual(["start", "end", "start", "end"]);
  });

  it("do not stop the next one when the first fails", async () => {
    const statics = PgExplorer as unknown as {
      _init: (params?: unknown) => Promise<void>;
    };
    jest
      .spyOn(statics, "_init")
      .mockRejectedValueOnce(new Error("first failed"))
      .mockResolvedValueOnce(undefined);

    const first = PgExplorer.init();
    const second = PgExplorer.init();

    await expect(first).rejects.toThrow("first failed");
    await expect(second).resolves.toBeUndefined();
  });

  afterEach(() => jest.restoreAllMocks());
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `CI=true npx craco test --watchAll=false src/utils/explorer/explorer.test.ts`
Expected: FAIL — `_init` is undefined, so `bind` throws.

- [ ] **Step 3: Implement** — in `explorer.ts`, replace the head of `init`:

```ts
  static init(params?: { files?: ExplorerFiles | TupleFiles; name?: string }) {
    // Two inits running side by side both create the workspace directories
    // and the second fails with EEXIST. React's strict mode mounts the router
    // effect twice, which starts two route handlers at once, so run them one
    // after another instead.
    const run = this._initQueue.then(() => this._init(params));
    this._initQueue = run.catch(() => {});
    return run;
  }

  /** Tail of the running and queued `init` calls */
  private static _initQueue: Promise<void> = Promise.resolve();

  private static async _init(params?: {
    files?: ExplorerFiles | TupleFiles;
    name?: string;
  }) {
```

The rest of the old body stays as the body of `_init`. Reference: `git show spike/react-19:client-v2/src/utils/explorer/explorer.ts`, lines 131-150.

- [ ] **Step 4: Run the tests**

Run: `CI=true npx craco test --watchAll=false src/utils/explorer`
Expected: PASS, including the two new tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/explorer/explorer.ts src/utils/explorer/explorer.test.ts
git commit -m "Run explorer inits one after another"
```

---

### Task 2: React 19 runtime and entry point

**Files:**
- Modify: `client-v2/package.json`, `client-v2/yarn.lock`
- Modify: `client-v2/src/index.tsx`
- Modify: `client-v2/src/views/flow/lessons/LessonRoute.test.tsx`

**Interfaces:**
- Produces: `react`/`react-dom` `^19.2.0`, `@types/react`/`@types/react-dom` `^19.2.0` with matching `resolutions` entries, `@types/styled-components` `^5.1.36`.

- [ ] **Step 1: Bump**

```bash
test ! -L node_modules
yarn add react@^19.2.0 react-dom@^19.2.0
yarn add -D @types/react@^19.2.0 @types/react-dom@^19.2.0 @types/styled-components@^5.1.36
node -e 'const f="./package.json",p=require(f);p.resolutions["@types/react"]="^19.2.0";p.resolutions["@types/react-dom"]="^19.2.0";require("fs").writeFileSync(f,JSON.stringify(p,null,2)+"\n")'
yarn install
```

Expected: `node -p 'require("react-dom/package.json").version'` prints `19.x`.

- [ ] **Step 2: Entry point** — `src/index.tsx` becomes:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Port the one React render test** — in `LessonRoute.test.tsx`:
  - replace `import ReactDOM from "react-dom";` and `import { act } from "react-dom/test-utils";` with
    ```ts
    import { act } from "react";
    import { createRoot, type Root } from "react-dom/client";

    // Tells React this environment runs `act`, as React 18+ expects
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    ```
  - add `let root: Root;` beside `let container`, and `root = createRoot(container);` at the end of `beforeEach`;
  - `ReactDOM.unmountComponentAtNode(container)` becomes `root.unmount()`;
  - each `ReactDOM.render(<LessonRoute tutorial={makeTutorial()} />, container)` becomes `root.render(<LessonRoute tutorial={makeTutorial()} />)`.

- [ ] **Step 4: Run the tests** (types are still red here; the next task fixes them)

Run: `CI=true npx craco test --watchAll=false`
Expected: 659 passed (657 plus Task 1's two).

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock src/index.tsx src/views/flow/lessons/LessonRoute.test.tsx
git commit -m "Move client-v2 to React 19"
```

---

### Task 3: Types for React 19

Two commits: the codemod alone (mechanical, reviewed by skimming), then the hand fixes (reviewed line by line).

**Files:**
- Modify (codemod): about 115 files under `client-v2/src`
- Modify (hand): `src/components/ErrorBoundary/ErrorBoundary.tsx`, `src/components/ErrorBoundary/index.ts`, `src/app/Panels/Main/Primary/Primary.tsx`, `src/app/Panels/Side/Right/Right.tsx`, `src/app/Panels/Main/Secondary/Secondary.tsx`, `src/hooks/useOnClickOutside.tsx`

**Interfaces:**
- Produces: `export type ErrorBoundaryChildren = ReactNode | ChildrenError;` from `components/ErrorBoundary` (re-exported from its `index.ts`); `useOnClickOutside(ref: RefObject<HTMLElement | null>, ...)`.

- [ ] **Step 1: Codemod**

```bash
for c in implicit-children scoped-jsx useCallback-implicit-any; do
  npx -y types-react-codemod@latest $c ./src --yes
done
npx prettier --write $(git diff --name-only -- src)
```

- [ ] **Step 2: Commit the codemod alone**

```bash
git add src && git commit -m "Run the React 19 type codemods"
```

- [ ] **Step 3: See what is left**

Run: `npx tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "Markdown\|react-markdown\|Select.tsx\|Connect.tsx\|Settings.tsx\|Workspaces.tsx"`
Expected: errors in exactly the six hand-fix files above (the excluded ones belong to Task 4's library bumps).

- [ ] **Step 4: Hand fixes**
  - `ErrorBoundary.tsx`: above `interface ChildrenError {` add
    ```ts
    /** What a panel may hand the boundary: content, or an error to show */
    export type ErrorBoundaryChildren = ReactNode | ChildrenError;
    ```
    and make the last line of `render()`
    ```ts
        // An error object never reaches here: the branches above handle it
        return this.props.children as ReactNode;
    ```
  - `ErrorBoundary/index.ts`: add `export type { ErrorBoundaryChildren } from "./ErrorBoundary";`
  - `Primary.tsx`, `Right.tsx`, `Secondary.tsx`: `useState<ReactNode>(null)` becomes `useState<ErrorBoundaryChildren>(null)`, imported as `import ErrorBoundary, { type ErrorBoundaryChildren } from ".../components/ErrorBoundary";` (drop `ReactNode` from the react import where it is now unused).
  - `Primary.tsx`: `setEl(PgCommon.callIfNeeded(await el()));` becomes `setEl(PgCommon.callIfNeeded(await el()) as ErrorBoundaryChildren);`
  - `Right.tsx`: `setEl({ error: e, refresh: setContent });` becomes `setEl({ error: e as Error, refresh: setContent });`
  - `Secondary.tsx`: `{action.icon}` becomes `{PgCommon.callIfNeeded(action.icon)}` (an `Elementable` may be a function, which React 19's types no longer accept as a child).
  - `useOnClickOutside.tsx`: `ref: RefObject<HTMLElement>,` becomes `ref: RefObject<HTMLElement | null>,`

  Reference for every hunk: `git show spike/react-19 -- <file>`.

- [ ] **Step 5: Check**

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` — Expected: only the Task 4 files remain (about 15 errors in `Markdown.tsx`, `Select.tsx`, `Connect.tsx`, `Settings.tsx`, `Workspaces.tsx`, `react-markdown`).
Run: `CI=true npx craco test --watchAll=false` — Expected: 659 passed.

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "Fix the types the React 19 codemods leave"
```

---

### Task 4: Libraries that need a newer major for React 19

**Files:**
- Modify: `client-v2/package.json`, `client-v2/yarn.lock`
- Modify: `client-v2/src/components/Markdown/Markdown.tsx` (the `pre` and `a` renderers, about lines 58-90)
- Test: `client-v2/src/components/Markdown/Markdown.test.tsx` (new)

**Interfaces:**
- Consumes: `CodeBlock` (`components/CodeBlock`, props `lang?: string`, `children: string`).

- [ ] **Step 1: Bump**

```bash
test ! -L node_modules
yarn add react-select@^5.10.2 re-resizable@^6.11.2 react-rnd@^10.5.2 react-markdown@^9.1.0 remark-gfm@^4.0.1
rm -rf node_modules/.cache
```

- [ ] **Step 2: Write the failing test** — `src/components/Markdown/Markdown.test.tsx`:

```tsx
jest.mock("../CodeBlock", () => ({
  __esModule: true,
  default: ({ lang, children }: { lang?: string; children: string }) => (
    <pre data-testid="code-block" data-lang={lang}>
      {children}
    </pre>
  ),
}));

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import Markdown from "./Markdown";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("a fenced code block", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  // react-markdown 9 hands `pre` one child where 8 handed an array; the
  // renderer has to find the code either way
  it("renders through CodeBlock with its language and text", async () => {
    await act(async () => {
      root.render(
        <ThemeProvider theme={{} as never}>
          <Markdown>{"```rust\nfn main() {}\n```"}</Markdown>
        </ThemeProvider>
      );
    });

    const block = container.querySelector('[data-testid="code-block"]');
    expect(block?.getAttribute("data-lang")).toBe("rust");
    expect(block?.textContent).toBe("fn main() {}\n");
  });
});
```

If `StyledMarkdown`'s theme access throws on the empty theme, replace `{} as never` with the default theme object the app uses (`PgTheme`'s current theme), and note which in the test's comment.

- [ ] **Step 3: Run it to make sure it fails**

Run: `CI=true npx craco test --watchAll=false src/components/Markdown`
Expected: FAIL. Either Jest cannot parse the ESM-only `react-markdown` 9 (`SyntaxError: Cannot use import statement`), or `children[0]` is undefined. If it is the ESM error, add the markdown packages to Jest's transform in `craco.config.js` under `jest.configure.transformIgnorePatterns`:
`"node_modules/(?!(react-markdown|remark-.*|mdast-.*|micromark.*|unified|unist-.*|vfile.*|hast-.*|bail|trough|devlop|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|ccount|escape-string-regexp|markdown-table|decode-named-character-reference|character-entities|zwitch|longest-streak|trim-lines|estree-util-.*|style-to-.*|inline-style-parser)/)"`
then re-run and expect the `children[0]` failure. (This list is exactly the cost vitest removes; record it in HOO-1715.)

- [ ] **Step 4: Implement** — in `Markdown.tsx`:

```tsx
        /** Links */
        a: (props) => <Link {...(props as unknown as LinkProps)} />,
```

and in the `pre` renderer:

```tsx
          // react-markdown 9 passes one child where 8 passed an array
          const first = <T,>(v: T | T[]) => (Array.isArray(v) ? v[0] : v);
          const codeProps = first((props as any).children).props;
          const lang = codeProps.className?.split("-")?.at(1);
          const code = first(codeProps.children);
```

(`as any` is the line that was already there; do not widen it.)

- [ ] **Step 5: Run types and tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` — Expected: `0`.
Run: `CI=true npx craco test --watchAll=false` — Expected: 660 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock craco.config.js src/components/Markdown
git commit -m "Move react-markdown, react-select and the resize libraries to React 19 versions"
```

---

### Task 5: A deep link into a lesson that has not been started

**Files:**
- Modify: `client-v2/src/routes/tutorials/tutorials.tsx` (`handleTutorial`, the sidebar listener at about line 126 and the sidebar assignment at about line 197)
- Test: `client-v2/e2e/lesson-deep-link.e2e.spec.ts` (new)

**Interfaces:**
- Consumes: the e2e `baseURL` from `playwright.config.ts`.

- [ ] **Step 1: Write the failing e2e test** — `e2e/lesson-deep-link.e2e.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/**
 * A link straight to a lesson page, on a profile that has never started the
 * lesson. The route sets the sidebar to Explorer for a page, and its own
 * sidebar listener used to read that as "the user left a lesson that is not
 * started" and navigate home. React 17 delivered the event before the
 * tutorial state existed, so the listener skipped it; React 18+ batches the
 * update and delivers it after.
 */
test("a lesson page opened by link stays on that page", async ({ page }) => {
  await page.goto("/tutorials/hello-anchor/1");

  await expect(page.locator("pre").first()).toBeVisible();
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor\/1$/);

  // Still there once the debounced sidebar events have all landed
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor\/1$/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `PORT=3000 yarn test-e2e e2e/lesson-deep-link.e2e.spec.ts` (start `yarn dev` first if nothing serves 3000; the config reuses a running server)
Expected: FAIL — URL is `/`.

- [ ] **Step 3: Implement** — in `handleTutorial`, declare at the top of the function body:

```ts
  // The sidebar change this route makes itself, which its own listener must
  // not read as the user leaving the lesson
  let ownSidebarChange: SidebarPageName | undefined;
```

in the listener, right after `if (!p) return;`:

```ts
          if (p.name === ownSidebarChange) {
            ownSidebarChange = undefined;
            return;
          }
```

and in the page branch at the bottom:

```ts
  } else if (!PgView.sidebar.name || PgView.sidebar.name === "Tutorials") {
    ownSidebarChange = "Explorer";
    PgView.sidebar.name = "Explorer";
```

Import `SidebarPageName` with `import type` from where `routes/common.tsx` gets it.

- [ ] **Step 4: Run it, and the lesson specs around it**

Run: `yarn test-e2e e2e/lesson-deep-link.e2e.spec.ts e2e/lesson-path.e2e.spec.ts`
Expected: PASS for both. Then by hand, on a fresh profile: open `/tutorials/hello-anchor` (the about page, lesson not started) and click Explorer in the rail. It must still go home: that is the behaviour the listener exists for, and the fix must only skip the route's own change.

- [ ] **Step 5: Commit**

```bash
git add src/routes/tutorials/tutorials.tsx e2e/lesson-deep-link.e2e.spec.ts
git commit -m "Keep a lesson page opened by link on that page"
```

---

### Task 6: The walk-through as an end-to-end spec

**Files:**
- Create: `client-v2/e2e/editor-walkthrough.e2e.spec.ts`

**Interfaces:**
- Consumes: `seedWorkspace(page, name)` from `e2e/fixtures.ts`.

- [ ] **Step 1: Write the spec** — one `test.describe.serial` over one page, the spike's steps as assertions (source: `/private/tmp/claude-501/-Users-viacheslav-koreshkov-git-hoodies-solana-playground/8c3e7067-b9ea-4af4-8eab-74e8a33387e3/scratchpad/spike/walk.cjs`):

```ts
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { seedWorkspace } from "./fixtures";

/**
 * The editor and its neighbours, end to end. Written for the React 19 move,
 * where every step here matched React 17 pixel for pixel; it stays as the
 * gate for any change to the runtime under the editor.
 */
const mod = process.platform === "darwin" ? "Meta" : "Control";

const editorText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".monaco-editor .view-line")]
      .sort(
        (a, b) =>
          parseFloat((a as HTMLElement).style.top) -
          parseFloat((b as HTMLElement).style.top)
      )
      .map((l) => (l.textContent ?? "").replace(/ /g, " "))
      .join("\n")
  );

const item = (page: Page, name: string) =>
  page.locator("#root-dir").getByText(name, { exact: true }).first();

test.describe.serial("the editor", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await seedWorkspace(page, "walk");
    await expect(page.locator(".monaco-editor").first()).toBeVisible();
  });

  test.afterAll(() => page.close());

  test("shows exactly one editor after creating a project", async () => {
    await expect(page.locator(".monaco-editor")).toHaveCount(1);
  });

  test("formats Rust on Ctrl+S", async () => {
    await page.locator(".monaco-editor .view-lines").first().click();
    await page.keyboard.type("\nfn   ugly( ){let a=1;}");
    await page.keyboard.press("Control+S");
    await expect.poll(() => editorText(page)).toMatch(/fn ugly\(\) \{/);
  });

  test("completes and checks TypeScript", async () => {
    await item(page, "client").click();
    await page.locator("#root-dir").getByText(/client\.ts$/).first().click();
    await page.locator(".monaco-editor .view-lines").first().click();
    await page.keyboard.press(`${mod}+End`);
    await page.keyboard.type("\nconsole.");
    await expect(page.locator(".suggest-widget.visible")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.type("notAThing();");
    await expect(page.locator(".squiggly-error").first()).toBeVisible();
  });

  test("closes every tab to the start screen and reopens", async () => {
    const tabs = page.locator('#tabs [role="button"][id^="/"]');
    while (await tabs.count()) {
      const tab = tabs.first();
      await tab.hover();
      await tab.locator("svg").last().click();
    }
    await expect(page.locator(".monaco-editor")).toHaveCount(0);
    await item(page, "lib.rs").click();
    await expect(page.locator(".monaco-editor")).toHaveCount(1);
    await expect.poll(() => editorText(page)).toMatch(/fn ugly\(\)/);
  });

  test("keeps the edit across a reload", async () => {
    await page.waitForTimeout(2000);
    await page.reload();
    if (!(await item(page, "lib.rs").isVisible())) await item(page, "src").click();
    await item(page, "lib.rs").click();
    await expect.poll(() => editorText(page)).toMatch(/fn ugly\(\)/);
  });

  test("runs a terminal command", async () => {
    await page.getByLabel("Terminal input").first().click();
    await page.keyboard.type("help");
    await page.keyboard.press("Enter");
    await expect(page.locator(".xterm-rows").first()).toContainText("rustfmt");
    await expect(page.locator(".xterm")).toHaveCount(1);
  });
});
```

- [ ] **Step 2: Run it on this branch**

Run: `yarn test-e2e e2e/editor-walkthrough.e2e.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Run it on React 17 to prove it is not shaped to React 19** — copy the file into the `react19-baseline` worktree, run there against its server on 3002 (`E2E_BASE_URL` is not supported, so temporarily set `baseURL` in that worktree's `playwright.config.ts` to `http://localhost:3002`, and revert after).
Expected: PASS, 6 tests.

- [ ] **Step 4: Commit**

```bash
git add e2e/editor-walkthrough.e2e.spec.ts
git commit -m "Add an end-to-end walk-through of the editor"
```

---

### Task 7: Verify and open the PR

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit -p .                       # 0 errors
CI=true npx craco test --watchAll=false     # 660 passed, 0 failed
yarn test-e2e                               # every spec that ran on master-2.0 still passes
NODE_OPTIONS='--max-old-space-size=6144' GENERATE_SOURCEMAP=false npx craco build   # succeeds
```

- [ ] **Step 2: The spike's full walk-through and pixel comparison** against the baseline server: run `walk.cjs` and `extra.cjs` from the spike scratchpad against this branch's dev server and against the production build (serve `build/` with `spa-serve.cjs`), compare with `base/`. Expected: 23 of 23 steps the same, no screenshot differing by more than 0.02%.

- [ ] **Step 3: By hand** — copy the wallet address in wallet settings and a code block's copy button: both copy and flip to "Copied" (Review Focus 4). Open a panel error: Settings → Build server URL → a non-existent URL → Build; the error shows with Refresh (Review Focus 5).

- [ ] **Step 4: PR** — base `master-2.0`. Body: the ticket link first; what changed in one paragraph per commit; the verification numbers; before/after screenshots of three walk-through steps (same pixels is the point); "Not covered: a real deploy, the assistant with a key, an external wallet". Reviewers rogaldh and iamanikeev, assignee Slava. Move the ticket to In Review. Close HOO-1840 with the spike report.
