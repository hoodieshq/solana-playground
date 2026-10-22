# Desktop tutorial flow: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 1440 desktop view to the tutorial prototype: gallery, tutorial page, a step with two paths (your own code and the assistant's patch), finish, and a Phone and Desktop switcher with shared progress.

**Architecture:** Same entry point, `design-system/prototype/tutorial`. The data (`data.ts`) and the state machine (`store.tsx`) are shared by both views, and the store gains code editing and building your own code. Desktop screens live in `src/prototype/tutorial/desktop/` and reuse parts from `ui/`. The view is picked by the URL parameter `?view=desktop`, and switching reloads the page with `keep` so the store opens the same screen.

**Tech Stack:** Vite 8, React 19, TypeScript, Tailwind 4, design system components from `design-system/src/components/ui` (shadcn), lucide-react, sonner. Pure logic is tested with the built in `node --test` (Node 22.18+ understands TypeScript without flags).

**Spec:** `docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md`. The mobile spec `2026-10-20-mobile-tutorial-prototype-design.md` applies wherever the desktop one is silent.

**Branch:** `almaz/mobile-tutorial-prototype`, a commit after each task. Deploying isn't part of this plan; it happens only after Almaz's ok.

---

## Ground rules for whoever runs this

- All commands run from the `solana-playground/design-system` folder.
- Type check: `npx tsc -p tsconfig.app.json --noEmit`. Expected: empty output and exit code 0.
- Dev server: `preview_start` with the name `playground-design-system` (port 5173). Mobile: `http://localhost:5173/prototype/tutorial/`. Desktop: `http://localhost:5173/prototype/tutorial/?view=desktop`. Desktop window 1440×900 (`resize_window`), then 1280×800.
- UI copy is in English, as in the product. Code comments are in English, short phrases with no period at the end, like in the neighboring files.
- The `cn` helper doesn't merge design system classes (`text-title`, `text-caption`, `text-display` and others) with a component's classes, so a size override in a component's `className` is written with `!` (`text-control!`). This is a known quirk, not a bug.
- No em dashes or en dashes in any text (UI, comments, commits).

## File map

New:
- `src/prototype/tutorial/check.ts`: checks hand typed code against the step's reference. A pure function, no React.
- `tests/prototype/check.test.ts`: test for `check.ts` on `node --test`.
- `src/prototype/tutorial/view.ts`: which view is open, the `keep` flag, switching.
- `src/prototype/tutorial/ViewSwitch.tsx`: the Phone and Desktop switcher with Reset.
- `src/prototype/tutorial/ui/StepStatus.tsx`: the step status line, shared by mobile and desktop (moves out of `ActionZone`).
- `src/prototype/tutorial/ui/StepList.tsx`: the step list in the StepRail pattern (moves out of the mobile `Overview`).
- `src/prototype/tutorial/ui/StartOverDialog.tsx`: the Start over dialog (moves out of the mobile `Overview`).
- `src/prototype/tutorial/ui/LessonBlocks.tsx`: lesson blocks and reading time (moves out of `LessonSheet` and `StepScreen`).
- `src/prototype/tutorial/ui/FinishParts.tsx`: badge, stats, what you learned list, Up next card (moves out of the mobile `Finish`).
- `src/prototype/tutorial/desktop/DesktopApp.tsx`: desktop root.
- `src/prototype/tutorial/desktop/Nav.tsx`: product navigation on the left.
- `src/prototype/tutorial/desktop/Column.tsx`: the 360 px lesson column.
- `src/prototype/tutorial/desktop/Workspace.tsx`: header with the stepper, file tab, code area, action bar, terminal.
- `src/prototype/tutorial/desktop/Editor.tsx`: the editor: an input on top of highlighted code.
- `src/prototype/tutorial/desktop/Gallery.tsx`, `Overview.tsx`, `Step.tsx`, `Finish.tsx`: screens.
- `src/prototype/tutorial/desktop/ActionBar.tsx`: the action bar under the editor.
- `src/prototype/tutorial/desktop/Terminal.tsx`: terminal status and contents.
- `src/prototype/tutorial/desktop/QuickCheck.tsx`: Quick check in the lesson column.
- `src/prototype/tutorial/desktop/Feed.tsx`: assistant messages and the question field.

Changed:
- `src/prototype/tutorial/data.ts`: a constant for the transaction signature.
- `src/prototype/tutorial/store.tsx`: the `edit` and `buildOwn` actions, `fixFor`, `freshLines`, the `keep` flag in `load`.
- `src/prototype/tutorial/main.tsx`, `DeviceFrame.tsx`: picking the view.
- `src/prototype/tutorial/ui/ActionZone.tsx`, `ui/BuildLog.tsx`, `screens/StepScreen.tsx`, `screens/Overview.tsx`, `screens/Finish.tsx`, `sheets/ExplainSheet.tsx`, `sheets/LessonSheet.tsx`: switch to the shared parts, with no change to how mobile looks.
- `docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md`: bring the spec in line with what was built (task 11).

---

### Task 1: Checking your own code

**Files:**
- Create: `design-system/src/prototype/tutorial/check.ts`
- Test: `design-system/tests/prototype/check.test.ts`

- [ ] **Step 1: Write a failing test**

Create `design-system/tests/prototype/check.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { checkOwn } from "../../src/prototype/tutorial/check.ts"

// The step 1 target, the same text as LIB_FIXED in data.ts
const TARGET = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {}`

const NO_STRUCT = TARGET.slice(0, TARGET.indexOf("\n\n#[derive(Accounts)]"))
const NO_OK = TARGET.replace("        Ok(())\n", "")

test("matches the target whatever the whitespace", () => {
  const loose = TARGET.replaceAll("    ", "  ").replace("\n\n#[program]", "\n#[program]")
  assert.deepEqual(checkOwn(loose, TARGET, "src/lib.rs"), { ok: true })
})

test("a missing Hello struct is E0412 on the line that asks for it", () => {
  const r = checkOwn(NO_STRUCT, TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 9)
  assert.match(r.log.join("\n"), /E0412/)
  assert.match(r.explain, /#\[derive\(Accounts\)\]/)
})

test("a missing Ok(()) is E0308 on the signature line", () => {
  const r = checkOwn(NO_OK, TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 9)
  assert.match(r.log.join("\n"), /E0308/)
  assert.match(r.explain, /Ok\(\(\)\)/)
})

test("anything else is the step's general error on the first line that differs", () => {
  const r = checkOwn(TARGET.replace('msg!("Hello, World!");', 'msg!("Hi");'), TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 10)
  assert.equal(r.reason, "Your code doesn't match what this step needs yet.")
})

test("an untouched file fails on line 1", () => {
  const r = checkOwn("// Import anchor", TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 1)
})

test("the client runs instead of building", () => {
  const r = checkOwn("// Client code...", "const txHash = await pg.program.methods.hello().rpc();", "client/client.ts")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.log[0], "$ run client/client.ts")
})
```

- [ ] **Step 2: Run it and make sure it fails**

Run: `node --test tests/prototype/check.test.ts`
Expected: FAIL, `Cannot find module` for `check.ts`.

- [ ] **Step 3: Write `check.ts`**

Create `design-system/src/prototype/tutorial/check.ts`:

```ts
import type { Fail } from "./data"

/** What a build of hand-written code finds. The prototype has no compiler, so it compares the
 * file with what the step needs, whitespace aside, and names the two slips newcomers make most */
export type OwnCheck = { ok: true } | (Fail & { explain: string })

const squash = (code: string) => code.replace(/\s+/g, "")

/** The 1-based line that holds `needle`, or 1 */
function lineOf(code: string, needle: string) {
  const i = code.split("\n").findIndex((l) => l.includes(needle))
  return i === -1 ? 1 : i + 1
}

export function checkOwn(code: string, target: string, file: string): OwnCheck {
  if (squash(code) === squash(target)) return { ok: true }
  const rust = file.endsWith(".rs")
  const head = rust ? ["$ anchor build", "Compiling hello_anchor v0.1.0"] : [`$ run ${file}`, "Running client..."]

  if (target.includes("struct Hello") && code.includes("Context<Hello>") && !/struct\s+Hello\b/.test(code)) {
    const line = lineOf(code, "Context<Hello>")
    return {
      ok: false,
      line,
      log: [...head, "error[E0412]: cannot find type `Hello` in this scope", ` --> ${file}:${line}`, "Build failed"],
      reason: `Line ${line} uses Context<Hello>, but there is no Hello struct in the file yet.`,
      explain:
        "In Anchor every instruction receives its accounts through a struct marked `#[derive(Accounts)]`. Your `hello` asks for `Context<Hello>`, but `Hello` is never declared. `hello` reads no accounts, so an empty struct is enough.",
    }
  }

  if (target.includes("Ok(())") && code.includes("Result<()>") && !code.includes("Ok(())")) {
    const line = lineOf(code, "Result<()>")
    return {
      ok: false,
      line,
      log: [...head, "error[E0308]: mismatched types", ` --> ${file}:${line}`, "expected `Result<()>`, found `()`", "Build failed"],
      reason: `Line ${line} promises a Result, but the function never returns one.`,
      explain:
        "Your `hello` says it returns `Result<()>`, but its last line is `msg!`, which returns nothing. End the function with `Ok(())` to tell Anchor the instruction worked.",
    }
  }

  // Otherwise point at the first line the target doesn't have
  const known = new Set(target.split("\n").map(squash))
  const i = code.split("\n").findIndex((l) => squash(l) !== "" && !known.has(squash(l)))
  return {
    ok: false,
    line: i === -1 ? 1 : i + 1,
    log: [...head, rust ? "error: the build didn't produce what this step needs" : "Error: the client didn't get a transaction back", "Build failed"],
    reason: "Your code doesn't match what this step needs yet.",
    explain:
      "Something in your code differs from what this step checks for. Compare it with the lesson, or review the fix to see the exact lines this step needs.",
  }
}
```

- [ ] **Step 4: Run the test**

Run: `node --test tests/prototype/check.test.ts`
Expected: PASS, `# pass 6`, `# fail 0`.

- [ ] **Step 5: Check types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty output.

- [ ] **Step 6: Commit**

```bash
git add src/prototype/tutorial/check.ts tests/prototype/check.test.ts
git commit -m "Tutorial prototype: check hand typed code

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The store understands your own code, the keep flag

**Files:**
- Create: `design-system/src/prototype/tutorial/view.ts`
- Modify: `design-system/src/prototype/tutorial/store.tsx`
- Modify: `design-system/src/prototype/tutorial/screens/StepScreen.tsx:71`
- Modify: `design-system/src/prototype/tutorial/ui/ActionZone.tsx:10,69`
- Modify: `design-system/src/prototype/tutorial/sheets/ExplainSheet.tsx:8,16,21`

- [ ] **Step 1: Create `view.ts`**

```ts
export type View = "phone" | "desktop"

const params = new URLSearchParams(location.search)

/** Set when the page was opened by switching views: the store then reopens the screen it was on
 * instead of the gallery. It's read once and dropped from the address, so a reload still starts
 * from the gallery */
export const KEEP = params.has("keep")
if (KEEP) {
  params.delete("keep")
  const query = params.toString()
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`)
}

export const view: View = params.get("view") === "desktop" ? "desktop" : "phone"

export function switchView(to: View) {
  const next = new URLSearchParams(location.search)
  next.delete("embed")
  if (to === "desktop") next.set("view", "desktop")
  else next.delete("view")
  next.set("keep", "1")
  location.assign(`${location.pathname}?${next}`)
}
```

- [ ] **Step 2: Types and actions in `store.tsx`**

Replace the import at the top of the file:

```ts
import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { checkOwn } from "./check"
import { INITIAL_FILES, STEPS, type BuildResult, type Fail, type Pass, type Patch, type Step } from "./data"
import { diffLines } from "./diff"
import { KEEP } from "./view"
```

In the `State` type, replace two fields:

```ts
  /** Which patch was applied last on this step, or "own" for code written by hand */
  applied: "patch" | "fix" | "own" | null
```

```ts
  /** `explain` is set when the build checked hand-written code: what the assistant says about it */
  error: { line: number; reason: string; explain?: string } | null
```

In `Action`, add two lines after `| { type: "apply" }`:

```ts
  | { type: "edit"; code: string }
  | { type: "buildOwn" }
```

- [ ] **Step 3: Helpers in `store.tsx`**

Replace the whole `lastResult` function with:

```ts
/** The code a step checks hand-written work against: what its fix leaves, or its patch when it has no fix */
export const targetFor = (step: Step) => step.fix?.after ?? step.patch?.after ?? null

/** A step's passing build, for code that reached the target by hand */
const passFor = (step: Step): Pass | null => [step.fix?.result, step.patch?.result].find((r): r is Pass => !!r && r.ok) ?? null

/** What Review the fix shows. After the assistant's patch it's the step's own fix. After code
 * written by hand it's the way from that code to the target, with the step's notes */
export function fixFor(s: State): Patch | null {
  const step = STEPS[s.step]
  if (s.applied !== "own") return step.fix ?? null
  const after = targetFor(step)
  const result = passFor(step)
  if (!after || !result) return null
  return {
    file: step.file,
    before: s.files[step.file],
    after,
    summary: "Here is what this step needs, next to what you wrote.",
    notes: [...(step.patch?.notes ?? []), ...(step.fix?.notes ?? [])],
    result,
  }
}

export function lastResult(s: State): BuildResult | null {
  const step = STEPS[s.step]
  if (step.deploy) return step.deploy.result
  if (s.applied === "own") {
    const target = targetFor(step)
    if (!target) return null
    const c = checkOwn(s.files[step.file], target, step.file)
    return c.ok ? passFor(step) : c
  }
  const p = s.applied === "fix" ? step.fix : step.patch
  return p?.result ?? null
}

/** Lines of the step's file the last patch added. They stay tinted while the build checks them
 * and until the next action, so you can see what is being checked */
export function freshLines(s: State): number[] {
  const step = STEPS[s.step]
  const p = s.applied === "fix" ? step.fix : s.applied === "patch" ? step.patch : undefined
  if (!p || !(s.phase === "building" || s.phase === "passed" || s.phase === "failed")) return []
  let n = 0
  const lines: number[] = []
  for (const row of diffLines(p.before, p.after)) {
    if (row.kind === "removed") continue
    n++
    if (row.kind === "added") lines.push(n)
  }
  return lines
}
```

- [ ] **Step 4: Reducer branches**

Replace `case "reviewFix":`:

```ts
    case "reviewFix":
      return fixFor(s) ? { ...s, phase: "patch", review: "fix", sheet: false } : s
```

Replace the whole `case "apply":`:

```ts
    case "apply": {
      const p = s.review === "fix" ? fixFor(s) : step.patch
      if (!p) return s
      return {
        ...s,
        undo: s.undo && s.undo.step === s.step ? s.undo : { step: s.step, files: s.files },
        files: { ...s.files, [p.file]: p.after },
        // A fix for hand-written code lands on the target, and the build checks it as hand-written
        applied: s.review === "fix" && s.applied === "own" ? "own" : s.review,
        phase: "building",
        sheet: false,
        error: null,
        log: [],
      }
    }
    case "edit": {
      // Typing clears a failed build's red line: the error was about the code before the change
      const files = { ...s.files, [step.file]: a.code }
      return { ...s, files, error: null, sheet: false, phase: s.passed[s.step] ? "passed" : "idle" }
    }
    case "buildOwn":
      return { ...s, applied: "own", phase: "building", sheet: false, error: null, log: [] }
```

In `case "built":`, replace the return for a failure:

```ts
      return {
        ...s,
        phase: "failed",
        sheet: false,
        log: r.log,
        error: { line: r.line, reason: r.reason, explain: (r as Fail & { explain?: string }).explain },
        firstTry: setAt(s.firstTry, s.step, false),
      }
```

- [ ] **Step 5: `load` opens the same screen with keep**

Replace the line `return { ...saved, screen: "gallery", phase: resting(saved), sheet: false }` and the comment above it:

```ts
      // A reload comes back through the gallery, where Continue picks the tutorial up. Switching
      // views keeps the screen, and a patch under review stays up. Timers and sheets don't survive
      const phase = KEEP && saved.phase === "patch" ? "patch" : resting(saved)
      return { ...saved, screen: KEEP ? saved.screen : "gallery", phase, sheet: false }
```

- [ ] **Step 6: Mobile gets the fix through `fixFor`**

In `screens/StepScreen.tsx`, replace line 71 with:

```ts
  const proposal = s.phase === "patch" ? (s.review === "fix" ? fixFor(s) : step.patch) ?? null : null
```

and the store import with `import { fixFor, useStore } from "../store"`.

In `ui/ActionZone.tsx`, replace the store import with `import { fixFor, lastResult, useStore } from "../store"`, and line 69 with:

```ts
    const proposal = s.review === "fix" ? fixFor(s) : step.patch
```

In `sheets/ExplainSheet.tsx`, replace the store import with `import { fixFor, useStore } from "../store"`, and two lines in `Body`:

```ts
  const withFix = mode === "error" && !!fixFor(s)
```

```ts
  const text = withFix ? s.error?.explain ?? step.explainError ?? "" : step.explainStep
```

- [ ] **Step 7: Check types and the test**

Run: `npx tsc -p tsconfig.app.json --noEmit && node --test tests/prototype/check.test.ts`
Expected: tsc empty, test `# pass 6`.

- [ ] **Step 8: Mobile isn't broken**

Open `http://localhost:5173/prototype/tutorial/`, press Reset, go through step 1: Write with assistant, Quick check, Apply, the build fails, Explain, Review the fix, Apply and build, green Next. Expected: the same behavior as before the change, with no errors in `read_console_messages`.

- [ ] **Step 9: Commit**

```bash
git add src/prototype/tutorial/view.ts src/prototype/tutorial/store.tsx src/prototype/tutorial/screens/StepScreen.tsx src/prototype/tutorial/ui/ActionZone.tsx src/prototype/tutorial/sheets/ExplainSheet.tsx
git commit -m "Tutorial prototype: the store builds hand typed code and remembers the screen when the view changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Phone and Desktop switcher

**Files:**
- Create: `design-system/src/prototype/tutorial/ViewSwitch.tsx`
- Create: `design-system/src/prototype/tutorial/desktop/DesktopApp.tsx` (a temporary stub, replaced in task 5)
- Modify: `design-system/src/prototype/tutorial/DeviceFrame.tsx`
- Modify: `design-system/src/prototype/tutorial/main.tsx`

- [ ] **Step 1: `ViewSwitch.tsx`**

```tsx
import { useState } from "react"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { switchView, view, type View } from "./view"

/** Phone or desktop, and Reset. Under the phone it sits in the caption row. Over the desktop
 * screen it floats in a corner and folds away, so the screen reads as the product */
export function ViewSwitch({ onReset, floating = false }: { onReset: () => void; floating?: boolean }) {
  const [open, setOpen] = useState(true)

  if (floating && !open)
    return (
      <Button
        variant="secondary"
        size="sm"
        className="fixed right-4 bottom-4 z-50 shadow-modal"
        aria-label="Show prototype controls"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal />
        Prototype
      </Button>
    )

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        floating && "fixed right-4 bottom-4 z-50 rounded-full border border-border bg-surface-panel p-1 pl-1.5 shadow-modal"
      )}
    >
      <Segmented
        value={view}
        onValueChange={(v) => v !== view && switchView(v as View)}
        aria-label="View"
        className="pill h-8! rounded-full! border-0! p-0!"
      >
        <SegmentedItem value="phone" className="rounded-full! px-3!">
          Phone
        </SegmentedItem>
        <SegmentedItem value="desktop" className="rounded-full! px-3!">
          Desktop
        </SegmentedItem>
      </Segmented>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw />
        Reset
      </Button>
      {floating && (
        <Button variant="ghost" size="icon" className="size-8" aria-label="Hide prototype controls" onClick={() => setOpen(false)}>
          <ChevronDown />
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Stub `desktop/DesktopApp.tsx`**

```tsx
import { useStore } from "../store"

export function DesktopApp() {
  const { s } = useStore()
  return <div className="grid h-dvh place-items-center bg-surface-base text-muted-foreground">Desktop · {s.screen}</div>
}
```

- [ ] **Step 3: `DeviceFrame.tsx`**

Replace the imports with:

```tsx
import { useRef } from "react"
import { BatteryFull, Signal, Wifi } from "lucide-react"

import { resetStorage } from "./store"
import { KEEP } from "./view"
import { ViewSwitch } from "./ViewSwitch"
```

On the `iframe`, replace `src`:

```tsx
            src={`${location.pathname}?embed${KEEP ? "&keep=1" : ""}`}
```

Replace the whole bottom row under the frame:

```tsx
      <div className="flex items-center gap-3 text-caption text-muted-foreground">
        <span>Solana Playground · tutorial flow · prototype</span>
        <ViewSwitch onReset={reset} />
      </div>
```

- [ ] **Step 4: `main.tsx`**

The whole file:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import "./prototype.css"

import { App } from "./App"
import { DesktopApp } from "./desktop/DesktopApp"
import { DeviceFrame } from "./DeviceFrame"
import { resetStorage, Store } from "./store"
import { view } from "./view"
import { ViewSwitch } from "./ViewSwitch"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

// Inside the desktop frame the page has no safe area of its own, see prototype.css
if (window.self !== window.top) document.documentElement.classList.add("framed")

const resetDesktop = () => {
  resetStorage()
  location.reload()
}

// A real phone always gets the phone. A wide screen gets the phone in its frame, or the desktop
// screen when the address asks for it
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wide && !embedded ? (
      view === "desktop" ? (
        <>
          <Store>
            <DesktopApp />
          </Store>
          <ViewSwitch floating onReset={resetDesktop} />
        </>
      ) : (
        <DeviceFrame />
      )
    ) : (
      <Store>
        <App />
      </Store>
    )}
  </StrictMode>
)
```

- [ ] **Step 5: Check types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty.

- [ ] **Step 6: Check in the browser**

1. `http://localhost:5173/prototype/tutorial/`, Reset. Under the frame: a label and the Phone (selected), Desktop, Reset switcher.
2. In the phone open Hello Anchor, Start. Press Desktop. The URL becomes `?view=desktop` without `keep`, the screen shows "Desktop · step", and there's a badge in the bottom right corner.
3. Collapse the badge with the arrow, expand it with the Prototype button.
4. Press Phone: the phone opens on step 1, not on the gallery.
5. Reload the page: the phone is on the gallery with the "Pick up where you left off" card.

- [ ] **Step 7: Commit**

```bash
git add src/prototype/tutorial/ViewSwitch.tsx src/prototype/tutorial/desktop/DesktopApp.tsx src/prototype/tutorial/DeviceFrame.tsx src/prototype/tutorial/main.tsx
git commit -m "Tutorial prototype: Phone and Desktop switcher with shared progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared mobile parts move to ui/

How mobile looks doesn't change. The goal: desktop reuses the same parts.

**Files:**
- Create: `design-system/src/prototype/tutorial/ui/StepStatus.tsx`, `ui/StepList.tsx`, `ui/StartOverDialog.tsx`, `ui/LessonBlocks.tsx`, `ui/FinishParts.tsx`
- Modify: `design-system/src/prototype/tutorial/ui/ActionZone.tsx`, `ui/BuildLog.tsx`, `screens/StepScreen.tsx`, `screens/Overview.tsx`, `screens/Finish.tsx`, `sheets/LessonSheet.tsx`, `data.ts`

- [ ] **Step 1: `ui/StepStatus.tsx`**

```tsx
import { CircleAlert, CircleCheck, CircleDashed, Lightbulb, MessageCircle } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"

import { STEPS } from "../data"
import { fixFor, lastResult, useStore, type State } from "../store"
import { Prose } from "./Prose"
import { Typed } from "./Typed"

/** After a prediction: whether it was right, and why. It replaces the assistant's summary */
export type Lead = { text: string; right: boolean }

/** What the main button says while something runs */
export function workingLabel(s: State) {
  if (s.phase === "deploying") return "Deploying..."
  return STEPS[s.step].id === "call-client" ? "Running..." : "Building..."
}

/** The step's status: one icon and one sentence. Each signal shows once: the icon (dashed,
 * spinner, check, alert) lives only here, the button carries the action and its colour */
export function StepStatus({ lead }: { lead?: Lead }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  const r = lastResult(s)

  if (s.phase === "building" || s.phase === "deploying") {
    const detail =
      s.phase === "deploying"
        ? `${step.deploy?.stages[s.deployStage]} (${s.deployStage + 1}/${step.deploy?.stages.length})`
        : step.id === "call-client"
          ? `Running ${step.file} on devnet`
          : "Compiling hello_anchor on the build server"
    return (
      <>
        <Spinner className="mt-px size-4 shrink-0" />
        <span>{detail}</span>
      </>
    )
  }
  if (s.phase === "passed" && r?.ok)
    return (
      <>
        <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        <span className="text-success">{r.note}</span>
      </>
    )
  if (s.phase === "failed" && s.error)
    return (
      <>
        <CircleAlert strokeWidth={1.75} className="mt-px size-4 shrink-0 text-error" />
        <span className="text-error">{s.error.reason}</span>
      </>
    )
  if (s.phase === "patch") {
    // The assistant speaks here, by the buttons, so nothing sits over the code
    const proposal = s.review === "fix" ? fixFor(s) : step.patch
    return (
      <>
        {/* A right answer, a wrong one (a hint, not an error), or the assistant speaking */}
        {lead?.right ? (
          <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
        ) : lead ? (
          <Lightbulb strokeWidth={1.75} className="mt-px size-4 shrink-0 text-warning" />
        ) : (
          <MessageCircle strokeWidth={1.75} className="mt-px size-4 shrink-0 text-brand-purple" />
        )}
        <span className="text-foreground">
          {lead ? <Prose text={lead.text} /> : <Typed key={proposal?.summary} text={proposal?.summary ?? ""} />}
        </span>
      </>
    )
  }
  return (
    <>
      <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
      <span>Done when {step.checkedBy}</span>
    </>
  )
}
```

- [ ] **Step 2: `ui/ActionZone.tsx` on `StepStatus`**

The whole file:

```tsx
import { ArrowRight, MessageCircle } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { StepStatus, workingLabel, type Lead } from "./StepStatus"

/** The bottom of a step: a big zone, after Mimo's, holding the step's status
 * and one main button that shows the state too. Write or Deploy, then
 * Building, then a green Next. The status line replaces both the "Done when"
 * line up top and the passed / not yet sheets */
export function ActionZone({ lead }: { lead?: Lead }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying"
  const passed = s.phase === "passed"
  const failed = s.phase === "failed"
  const reviewing = s.phase === "patch"
  const big = "h-14 text-control"

  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      <p role="status" aria-live="polite" className="mb-4 flex min-h-5 items-start gap-1.5 px-1 text-caption leading-relaxed text-muted-foreground">
        <StepStatus lead={lead} />
      </p>
      <div className="flex gap-2">
        {reviewing ? (
          <Button variant="secondary" className={cn(big, "px-5")} onClick={() => dispatch({ type: "close" })}>
            Discard
          </Button>
        ) : (
          // A chat bubble, the same one the assistant's sheets carry. It stands in until Sole has a mark (DES-134)
          <Button
            variant="secondary"
            disabled={busy}
            className={cn(big, "gap-2 px-4")}
            aria-label="Ask the assistant about this step"
            onClick={() => dispatch({ type: "explain", mode: "step" })}
          >
            <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
            Ask
          </Button>
        )}

        {passed ? (
          <Button
            className={cn(big, "min-w-0 flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90")}
            onClick={() => dispatch({ type: "next" })}
          >
            {last ? "Finish tutorial" : `Next: ${STEPS[s.step + 1].title}`}
            <ArrowRight strokeWidth={2.25} className="size-4" />
          </Button>
        ) : (
          <BrandButton
            variant="accent"
            disabled={busy}
            className={cn(big, "min-w-0 flex-1 gap-2")}
            onClick={() =>
              dispatch(
                reviewing
                  ? { type: "apply" }
                  : failed
                    ? { type: "explain", mode: "error" }
                    : step.deploy
                      ? { type: "deploy" }
                      : { type: "askPatch" }
              )
            }
          >
            {busy ? workingLabel(s) : reviewing ? (s.review === "fix" ? "Apply and build" : "Apply") : failed ? "Explain" : step.cta}
          </BrandButton>
        )}
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: `ui/LessonBlocks.tsx`**

```tsx
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"

import type { LessonBlock, Step } from "../data"
import { highlight } from "./CodeView"
import { Prose } from "./Prose"

/** About 200 words a minute, rounded up, never under a minute */
export function readingMinutes(step: Step) {
  const words = step.lesson.reduce((n, b) => n + (b.kind === "code" ? b.code : b.text).split(/\s+/).length, 0)
  return Math.max(1, Math.ceil(words / 200))
}

function Block({ block }: { block: LessonBlock }) {
  // Sections are 28px apart, their parts 8 and 12, so the lesson reads as groups
  if (block.kind === "h") return <h3 className="mt-7 font-heading text-title text-foreground first:mt-0">{block.text}</h3>
  if (block.kind === "p")
    return (
      <p className="mt-2 text-body text-muted-foreground">
        <Prose text={block.text} />
      </p>
    )
  return (
    <CodeBlock className="mt-3 bg-surface-well">
      <CodeBlockContent className="text-code">
        {block.code.split("\n").map((line, i) => (
          <div key={i} className="min-h-[1lh] break-words whitespace-pre-wrap">
            {highlight(line)}
          </div>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </>
  )
}
```

In `sheets/LessonSheet.tsx`: delete the `Block` function and the imports of `CodeBlock`, `CodeBlockContent`, `highlight`, `Prose`, and the `LessonBlock` type; make the data import `import { STEPS } from "../data"`; add `import { LessonBlocks } from "../ui/LessonBlocks"`; replace the contents of the scrolling `div` with `<LessonBlocks blocks={step.lesson} />`.

In `screens/StepScreen.tsx`: delete the `readingMinutes` function and the comment above it, add `import { readingMinutes } from "../ui/LessonBlocks"`, and make the data import `import { STEPS } from "../data"`.

- [ ] **Step 4: `freshLines` in the mobile step**

In `screens/StepScreen.tsx`, delete `appliedPatch` and the whole `fresh` calculation (from the `// What the last patch added stays tinted` comment to `: []`), and put this in their place:

```ts
  const fresh = freshLines(s)
```

Store import: `import { fixFor, freshLines, useStore } from "../store"`. Delete `import { diffLines } from "../diff"`.

- [ ] **Step 5: `ui/StepList.tsx` and `ui/StartOverDialog.tsx`**

`ui/StepList.tsx`:

```tsx
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The steps as the design system's step rail draws them: a line down the side joining the
 * marks, green once passed, a purple dot with a halo for where you are, a hollow dot for
 * what waits. Unlike the rail, rows you have reached open their step */
export function StepList({ className }: { className?: string }) {
  const { s, dispatch } = useStore()
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  // Steps passed and the one you're on can be opened. The ones after it wait
  const reachable = (i: number) => s.passed[i] || first === -1 || i <= first

  return (
    <ol className={className}>
      {STEPS.map((step, i) => {
        const passed = s.passed[i]
        const current = !finished && i === first
        const open = reachable(i)
        return (
          <li
            key={step.id}
            className={cn(
              "relative",
              // the connector, from under this mark to the top of the next one
              "before:absolute before:top-[40px] before:bottom-[-10px] before:left-[9.5px] before:w-px before:bg-border last:before:hidden",
              passed && "before:bg-success/60"
            )}
          >
            <button
              type="button"
              disabled={!open}
              onClick={() => dispatch({ type: "openStep", step: i })}
              aria-current={current ? "step" : undefined}
              aria-label={`Step ${i + 1}, ${step.title}${passed ? ", passed" : current ? ", current" : ""}`}
              className="-mx-2 grid w-[calc(100%+1rem)] grid-cols-[20px_1fr] gap-x-3 rounded-control px-2 py-3 text-left transition-colors duration-150 ease-standard enabled:hover:bg-surface enabled:active:bg-surface disabled:cursor-default motion-reduce:transition-none"
            >
              {/* The mark sits centred on the title's line */}
              <span aria-hidden="true" className="grid h-[22px] place-items-center">
                {passed ? (
                  <Check strokeWidth={3} className="size-3.5 text-success" />
                ) : current ? (
                  <span className="size-2.5 rounded-full bg-brand-purple ring-4 ring-brand-purple/25" />
                ) : (
                  <span className="size-2.5 rounded-full border border-muted-foreground/60" />
                )}
              </span>
              <span className={cn("block text-control leading-[22px]", !open && "text-muted-foreground")}>{step.title}</span>
              <span className="col-start-2 block text-caption text-muted-foreground">{step.objective}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
```

`ui/StartOverDialog.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useStore } from "../store"

/** Starting over clears progress, so it asks first */
export function StartOverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { s, dispatch } = useStore()
  const done = s.passed.filter(Boolean).length
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start Hello Anchor over?</AlertDialogTitle>
          <AlertDialogDescription>
            {done === 1 ? "Your passed step" : `Your ${done} passed steps`} and the code you applied will be cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* The stock footer sits on its own muted band with a border. Here the buttons share the dialog's
            surface, the way they do in the sheets */}
        <AlertDialogFooter className="mx-0! mb-0! border-t-0! bg-transparent! p-0! pt-2!">
          <AlertDialogCancel className="h-12! text-control">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="h-12! text-control" onClick={() => dispatch({ type: "restart" })}>
            Start over
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

The whole `screens/Overview.tsx`:

```tsx
import { useState } from "react"
import { ChevronLeft, RotateCcw } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepList } from "../ui/StepList"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Overview() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const total = STEPS.length
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The large title below names the screen, so the bar keeps only the way back */}
      <TopBar
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Back to tutorials" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <ChevronLeft className="size-6" />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <div className="flex items-center gap-4">
          <Thumb src={thumb("hello-anchor", "jpg")} className="size-16" />
          <div className="min-w-0">
            <h1 className="font-heading text-display">Hello Anchor</h1>
            <p className="mt-1 text-caption text-muted-foreground">Beginner · Anchor · 10 min · by acheron</p>
          </div>
        </div>
        <p className="mt-4 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        {/* The same bar and count as Continue in the gallery and the step screen */}
        {(started || finished) && (
          <div className="mt-5 flex items-center gap-3">
            <ObjectiveMeter value={done / total} className="h-1 flex-1" />
            <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
              {done} of {total}
            </span>
          </div>
        )}

        <StepList className="mt-5" />

        {/* Starting over clears progress, so it lives away from Continue and asks first */}
        {started && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="mt-4 flex h-11 items-center gap-1.5 text-caption text-muted-foreground active:text-foreground"
          >
            <RotateCcw strokeWidth={1.75} className="size-4" />
            Start over
          </button>
        )}
      </div>

      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(var(--safe-bottom),16px)]">
        <BrandButton
          variant="accent"
          className="h-14 w-full text-control"
          onClick={() => (finished ? setConfirm(true) : dispatch({ type: "start" }))}
        >
          {finished ? "Start again" : started ? `Continue from step ${first + 1}` : "Start"}
        </BrandButton>
      </footer>

      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </div>
  )
}
```

- [ ] **Step 6: `ui/FinishParts.tsx` and the mobile `Finish`**

`data.ts`: before `export const STEPS`, add

```ts
export const TX_SIGNATURE = "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn"
```

and in the client log (the `call-client` step), replace the line with the signature with

```ts
          `Use 'solana confirm -v ${TX_SIGNATURE}' to see the logs`,
```

`ui/FinishParts.tsx`:

```tsx
import { Anchor, Check, Play } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementMedia } from "@/components/ui/achievement"
import { brandButtonVariants } from "@/components/ui/brand-button"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, STEPS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "./Thumb"

/** The flow's peak: the badge pops in once, on the design system's pop curve, and simply appears with reduced motion */
export function FinishBadge() {
  return (
    <Achievement className="mx-auto w-auto" role="img" aria-label="Badge earned: First Anchor program">
      <AchievementMedia className="size-16 shadow-glow duration-[440ms] ease-pop animate-in fade-in zoom-in-50 motion-reduce:animate-none">
        <Anchor />
      </AchievementMedia>
    </Achievement>
  )
}

/** One summary card, three columns split by hairlines: big numbers, small labels */
export function FinishStats({ className }: { className?: string }) {
  const { s } = useStore()
  const total = STEPS.length
  const minutes = s.startedAt && s.finishedAt ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : 1
  const tiles = [
    { value: `${s.passed.filter(Boolean).length}/${total}`, label: "steps" },
    { value: `${s.firstTry.filter(Boolean).length}/${total}`, label: "first try" },
    { value: `${minutes} min`, label: "to finish" },
  ]
  return (
    <dl className={cn("grid grid-cols-3 divide-x divide-border rounded-panel border border-border bg-surface-panel", className)}>
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col-reverse items-center px-2 py-3 text-center">
          <dt className="text-caption text-muted-foreground">{t.label}</dt>
          <dd className="font-heading text-[1.375rem] leading-tight tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LearnedList({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {STEPS.map((step) => (
        <li key={step.id} className="flex items-start gap-2.5 text-body text-muted-foreground">
          <Check strokeWidth={2.25} className="mt-1 size-4 shrink-0 text-success" />
          {step.learned}
        </li>
      ))}
    </ul>
  )
}

/** The whole card starts the next tutorial, the same card and ring as Continue in the gallery */
export function UpNextCard({ className }: { className?: string }) {
  return (
    <section aria-labelledby="next-title" className={className}>
      <h3 id="next-title" className="mb-2 text-caption text-muted-foreground">
        Up next
      </h3>
      <button
        type="button"
        onClick={() => toast("Only Hello Anchor is in this prototype")}
        aria-label={`Start ${NEXT_TUTORIAL.name}`}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"
      >
        <Thumb src={thumb(NEXT_TUTORIAL.slug, NEXT_TUTORIAL.ext)} className="size-14" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-title">{NEXT_TUTORIAL.name}</span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            {NEXT_TUTORIAL.level} · {NEXT_TUTORIAL.framework}
          </span>
        </span>
        <span aria-hidden="true" className={cn(brandButtonVariants({ variant: "ring", size: "icon" }), "size-11")}>
          <Play className="size-4 fill-current" />
        </span>
      </button>
    </section>
  )
}
```

The whole `screens/Finish.tsx`:

```tsx
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useStore } from "../store"
import { FinishBadge, FinishStats, LearnedList, UpNextCard } from "../ui/FinishParts"
import { TopBar } from "../ui/TopBar"

export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X className="size-5" />
          </Button>
        }
      />
      {/* No bottom bar here: what comes next is a section of its own, with room around it */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-[calc(var(--safe-bottom)+16px)]">
        <FinishBadge />
        <h2 className="mt-4 text-center font-heading text-display">Tutorial complete</h2>
        <p className="mx-auto mt-2 max-w-[30ch] text-center text-body text-muted-foreground">Your program is live on devnet.</p>
        <FinishStats className="mt-6" />
        <h3 className="mt-6 text-caption text-muted-foreground">What you learned</h3>
        <LearnedList className="mt-2" />
        <UpNextCard className="mt-6" />
        <Button variant="secondary" className="mt-6 h-14 w-full text-control" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          Back to tutorials
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: `BuildLog` takes its own empty text**

In `ui/BuildLog.tsx`, replace the signature and the first branch:

```tsx
export function BuildLog({ log, empty = "Nothing built yet. The build runs after you apply a patch." }: { log: string[]; empty?: string }) {
  if (log.length === 0) return <p className="flex-1 px-4 py-6 text-caption text-muted-foreground">{empty}</p>
```

- [ ] **Step 8: Types and lint**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx oxlint src/prototype/tutorial`
Expected: tsc empty, oxlint `Found 0 errors`.

- [ ] **Step 9: Mobile looks as before**

In Phone, go through the whole scenario from the gallery to the finish: overview (the step list, Start over with the dialog), step 1 with the error and the fix, deploy, client, step 4, finish. Compare screenshots of the overview, step 1 in the "failed" state and the finish with the same screens before the task (no need for `git stash` to compare: not a single class changed in this task, so eyeballing is enough). No errors in the console.

- [ ] **Step 10: Commit**

```bash
git add src/prototype/tutorial
git commit -m "Tutorial prototype: shared step, overview, lesson and finish parts moved to ui

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Desktop shell and editor

**Files:**
- Create: `design-system/src/prototype/tutorial/desktop/Nav.tsx`, `Column.tsx`, `Workspace.tsx`, `Editor.tsx`
- Create (stubs, replaced in tasks 6, 7, 9, 10): `desktop/Gallery.tsx`, `desktop/Overview.tsx`, `desktop/Step.tsx`, `desktop/Finish.tsx`
- Modify: `design-system/src/prototype/tutorial/desktop/DesktopApp.tsx`

- [ ] **Step 1: `desktop/Nav.tsx`**

```tsx
import type { ReactNode } from "react"
import { BookOpen, Boxes, Folder, FolderOpen, Home, Plus } from "lucide-react"
import { toast } from "sonner"

import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

import { useStore } from "../store"

const soon = () => toast("Only the tutorial flow is in this prototype")

function Item({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-caption text-muted-foreground transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-surface-raised text-foreground"
      )}
    >
      {icon}
      <span className="hidden truncate xl:inline">{label}</span>
    </button>
  )
}

/** The product's own navigation, as in client-v2. Under 1280 it folds to a rail of icons */
export function Nav() {
  const { s, dispatch } = useStore()
  const inProject = s.screen === "step" || s.screen === "finish"
  return (
    <nav aria-label="Playground" className="flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-well px-2 py-3 xl:w-[200px]">
      <div className="mb-3 flex h-8 items-center gap-2 px-2">
        <LogoMark className="size-5" />
        <span className="hidden font-heading text-control xl:inline">Solana Playground</span>
      </div>
      <Item icon={<Home strokeWidth={1.75} />} label="Home" onClick={soon} />
      <Item icon={<Plus strokeWidth={1.75} />} label="New project" onClick={soon} />
      <Item icon={<BookOpen strokeWidth={1.75} />} label="Tutorials" active={!inProject} onClick={() => dispatch({ type: "open", screen: "gallery" })} />
      <Item icon={<Boxes strokeWidth={1.75} />} label="Programs" onClick={soon} />
      <p className="mt-4 mb-1 hidden px-2.5 text-caption text-muted-foreground xl:block">Projects</p>
      <span aria-hidden="true" className="my-2 h-px bg-border xl:hidden" />
      <Item icon={<Folder strokeWidth={1.75} />} label="Counter" onClick={soon} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Tip Jar" onClick={soon} />
      {s.startedAt !== null && (
        <Item icon={<FolderOpen strokeWidth={1.75} />} label="Hello Anchor" active={inProject} onClick={() => dispatch({ type: "start" })} />
      )}
    </nav>
  )
}
```

- [ ] **Step 2: `desktop/Column.tsx`**

```tsx
import type { ReactNode } from "react"

/** The lesson's column. In the product this is where the assistant's chat lives; during a
 * tutorial it carries the tutorial page, the step and the assistant's answers */
export function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="flex w-[360px] shrink-0 flex-col border-r border-border bg-surface-base">
      {children}
    </aside>
  )
}
```

- [ ] **Step 3: `desktop/Editor.tsx`**

```tsx
import type { KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../ui/CodeView"

/** A plain editor for the prototype: a textarea over highlighted code, both in the same font and
 * line height, so the caret lands on the letters. The product uses Monaco, as client-v2 does.
 * `fresh` lines are the ones the last patch added, `focus` where a change will land */
export function Editor({
  code,
  onChange,
  readOnly = false,
  dim = false,
  error = null,
  fresh = [],
  focus = [],
  hint,
  label,
}: {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
  dim?: boolean
  error?: number | null
  fresh?: number[]
  focus?: number[]
  hint?: string
  label: string
}) {
  const lines = code.split("\n")

  // Tab writes four spaces, as Rust is indented here
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey || readOnly) return
    e.preventDefault()
    const el = e.currentTarget
    const at = el.selectionStart
    onChange?.(code.slice(0, at) + "    " + code.slice(el.selectionEnd))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = at + 4
    })
  }

  return (
    <div className={cn("min-h-0 flex-1 overflow-auto py-3 font-mono text-code leading-[1.6]", dim && "opacity-60")}>
      <div className="grid min-w-max grid-cols-[3rem_1fr]">
        <div aria-hidden="true" className="pr-4 text-right text-subtle select-none">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative">
          <pre aria-hidden="true" className="m-0 font-mono text-code leading-[1.6] whitespace-pre text-syntax-plain">
            {lines.map((line, i) => {
              const n = i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    // The tint runs under the line, the text stays where the textarea's is
                    "-ml-2 border-l-2 border-transparent pr-8 pl-2",
                    focus.includes(n) && "border-primary bg-primary/10",
                    fresh.includes(n) && "border-success/50 bg-success/5",
                    error === n && "border-error bg-error/10"
                  )}
                >
                  {highlight(line)}
                  {line === "" && "​"}
                </div>
              )
            })}
          </pre>
          <textarea
            value={code}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            className="absolute inset-0 m-0 size-full resize-none overflow-hidden bg-transparent p-0 font-mono text-code leading-[1.6] whitespace-pre text-transparent caret-brand-purple outline-none selection:bg-primary/30 read-only:cursor-default"
          />
        </div>
      </div>
      {hint && <p className="mt-3 pl-12 font-sans text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}
```

- [ ] **Step 4: `desktop/Workspace.tsx`**

```tsx
import type { ReactNode } from "react"

import { ConsoleDrawer, ConsoleDrawerActions, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"
import { EditorTab, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Stepper, StepperItem, StepperList, type StepperStatus } from "@/components/ui/stepper"

import { STEPS } from "../data"
import { useStore } from "../store"

type Stage = "write" | "build" | "deploy" | "interact"

const STAGES: { value: Stage; label: string }[] = [
  { value: "write", label: "Write" },
  { value: "build", label: "Build" },
  { value: "deploy", label: "Deploy" },
  { value: "interact", label: "Interact" },
]

/** The product stage a step happens in. During a tutorial the stepper follows the step and isn't switched by hand */
const stageOf = (id: string): Stage => (id === "deploy" ? "deploy" : id === "call-client" ? "interact" : "write")

function useStageStatus(): Record<Stage, StepperStatus> {
  const { s } = useStore()
  const step = STEPS[s.step]
  const here = s.screen === "step"
  const st: Record<Stage, StepperStatus> = { write: "idle", build: "idle", deploy: "idle", interact: "idle" }
  if (s.passed[0]) st.build = "done"
  if (s.passed[1]) st.deploy = "done"
  if (s.passed[2]) st.interact = "done"
  if (here && s.phase === "building") st[step.id === "call-client" ? "interact" : "build"] = "running"
  if (here && s.phase === "deploying") st.deploy = "running"
  if (here && s.phase === "failed") st.build = "failed"
  return st
}

export type TerminalSlot = { open: boolean; onOpenChange: (open: boolean) => void; status: ReactNode; body: ReactNode }

/** The project side: its name and stage, the open file, the code, the step's actions and the terminal */
export function Workspace({
  file,
  tools,
  actions,
  terminal,
  children,
}: {
  file: string
  tools?: ReactNode
  actions?: ReactNode
  terminal?: TerminalSlot
  children: ReactNode
}) {
  const { s } = useStore()
  const stage = s.screen === "step" ? stageOf(STEPS[s.step].id) : "write"
  const status = useStageStatus()

  return (
    <section aria-label="Project" className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h2 className="font-heading text-control">Hello Anchor</h2>
        <Stepper value={stage} className="ml-auto">
          <StepperList>
            {STAGES.map((x) => (
              <StepperItem key={x.value} value={x.value} status={status[x.value]} errors={status[x.value] === "failed" ? 1 : undefined}>
                {x.label}
              </StepperItem>
            ))}
          </StepperList>
        </Stepper>
      </header>
      <div className="flex shrink-0 items-stretch border-b border-border bg-surface-base">
        <EditorTabs className="flex-1 border-b-0!">
          <EditorTab active>
            <EditorTabTrigger>
              <EditorTabLabel>{file.split("/").pop()}</EditorTabLabel>
            </EditorTabTrigger>
          </EditorTab>
        </EditorTabs>
        {tools && <div className="flex items-center gap-1 pr-2">{tools}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-surface">{children}</div>
      {actions}
      {terminal && (
        <ConsoleDrawer open={terminal.open} onOpenChange={terminal.onOpenChange}>
          <ConsoleDrawerBar>
            <ConsoleDrawerStatus>{terminal.status}</ConsoleDrawerStatus>
            <ConsoleDrawerActions>
              <Kbd>⌘J</Kbd>
            </ConsoleDrawerActions>
          </ConsoleDrawerBar>
          <ConsoleDrawerContent className="h-56">{terminal.body}</ConsoleDrawerContent>
        </ConsoleDrawer>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Screen stubs and the root**

`desktop/Gallery.tsx`:

```tsx
export function Gallery() {
  return <div className="grid flex-1 place-items-center text-muted-foreground">Gallery</div>
}
```

`desktop/Overview.tsx`:

```tsx
export function Overview() {
  return <div className="grid flex-1 place-items-center text-muted-foreground">Overview</div>
}
```

`desktop/Finish.tsx`:

```tsx
export function Finish() {
  return <div className="grid flex-1 place-items-center text-muted-foreground">Finish</div>
}
```

`desktop/Step.tsx` (temporary, to check the editor and the shell):

```tsx
import { STEPS } from "../data"
import { useStore } from "../store"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { Workspace } from "./Workspace"

export function Step() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  return (
    <>
      <Column label="Lesson">
        <p className="p-5 text-muted-foreground">{step.objective}</p>
      </Column>
      <Workspace file={step.file}>
        <Editor code={s.files[step.file]} onChange={(code) => dispatch({ type: "edit", code })} label={`${step.file}, editable`} />
      </Workspace>
    </>
  )
}
```

The whole `desktop/DesktopApp.tsx`:

```tsx
import { Toaster } from "@/components/ui/sonner"

import { useStore } from "../store"
import { Finish } from "./Finish"
import { Gallery } from "./Gallery"
import { Nav } from "./Nav"
import { Overview } from "./Overview"
import { Step } from "./Step"

export function DesktopApp() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh bg-surface-base text-foreground">
      <Nav />
      <main className="flex min-w-0 flex-1">
        {s.screen === "gallery" && <Gallery />}
        {s.screen === "overview" && <Overview />}
        {s.screen === "step" && <Step />}
        {s.screen === "finish" && <Finish />}
      </main>
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
```

- [ ] **Step 6: Types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty.

- [ ] **Step 7: Check the editor**

In Phone open step 1 (Start), switch to Desktop. Window 1440×900.
1. Navigation on the left with labels, Tutorials isn't highlighted, Hello Anchor is.
2. Header: "Hello Anchor" and the stepper, with Write selected.
3. Click into the editor, type `use anchor_lang::prelude::*;`, Enter, Tab. The caret sits exactly after the last character, the syntax highlighting matches what was typed, and Tab inserted 4 spaces. Check with `javascript_tool`: `getComputedStyle(document.querySelector('textarea')).lineHeight === getComputedStyle(document.querySelector('pre')).lineHeight` returns `true`.
4. Window 1280×800: navigation with labels. 1200×800: navigation as an icon rail, and the buttons have tooltips.

- [ ] **Step 8: Commit**

```bash
git add src/prototype/tutorial/desktop
git commit -m "Tutorial desktop: navigation, workspace with the stepper and terminal, editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Desktop gallery

**Files:**
- Modify (replace the stub): `design-system/src/prototype/tutorial/desktop/Gallery.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { useState } from "react"
import { Boxes, Check, Play, Search, X } from "lucide-react"
import { toast } from "sonner"

import { brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"

const CARD =
  "flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.99] motion-reduce:transition-none"

type Tab = "tutorials" | "programs"

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>("tutorials")
  const started = s.startedAt !== null && s.finishedAt === null
  const finished = s.finishedAt !== null
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const next = first === -1 ? STEPS.length - 1 : first

  const q = query.trim().toLowerCase()
  const list = TUTORIALS.filter((t) => [t.name, t.level, t.framework].some((field) => field.toLowerCase().includes(q)))
  const open = (slug: string) =>
    slug === "hello-anchor" ? dispatch({ type: "open", screen: "overview" }) : toast("Only Hello Anchor is in this prototype")

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[68rem] px-10 pt-10 pb-16">
        <h1 className="font-heading text-display">What do you want to build?</h1>

        {started && (
          <section aria-labelledby="resume-title" className="mt-8">
            <h2 id="resume-title" className="mb-2 text-caption text-muted-foreground">
              Pick up where you left off
            </h2>
            {/* The whole card resumes the tutorial. The ring is the screen's one accent. Kept narrow, so it reads as a card, not a banner */}
            <button
              type="button"
              onClick={() => dispatch({ type: "start" })}
              aria-label={`Continue Hello Anchor: ${STEPS[next].objective}`}
              className={cn(CARD, "max-w-[38rem]")}
            >
              <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-title">Hello Anchor</span>
                <span className="mt-0.5 block truncate text-caption text-muted-foreground">Next: {STEPS[next].objective}</span>
                <span className="mt-2 flex items-center gap-2">
                  <ObjectiveMeter value={done / STEPS.length} className="h-1 w-48" />
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {done} of {STEPS.length}
                  </span>
                </span>
              </span>
              <span aria-hidden="true" className={cn(brandButtonVariants({ variant: "ring", size: "icon" }), "size-11")}>
                <Play className="size-4 fill-current" />
              </span>
            </button>
          </section>
        )}

        {/* There's room for the field, so search is always open here, with no unfolding */}
        <div className="mt-8 flex items-center gap-4">
          <Segmented value={tab} onValueChange={(v) => setTab(v as Tab)} aria-label="Show" className="pill h-10! rounded-full! border-0! p-0!">
            <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
              Tutorials
            </SegmentedItem>
            <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
              Programs
            </SegmentedItem>
          </Segmented>
          {tab === "tutorials" && (
            <label className="relative ml-auto h-10 w-72 rounded-full border border-border bg-surface-panel transition-colors focus-within:border-border-strong">
              <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder={`Search ${TUTORIALS.length} tutorials`}
                aria-label="Search tutorials"
                className="size-full rounded-full bg-transparent pr-9 pl-10 text-body outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute top-0 right-0 flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>
          )}
        </div>

        {tab === "programs" ? (
          <Empty className="mt-16 gap-5 border-0 p-0">
            <EmptyHeader className="gap-3">
              <EmptyMedia variant="icon" className="mb-1 size-12! rounded-panel! bg-surface-raised! text-muted-foreground! [&_svg]:size-6!">
                <Boxes strokeWidth={1.75} />
              </EmptyMedia>
              <EmptyTitle className="font-heading text-title! font-[440]! tracking-normal!">Programs aren't in this prototype</EmptyTitle>
              <EmptyDescription className="max-w-[36ch] text-caption! leading-relaxed">
                This take covers the tutorial flow. The 34 programs come in a later pass.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-10 px-5 text-control" onClick={() => setTab("tutorials")}>
                Back to tutorials
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {q && (
              <p role="status" className="mt-4 text-caption text-muted-foreground">
                {list.length === 0 ? `No tutorials match “${query.trim()}”` : `${list.length} ${list.length === 1 ? "result" : "results"}`}
              </p>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {list.map((t) => (
                <li key={t.slug}>
                  <button type="button" onClick={() => open(t.slug)} className={CARD}>
                    <Thumb src={thumb(t.slug, t.ext)} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-title">{t.name}</span>
                      <span className="mt-0.5 block text-caption text-muted-foreground">
                        {t.level} · {t.framework}
                        {started && t.slug === "hello-anchor" && " · In progress"}
                        {finished && t.slug === "hello-anchor" && (
                          <>
                            {" · "}
                            <Check strokeWidth={2.5} className="mb-px inline size-3.5 text-success" /> Completed
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty.

- [ ] **Step 3: Check in the browser**

`?view=desktop`, Reset, 1440×900. Gallery: heading, tabs and search in one row, a 3 column grid, 16 cards with covers. Searching "sea" gives "4 results". Programs shows the empty state, and "Back to tutorials" goes back. A click on another tutorial's card shows a toast. Open Hello Anchor, then after Start go back to the gallery through the Tutorials nav item: the "Pick up where you left off" card is on top, no wider than 608 px, and Hello Anchor shows "In progress". At 1200 px: a 2 column grid. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/tutorial/desktop/Gallery.tsx
git commit -m "Tutorial desktop: gallery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Desktop tutorial page

**Files:**
- Modify (replace the stub): `design-system/src/prototype/tutorial/desktop/Overview.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { useState } from "react"
import { ChevronLeft, RotateCcw } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { ObjectiveMeter } from "@/components/ui/objective-band"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepList } from "../ui/StepList"
import { Thumb } from "../ui/Thumb"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { Workspace } from "./Workspace"

/** The tutorial page lives in the lesson's column, beside the project as it was left. Start and
 * Continue change only what the column holds, so stepping in doesn't move the layout */
export function Overview() {
  const { s, dispatch } = useStore()
  const [confirm, setConfirm] = useState(false)
  const total = STEPS.length
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished

  return (
    <>
      <Column label="Tutorial">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-2">
          <Button variant="ghost" className="h-9 gap-1.5 px-2 text-caption text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <ChevronLeft className="size-4" />
            Tutorials
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
            <div className="min-w-0">
              <h1 className="font-heading text-[1.375rem] leading-tight">Hello Anchor</h1>
              <p className="mt-1 text-caption text-muted-foreground">Beginner · Anchor · 10 min · by acheron</p>
            </div>
          </div>
          <p className="mt-4 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>
          {(started || finished) && (
            <div className="mt-5 flex items-center gap-3">
              <ObjectiveMeter value={done / total} className="h-1 flex-1" />
              <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                {done} of {total}
              </span>
            </div>
          )}
          <StepList className="mt-4" />
        </div>
        <div className="shrink-0 border-t border-border px-5 pt-4 pb-5">
          <BrandButton variant="accent" className="h-12 w-full text-control" onClick={() => (finished ? setConfirm(true) : dispatch({ type: "start" }))}>
            {finished ? "Start again" : started ? `Continue from step ${first + 1}` : "Start"}
          </BrandButton>
          {started && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-2 flex h-9 items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
            >
              <RotateCcw strokeWidth={1.75} className="size-4" />
              Start over
            </button>
          )}
        </div>
      </Column>

      <Workspace file="src/lib.rs" tools={<span className="px-2 text-caption text-muted-foreground">{started ? "Continue to edit" : "Start to edit"}</span>}>
        <Editor code={s.files["src/lib.rs"]} readOnly dim label="src/lib.rs, read only" />
      </Workspace>

      <StartOverDialog open={confirm} onOpenChange={setConfirm} />
    </>
  )
}
```

- [ ] **Step 2: Types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty.

- [ ] **Step 3: Check in the browser**

Reset, gallery, Hello Anchor. The 360 column: "← Tutorials", cover, title, meta, goal, a list of 4 steps, the Start button at the bottom of the column. On the right a dimmed editor with "Start to edit" in the file header, and you can't type. Start opens the step; then the Tutorials nav item and Hello Anchor again: "Continue from step 1", and "Start over" asks for confirmation. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/tutorial/desktop/Overview.tsx
git commit -m "Tutorial desktop: tutorial page in the lesson column

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Step screen parts

Each file stands on its own; they come together in task 9.

**Files:**
- Create: `design-system/src/prototype/tutorial/desktop/ActionBar.tsx`, `Terminal.tsx`, `QuickCheck.tsx`, `Feed.tsx`

- [ ] **Step 1: `desktop/ActionBar.tsx`**

```tsx
import type { ReactNode } from "react"
import { ArrowRight, MessageCircle } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"

import { STEPS } from "../data"
import { fixFor, useStore } from "../store"
import { StepStatus, workingLabel, type Lead } from "../ui/StepStatus"

const BTN = "h-10 gap-2 px-4 text-control"

/** The step's actions under the editor, the desktop cut of the phone's bottom zone: the status on
 * the left, the buttons on the right. Build checks what was typed; the assistant is the second way.
 * `explained` is set once Explain has answered, then the main button offers the fix */
export function ActionBar({ lead, asking, explained, onExplain }: { lead?: Lead; asking: boolean; explained: boolean; onExplain: () => void }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying"
  const fix = fixFor(s)

  let buttons: ReactNode
  if (s.phase === "passed") {
    buttons = (
      <Button className={`${BTN} bg-success text-success-foreground hover:bg-success/90`} onClick={() => dispatch({ type: "next" })}>
        {last ? "Finish tutorial" : "Next step"}
        <ArrowRight strokeWidth={2.25} className="size-4" />
      </Button>
    )
  } else if (s.phase === "patch") {
    // The quick check comes first. Its answer, or Skip, brings the code and these buttons
    buttons = asking ? null : (
      <>
        <Button variant="secondary" className={BTN} onClick={() => dispatch({ type: "close" })}>
          Discard
        </Button>
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "apply" })}>
          Apply and build
        </BrandButton>
      </>
    )
  } else if (s.phase === "failed") {
    buttons = explained ? (
      fix && (
        <BrandButton variant="accent" className={BTN} onClick={() => dispatch({ type: "reviewFix" })}>
          Review the fix
        </BrandButton>
      )
    ) : (
      <BrandButton variant="accent" className={BTN} onClick={onExplain}>
        Explain
      </BrandButton>
    )
  } else {
    buttons = (
      <>
        {step.patch && (
          <Button variant="secondary" disabled={busy} className={BTN} onClick={() => dispatch({ type: "askPatch" })}>
            <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
            Write with assistant
          </Button>
        )}
        <BrandButton variant="accent" disabled={busy} className={BTN} onClick={() => dispatch(step.deploy ? { type: "deploy" } : { type: "buildOwn" })}>
          {busy ? workingLabel(s) : step.deploy ? "Deploy to devnet" : step.id === "call-client" ? "Run the client" : "Build"}
          {!busy && <Kbd className="bg-white/15! text-current!">⌘B</Kbd>}
        </BrandButton>
      </>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface-panel px-4 py-3">
      <p role="status" aria-live="polite" className="flex min-w-0 flex-1 items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
        {asking ? <span>Answer the quick check to see the code, or skip it</span> : <StepStatus lead={lead} />}
      </p>
      <div className="flex shrink-0 items-center gap-2">{buttons}</div>
    </div>
  )
}
```

- [ ] **Step 2: `desktop/Terminal.tsx`**

```tsx
import { Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { PROGRAM_ID, STEPS } from "../data"
import { useStore } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { workingLabel } from "../ui/StepStatus"

/** The strip under the terminal: how the last run went, in one line beside a dot */
export function TerminalStatus() {
  const { s } = useStore()
  const busy = s.phase === "building" || s.phase === "deploying"
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          busy ? "animate-pulse-dot bg-brand-purple motion-reduce:animate-none" : s.error ? "bg-error" : s.log.length ? "bg-success" : "bg-muted-foreground/40"
        )}
      />
      <span className="truncate">{busy ? workingLabel(s) : s.error ? "Build failed" : s.log.length ? s.log[s.log.length - 1] : "Terminal"}</span>
    </>
  )
}

function ProgramId() {
  const copy = () =>
    navigator.clipboard
      ?.writeText(PROGRAM_ID)
      .then(() => toast("Program id copied"))
      .catch(() => toast("Couldn't copy the program id"))
  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-control border border-border bg-surface-panel px-3 py-2 text-caption">
      <span className="shrink-0 text-muted-foreground">Program id</span>
      <code className="min-w-0 flex-1 truncate font-mono text-code text-foreground">{PROGRAM_ID}</code>
      <button type="button" onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground">
        Copy
      </button>
      <a
        href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        Explorer
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </a>
    </div>
  )
}

/** What the terminal shows: the run as it goes, then its log. A deploy shows its stages, then the program id */
export function TerminalBody() {
  const { s } = useStore()
  const step = STEPS[s.step]

  if (s.phase === "deploying" && step.deploy)
    return (
      <ol className="flex flex-col gap-2 px-4 py-3 font-mono text-code">
        {step.deploy.stages.map((stage, i) => (
          <li key={stage} className={cn("flex items-center gap-2", i > s.deployStage && "text-muted-foreground")}>
            {i < s.deployStage ? (
              <Check strokeWidth={2.5} className="size-3.5 text-success" />
            ) : i === s.deployStage ? (
              <Spinner className="size-3.5" />
            ) : (
              <span className="size-3.5" />
            )}
            {stage}
          </li>
        ))}
      </ol>
    )

  if (s.phase === "building")
    return (
      <p className="flex items-center gap-2 px-4 py-3 font-mono text-code text-muted-foreground">
        <Spinner className="size-3.5" />
        {step.id === "call-client" ? `$ run ${step.file}` : "$ anchor build"}
      </p>
    )

  return (
    <div className="flex min-h-full flex-col">
      <BuildLog log={s.log} empty="Nothing built yet. Press Build or ⌘B." />
      {step.deploy && s.passed[s.step] && <ProgramId />}
    </div>
  )
}
```

- [ ] **Step 3: `desktop/QuickCheck.tsx`**

```tsx
import { Button } from "@/components/ui/button"

import type { Predict } from "../data"
import { Prose } from "../ui/Prose"

/** The phone's quick check, in the lesson's column: a quiet label, the question, three options of
 * one shape, Skip. Answering before the code shows keeps the learner thinking (Lead-and-Reveal) */
export function QuickCheck({ predict, onAnswer }: { predict: Predict; onAnswer: (choice: number | "skip") => void }) {
  return (
    <section aria-labelledby="quick-check" className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
      <p className="text-caption text-muted-foreground">Quick check</p>
      <h3 id="quick-check" className="mb-2 font-heading text-title text-foreground">
        {predict.question}
      </h3>
      {predict.options.map((option, i) => (
        <button
          key={option}
          type="button"
          onClick={() => onAnswer(i)}
          className="flex min-h-11 items-center rounded-control border border-border bg-surface px-3 py-2 text-left text-control text-foreground transition-colors duration-150 ease-standard hover:bg-surface-raised motion-reduce:transition-none"
        >
          <span>
            <Prose text={option} />
          </span>
        </button>
      ))}
      <Button variant="ghost" className="mt-1 h-10 self-start px-2 text-caption text-muted-foreground" onClick={() => onAnswer("skip")}>
        Skip and show the code
      </Button>
    </section>
  )
}
```

- [ ] **Step 4: `desktop/Feed.tsx`**

```tsx
import { useState } from "react"
import { ArrowUp } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"

import type { Chip } from "../data"
import { AssistantHead } from "../ui/AssistantHead"
import { Typed } from "../ui/Typed"

export type Quote = { file: string; line: number; code: string }
export type Msg = { id: number; from: "assistant"; text: string; quote?: Quote } | { id: number; from: "you"; text: string }

/** What the assistant said on this step and what you asked, under the lesson. Explain lands here
 * too, so the code stays in view while you read it */
export function Feed({ msgs }: { msgs: Msg[] }) {
  if (msgs.length === 0) return null
  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      {msgs.map((m) =>
        m.from === "you" ? (
          <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">
            {m.text}
          </p>
        ) : (
          <div key={m.id} className="flex flex-col gap-2">
            <AssistantHead />
            {m.quote && (
              <div className="rounded-control border border-error/40 bg-error/10 px-3 py-2 font-mono text-[0.75rem]">
                <span className="text-muted-foreground">
                  {m.quote.file}:{m.quote.line}
                </span>
                <div className="mt-0.5 break-words whitespace-pre-wrap text-syntax-plain">{m.quote.code}</div>
              </div>
            )}
            <p className="text-body">
              <Typed key={m.id} text={m.text} />
            </p>
          </div>
        )
      )}
    </div>
  )
}

const FREE = "Free chat isn't connected in this prototype. Try one of the suggestions above the box."

/** The product's composer at the foot of the column. Suggestions give the step's prepared answers */
export function AskBox({ placeholder, suggestions, onAsk }: { placeholder: string; suggestions: Chip[]; onAsk: (question: string, answer: string) => void }) {
  const [text, setText] = useState("")
  return (
    <div className="shrink-0 px-3 pt-2 pb-3">
      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onAsk(c.label, c.answer)}
              className="h-8 rounded-full border border-border-strong px-3 text-caption text-muted-foreground transition-colors hover:text-foreground"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <Composer
        onSubmit={() => {
          if (!text.trim()) return
          onAsk(text.trim(), FREE)
          setText("")
        }}
      >
        <ComposerInput value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <ComposerToolbar>
          <ComposerSend>
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}
```

- [ ] **Step 5: Types and lint**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx oxlint src/prototype/tutorial/desktop`
Expected: tsc empty, `Found 0 errors`.

- [ ] **Step 6: Commit**

```bash
git add src/prototype/tutorial/desktop
git commit -m "Tutorial desktop: action bar, terminal, Quick check and assistant feed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Desktop step screen

**Files:**
- Modify (replace the temporary file): `design-system/src/prototype/tutorial/desktop/Step.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { useEffect, useRef, useState } from "react"
import { BookOpen, ChevronLeft, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { STEPS } from "../data"
import { fixFor, freshLines, useStore } from "../store"
import { InlineDiff } from "../ui/InlineDiff"
import { LessonBlocks, readingMinutes } from "../ui/LessonBlocks"
import { StepProgress } from "../ui/StepProgress"
import { ActionBar } from "./ActionBar"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { AskBox, Feed, type Msg, type Quote } from "./Feed"
import { QuickCheck } from "./QuickCheck"
import { TerminalBody, TerminalStatus } from "./Terminal"
import { Workspace } from "./Workspace"

// Shown once a session: the first proposal opens its first note on its own
let taughtNotes = false

export function Step() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [lesson, setLesson] = useState(false)
  const [notes, setNotes] = useState<number[]>([])
  const [predicted, setPredicted] = useState<Record<number, number | "skip">>({})
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [explained, setExplained] = useState(false)
  const [term, setTerm] = useState(false)
  const ids = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  const say = (text: string, quote?: Quote) => setMsgs((m) => [...m, { id: ++ids.current, from: "assistant", text, quote }])
  const ask = (question: string, answer: string) =>
    setMsgs((m) => [...m, { id: ++ids.current, from: "you", text: question }, { id: ++ids.current, from: "assistant", text: answer }])

  // A new step starts with a clean column
  useEffect(() => {
    setLesson(false)
    setMsgs([])
    setExplained(false)
  }, [s.step])

  useEffect(() => {
    if (s.phase === "building") {
      const t = window.setTimeout(() => dispatch({ type: "built" }), 2400)
      return () => window.clearTimeout(t)
    }
    if (s.phase === "deploying") {
      const t = window.setTimeout(() => dispatch({ type: "deployStage" }), 1100)
      return () => window.clearTimeout(t)
    }
  }, [s.phase, s.deployStage, dispatch])

  // A run opens the terminal by itself, and a pass gets one line from the assistant about what's next
  const prev = useRef(s.phase)
  useEffect(() => {
    const was = prev.current
    prev.current = s.phase
    if (s.phase === "building" || s.phase === "deploying") {
      setTerm(true)
      setExplained(false)
    }
    if (s.phase === "passed" && (was === "building" || was === "deploying"))
      say(s.step === STEPS.length - 1 ? "That's every step. Finish the tutorial to see what you built." : `Next: ${STEPS[s.step + 1].objective}.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.step])

  // New messages come in at the bottom of the column
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [msgs.length])

  const busy = s.phase === "building" || s.phase === "deploying"
  const proposal = s.phase === "patch" ? (s.review === "fix" ? fixFor(s) : step.patch) ?? null : null
  // A step with a new idea asks its question once, before its own patch shows
  const asking = !!proposal && s.review === "patch" && !!step.predict && predicted[s.step] === undefined
  const answer = predicted[s.step]
  const lead =
    s.phase === "patch" && s.review === "patch" && step.predict && typeof answer === "number"
      ? answer === step.predict.answer
        ? { text: step.predict.right, right: true }
        : { text: step.predict.wrong, right: false }
      : undefined
  const allNotes = proposal?.notes.map((n) => n.line) ?? []
  const focus = (s.phase === "idle" && !s.passed[s.step] && !s.undo) || asking ? step.focus : []
  const hint =
    s.phase === "idle" && step.patch && s.files[step.file] === step.patch.before && !s.passed[s.step]
      ? "Write this step here, or let the assistant draft it."
      : undefined

  // Notes close whenever a new proposal shows. The first one in a session opens its first note by
  // itself, which teaches the dots. After a quick check the note the question was about opens
  useEffect(() => {
    const first = proposal?.notes[0]?.line
    if (!asking && s.review === "patch" && step.predict && typeof predicted[s.step] === "number") {
      taughtNotes = true
      setNotes([step.predict.line])
    } else if (!asking && first !== undefined && !taughtNotes) {
      taughtNotes = true
      setNotes([first])
    } else {
      setNotes([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.review, s.step, asking])

  const explain = () => {
    if (!s.error) return
    setExplained(true)
    setLesson(false)
    say(s.error.explain ?? step.explainError ?? step.explainStep, {
      file: step.file,
      line: s.error.line,
      code: s.files[step.file].split("\n")[s.error.line - 1]?.trim() ?? "",
    })
  }

  // ⌘B builds or deploys, Enter goes on after a pass, Esc closes the lesson and the notes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        if (s.phase === "idle") dispatch(step.deploy ? { type: "deploy" } : { type: "buildOwn" })
      } else if (e.key === "Enter" && s.phase === "passed" && !target?.closest("textarea, input, button, a")) {
        dispatch({ type: "next" })
      } else if (e.key === "Escape") {
        setLesson(false)
        setNotes([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [s.phase, step, dispatch])

  const undo = () => {
    dispatch({ type: "undo" })
    toast("Patch undone", { duration: 4000 })
  }

  const asked = new Set(msgs.filter((m) => m.from === "you").map((m) => m.text))
  const suggestions = [{ label: "Explain this step", answer: step.explainStep }, ...step.chips].filter((c) => !asked.has(c.label))
  const placeholder = proposal ? "Ask about this patch" : s.error ? "Ask about this error" : "Ask about this step"

  const tools = (
    <>
      {proposal && !asking && allNotes.length > 0 && (
        <button
          type="button"
          aria-pressed={notes.length === allNotes.length}
          onClick={() => setNotes(notes.length === allNotes.length ? [] : allNotes)}
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground"
        >
          <span className="size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25" />
          {notes.length === allNotes.length ? "Hide notes" : "Show notes"}
        </button>
      )}
      {/* Undo sits by the code it reverts, away from Next */}
      {s.undo && (s.phase === "passed" || s.phase === "failed") && (
        <button type="button" onClick={undo} className="flex h-8 items-center gap-1.5 rounded-control px-2 text-caption text-muted-foreground hover:text-foreground">
          <RotateCcw strokeWidth={1.75} className="size-4" />
          Undo patch
        </button>
      )}
    </>
  )

  return (
    <>
      <Column label="Lesson">
        <div className="flex shrink-0 items-center border-b border-border pr-2">
          <div className="min-w-0 flex-1">
            <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />
          </div>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Tutorial overview" onClick={() => dispatch({ type: "open", screen: "overview" })}>
            <X className="size-4" />
          </Button>
        </div>

        {lesson ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-6">
            <Button variant="ghost" className="-ml-2 h-9 gap-1.5 px-2 text-caption text-muted-foreground" onClick={() => setLesson(false)}>
              <ChevronLeft className="size-4" />
              Back to the step
            </Button>
            <p className="mt-3 text-caption text-muted-foreground">Lesson</p>
            <h2 className="mt-1 font-heading text-[1.375rem] leading-tight">{step.title}</h2>
            <div className="mt-5">
              <LessonBlocks blocks={step.lesson} />
            </div>
          </div>
        ) : (
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-6">
            <p className="text-caption text-muted-foreground">{step.title}</p>
            <h1 className="mt-1 font-heading text-[1.25rem] leading-snug">{step.objective}</h1>
            {/* The lesson opens in this column, so the code stays in view while you read */}
            <button type="button" onClick={() => setLesson(true)} className="mt-3 flex h-9 items-center gap-2 rounded-control border border-border-strong px-3 text-caption text-foreground transition-colors hover:bg-surface">
              <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
              Read the lesson
              <span className="text-muted-foreground">· {readingMinutes(step)} min</span>
            </button>
            {asking && step.predict && <QuickCheck predict={step.predict} onAnswer={(choice) => setPredicted((p) => ({ ...p, [s.step]: choice }))} />}
            <Feed msgs={msgs} />
          </div>
        )}

        <AskBox placeholder={placeholder} suggestions={suggestions} onAsk={ask} />
      </Column>

      <Workspace
        file={step.file}
        tools={tools}
        actions={<ActionBar lead={lead} asking={asking} explained={explained} onExplain={explain} />}
        terminal={{ open: term, onOpenChange: setTerm, status: <TerminalStatus />, body: <TerminalBody /> }}
      >
        {proposal && !asking ? (
          <InlineDiff patch={proposal} open={notes} onToggle={(line) => setNotes((n) => (n.includes(line) ? n.filter((x) => x !== line) : [...n, line]))} />
        ) : (
          <Editor
            code={s.files[step.file]}
            onChange={(code) => dispatch({ type: "edit", code })}
            readOnly={busy || s.phase === "patch"}
            error={s.error?.line ?? null}
            fresh={freshLines(s)}
            focus={focus}
            hint={hint}
            label={`${step.file}, ${busy || s.phase === "patch" ? "read only" : "editable"}`}
          />
        )}
      </Workspace>
    </>
  )
}
```

- [ ] **Step 2: Types and lint**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx oxlint src/prototype/tutorial/desktop`
Expected: tsc empty, `Found 0 errors`.

- [ ] **Step 3: The assistant path**

`?view=desktop`, Reset, 1440×900, Hello Anchor, Start.
1. Column: "0 of 4" with the bar, ✕, "Program", the goal, the "Read the lesson · 1 min" chip, and under it the field with the suggestions "Explain this step", "Why is this needed", "Show in docs". The editor with `// Import anchor` and the hint under the code. Bar: "Done when the build shows a hello instruction", "Write with assistant", "Build ⌘B".
2. Write with assistant: Quick check in the column, the bar shows "Answer the quick check to see the code, or skip it", no buttons, the focus lines are highlighted.
3. Wrong answer: the diff appears, the note on line 5 is open, the status shows "Not quite." with the light bulb, the Discard and Apply and build buttons, "Show notes" in the file header.
4. Apply and build: the terminal expands, "$ anchor build" with a spinner, Build pulsing in the stepper. After 2.4 s error E0412, line 9 red, Build in the stepper red with "1 error", the Explain button.
5. Explain: an Assistant message in the column with the `src/lib.rs:9` quote and text, and the button changes to Review the fix. Review the fix: a diff with the Hello struct, Apply and build, green status, "Next step", the line "Next: Deploy the program to devnet." in the column, "Undo patch" in the file header.
6. Enter (focus not in a field): step 2.
Screenshots of states 2, 4, 5.

- [ ] **Step 4: Your own code and deploy**

1. On step 2: "Deploy to devnet ⌘B", press ⌘B. Deploy is selected in the stepper, the terminal shows three stages one after another, then the log and the Program id line with Copy and Explorer, status "Live on devnet...", Next step.
2. Reset, Start, clear everything in the editor and paste the code from `LIB_BROKEN` without `Ok(())` (the `NO_OK` test), ⌘B: error E0308 on line 9, Explain gives the text about `Ok(())`, Review the fix shows a diff from the typed code to the reference, Apply and build passes.
3. Reset, Start, paste the reference with different indentation, ⌘B: the step passes on the first try.
4. Type a line in the editor after an error: the red line goes away, and the button is Build again.
5. Read the lesson: the lesson in the column, "Back to the step" and Esc go back.
6. A question in the input field: your own bubble and the answer about free chat. The "Why is this needed" suggestion: the question and the canned answer, and the suggestion drops off the list.
7. Switch to Phone in the middle of step 1 in the "failed" state after your own code: the phone opens on step 1, and Explain there gives the text for your own code.

- [ ] **Step 5: Commit**

```bash
git add src/prototype/tutorial/desktop/Step.tsx
git commit -m "Tutorial desktop: step screen with two paths, Explain in the lesson column, and keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Desktop finish

**Files:**
- Modify (replace the stub): `design-system/src/prototype/tutorial/desktop/Finish.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { TX_SIGNATURE } from "../data"
import { useStore } from "../store"
import { FinishBadge, FinishStats, LearnedList, UpNextCard } from "../ui/FinishParts"

/** A screen of its own, as on the phone. The width the phone didn't have goes to the last
 * transaction: proof the program really runs */
export function Finish() {
  const { dispatch } = useStore()
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[34rem] px-6 pt-14 pb-16">
        <FinishBadge />
        <h1 className="mt-4 text-center font-heading text-display">Tutorial complete</h1>
        <p className="mt-2 text-center text-body text-muted-foreground">Your program is live on devnet.</p>
        <FinishStats className="mt-8" />
        <div className="mt-8 grid grid-cols-2 gap-8">
          <section aria-labelledby="learned-title">
            <h2 id="learned-title" className="text-caption text-muted-foreground">
              What you learned
            </h2>
            <LearnedList className="mt-2" />
          </section>
          <section aria-labelledby="tx-title">
            <h2 id="tx-title" className="text-caption text-muted-foreground">
              Your last transaction
            </h2>
            <a
              href={`https://explorer.solana.com/tx/${TX_SIGNATURE}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-control border border-border bg-surface-panel px-3 py-2 transition-colors hover:bg-surface"
            >
              <code className="block truncate font-mono text-code text-foreground">{TX_SIGNATURE}</code>
              <span className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                Open in Explorer
                <ExternalLink strokeWidth={1.75} className="size-3.5" />
              </span>
            </a>
          </section>
        </div>
        <UpNextCard className="mt-8" />
        <div className="mt-8 flex gap-2">
          <Button variant="secondary" className="h-11 px-5 text-control" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            Back to tutorials
          </Button>
          <Button variant="ghost" className="h-11 px-5 text-control" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            Open the project
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Types**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: empty.

- [ ] **Step 3: Check in the browser**

Go through steps 3 and 4 (with the assistant), Finish tutorial. Navigation on the left is in place, no lesson column. The badge appears with the animation, stats "4/4", "3/4", minutes, two columns, the transaction signature links to the devnet Explorer, Up next with the ring, two buttons. At 1440×900 everything fits without scrolling, or with minimal scrolling. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/tutorial/desktop/Finish.tsx
git commit -m "Tutorial desktop: finish with the last transaction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Full run and spec check

**Files:**
- Modify: `docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md`

- [ ] **Step 1: Prototype build**

Run: `npm run build:prototype`
Expected: the build has no errors, output in `dist-prototype/prototype/tutorial/index.html`.

- [ ] **Step 2: Full run at 1440×900 and 1280×800**

Desktop: gallery, tutorial page, 4 steps, finish, both paths on steps 1 and 4, Undo patch on "passed" and "failed", Start over, a reload mid step (gallery with the continue card), the keys ⌘B, Enter, Esc, ⌘J for the terminal. Phone: the same whole scenario, and mobile looks as it did before this work. Switch Phone and Desktop in every step state: idle, patch walkthrough, "failed", "passed". No errors in the console. Focus is visible from the keyboard (Tab through the column and the action bar).

- [ ] **Step 3: Check the spec against what was built**

In `docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md`:

1. In section "3. Step: start", replace `the stage name in small type ("Program"); the step goal at 20 px; one line of task text with code in chips; the "Read the lesson · N min" chip.` with `the stage name in small type ("Program"); the step goal at 20 px; the "Read the lesson · N min" chip.`, remove `"Show hint" on the right of the file header` together with the comma before it, and replace `on the left a status with a dashed circle "Write it yourself, or let the assistant draft it"` with `on the left a status with a dashed circle "Done when …", as on mobile`. Under the question field, add the sentence: `Above the field are suggestions: "Explain this step" and the step's chips.`
2. In section "7. Failed", replace `Status "Build failed on line N" with a "!" icon.` with `The status carries the reason from the step data, including the line number, with a "!" icon.`
3. In section "10. Deploy (step 2)", replace `After success the program id writes itself into declare_id! (highlighted as a fresh line) and is in the terminal with "Copy" and "Explorer".` with `After success the program id is in the terminal with "Copy" and "Explorer". It isn't written into declare_id!, because that would break the step 4 diff.`
4. In section "Shared progress", replace `Switching views mid step opens the same screen, step and state.` with `Switching views mid step opens the same screen and step. The patch walkthrough stays open, while the build and the sheets don't survive a reload and return to the step's resting state.`

Check that the file has no em dashes or en dashes: `perl -CSD -ne 'print "$.: $_" if /[\x{2013}\x{2014}]/' docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-21-desktop-tutorial-prototype-design.md
git commit -m "Desktop spec checked against the prototype

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
