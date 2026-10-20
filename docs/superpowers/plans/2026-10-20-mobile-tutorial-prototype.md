# Прототип мобильного флоу туториала: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кликабельный прототип флоу Hello Anchor на телефоне (галерея, обзор, шаг с патчем ассистента, проверка, ошибка и Explain, финиш) на компонентах дизайн-системы, по спеке `docs/superpowers/specs/2026-10-20-mobile-tutorial-prototype-design.md`.

**Architecture:** Отдельная HTML-страница Vite внутри `design-system/` (`/prototype/tutorial/`). Весь флоу ведёт один reducer со сценарием Hello Anchor, состояние хранится в `localStorage`. Сборка, деплой и ответы ассистента имитируются таймерами и печатью текста. На десктопе страница рисует рамку телефона с iframe на саму себя, поэтому шторки vaul открываются внутри «телефона».

**Tech Stack:** React 19, Vite 8, Tailwind 4, компоненты `design-system/src/components/ui` (vaul Drawer, Diff, Button, BrandButton, Progress, Achievement, Input, sonner), lucide-react.

**Это прототип дизайнера, не продакшен.** Юнит-тестов нет. Проверка каждой задачи: типы (`tsc`) и проход руками в браузере. Код потом переписывает программист, поэтому важнее точность UX и состояний, чем архитектура.

---

## Файлы

| Файл | Что делает |
| --- | --- |
| `design-system/prototype/tutorial/index.html` | HTML-вход страницы |
| `design-system/vite.prototype.config.ts` | Сборка только прототипа в `dist-prototype/` |
| `design-system/public/prototype/thumbs/*` | Обложки 16 туториалов, скопированы из `client-v2/public/tutorials` |
| `design-system/src/prototype/tutorial/main.tsx` | Точка входа: рамка телефона на десктопе или само приложение |
| `.../DeviceFrame.tsx` | Рамка телефона с iframe и кнопкой Reset |
| `.../App.tsx` | Выбор экрана по состоянию, Toaster |
| `.../data.ts` | Сценарий: шаги, код, патчи, результаты, тексты ассистента, список туториалов |
| `.../diff.ts` | Построчный дифф и подсчёт +N −M |
| `.../store.tsx` | Состояние флоу: reducer, провайдер, сохранение |
| `.../ui/TopBar.tsx` | Шапка экрана |
| `.../ui/CodeView.tsx` | Код только для чтения с подсветкой синтаксиса, фокуса и ошибки |
| `.../ui/BuildLog.tsx` | Вкладка Build |
| `.../ui/PatchDiff.tsx` | Карточка диффа на компоненте Diff |
| `.../ui/Typed.tsx` | Печать текста ассистента |
| `.../ui/AssistantHead.tsx` | Строка «Assistant · Opus 5.5» |
| `.../ui/StepProgress.tsx` | Прогресс сегментами |
| `.../screens/Gallery.tsx` | Экран 1 |
| `.../screens/Overview.tsx` | Экран 2 |
| `.../screens/StepScreen.tsx` | Экраны 3, 5 и нижняя панель |
| `.../sheets/PatchSheet.tsx` | Экран 4 |
| `.../sheets/ResultSheet.tsx` | Экраны 6 и 7 |
| `.../sheets/ExplainSheet.tsx` | Экран 8 |
| `.../screens/Finish.tsx` | Экран 9 |

`...` дальше везде означает `design-system/src/prototype/tutorial`.

Команды запускаются из `design-system/` с Node 22:

```bash
eval "$(fnm env)" && fnm use 22.20.0
```

Проверка типов во всех задачах:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Ожидание: команда завершается без вывода.

---

### Task 1: Каркас страницы

**Files:**
- Create: `design-system/prototype/tutorial/index.html`
- Create: `design-system/vite.prototype.config.ts`
- Create: `design-system/src/prototype/tutorial/main.tsx`
- Modify: `design-system/package.json` (scripts)
- Modify: `design-system/.gitignore`
- Create: `design-system/public/prototype/thumbs/*`

- [ ] **Step 1: HTML-вход**

`design-system/prototype/tutorial/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#101011" />
    <title>Hello Anchor · Playground prototype</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/prototype/tutorial/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Временный main.tsx, чтобы проверить токены и шрифты**

`design-system/src/prototype/tutorial/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex h-dvh items-center justify-center bg-surface-base text-title text-foreground">
      Prototype is wired
    </div>
  </StrictMode>
)
```

- [ ] **Step 3: Конфиг сборки прототипа**

`design-system/vite.prototype.config.ts`:

```ts
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Builds only the tutorial prototype, so the design system page and its
// snapshot step stay untouched
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-prototype",
    rollupOptions: {
      input: path.resolve(__dirname, "prototype/tutorial/index.html"),
    },
  },
})
```

В `design-system/package.json` в `scripts` добавить строку:

```json
"build:prototype": "vite build -c vite.prototype.config.ts"
```

В конец `design-system/.gitignore` добавить:

```
dist-prototype
```

- [ ] **Step 4: Обложки туториалов**

```bash
mkdir -p public/prototype/thumbs
for d in ../client-v2/public/tutorials/*/; do
  n=$(basename "$d"); [ "$n" = "__template" ] && continue
  for f in "$d"thumbnail.*; do cp "$f" "public/prototype/thumbs/$n.${f##*.}"; done
done
ls public/prototype/thumbs | wc -l
```

Ожидание: `16`.

- [ ] **Step 5: Проверить в браузере**

Дев-сервер ДС уже настроен в `.claude/launch.json` как `playground-design-system` (порт 5173). Открыть `http://localhost:5173/prototype/tutorial/`.
Ожидание: тёмный фон, по центру «Prototype is wired» шрифтом Stack Sans.

- [ ] **Step 6: Commit**

```bash
git add prototype vite.prototype.config.ts package.json .gitignore public/prototype src/prototype
git commit -m "Каркас прототипа мобильного туториала"
```

---

### Task 2: Сценарий и дифф

**Files:**
- Create: `.../data.ts`
- Create: `.../diff.ts`

- [ ] **Step 1: Дифф**

`.../diff.ts`:

```ts
export type Row = { kind: "context" | "added" | "removed"; text: string }

/** Line diff by longest common subsequence. Files here are under 30 lines */
export function diffLines(before: string, after: string): Row[] {
  const a = before.split("\n")
  const b = after.split("\n")
  const L: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])

  const rows: Row[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: "context", text: a[i] })
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      rows.push({ kind: "removed", text: a[i++] })
    } else {
      rows.push({ kind: "added", text: b[j++] })
    }
  }
  while (i < a.length) rows.push({ kind: "removed", text: a[i++] })
  while (j < b.length) rows.push({ kind: "added", text: b[j++] })
  return rows
}

/** Keeps changed rows and up to `keep` unchanged rows around them */
export function trimContext(rows: Row[], keep = 2): Row[] {
  return rows.filter((_, k) =>
    rows.slice(Math.max(0, k - keep), k + keep + 1).some((r) => r.kind !== "context")
  )
}

export function countRows(rows: Row[]) {
  return {
    added: rows.filter((r) => r.kind === "added").length,
    removed: rows.filter((r) => r.kind === "removed").length,
  }
}
```

- [ ] **Step 2: Сценарий Hello Anchor**

`.../data.ts`:

```ts
export type Pass = { ok: true; log: string[]; note: string }
export type Fail = { ok: false; log: string[]; line: number; reason: string }
export type BuildResult = Pass | Fail

export type Patch = {
  file: string
  before: string
  after: string
  summary: string
  result: BuildResult
}

export type Chip = { label: string; answer: string }

export type Step = {
  id: string
  title: string
  objective: string
  checkedBy: string
  learned: string
  page: string
  file: string
  /** Lines lit before the patch, where the change will land */
  focus: number[]
  cta: string
  patch?: Patch
  /** The fix Explain offers when the first patch fails */
  fix?: Patch
  deploy?: { stages: string[]; result: Pass }
  explainStep: string
  explainError?: string
  chips: Chip[]
}

export type TutorialCard = {
  slug: string
  name: string
  level: "Beginner" | "Intermediate" | "Advanced"
  framework: "Anchor" | "Seahorse" | "Native"
  ext: "jpg" | "png"
}

export const thumb = (slug: string, ext: string) =>
  `${import.meta.env.BASE_URL}prototype/thumbs/${slug}.${ext}`

export const TUTORIALS: TutorialCard[] = [
  { slug: "hello-anchor", name: "Hello Anchor", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "hello-seahorse", name: "Hello Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "hello-solana", name: "Hello Solana", level: "Beginner", framework: "Native", ext: "jpg" },
  { slug: "counter-pda-tutorial", name: "Counter PDA Tutorial", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "tiny-adventure", name: "Tiny Adventure", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "tiny-adventure-two", name: "Tiny Adventure Two", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "expense-tracker", name: "Expense Tracker", level: "Beginner", framework: "Anchor", ext: "png" },
  { slug: "tictactoe-seahorse", name: "Tictactoe Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "todo-app-seahorse", name: "Todo App Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "bank-simulator", name: "Bank Simulator", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "battle-coins", name: "Battle Coins", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  { slug: "boss-battle", name: "Boss Battle", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "faucet-seahorse", name: "Faucet Seahorse", level: "Intermediate", framework: "Seahorse", ext: "jpg" },
  { slug: "lumberjack", name: "Lumberjack", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  { slug: "spl-token-vault", name: "SPL Token Vault", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "zero-copy", name: "Zero Copy", level: "Advanced", framework: "Anchor", ext: "jpg" },
]

const LIB_START = "// Import anchor"

// Step 1, first try: hello asks for Context<Hello>, but Hello is missing
const LIB_BROKEN = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}`

const LIB_FIXED = `${LIB_BROKEN}

#[derive(Accounts)]
pub struct Hello {}`

const LIB_NAMED = LIB_FIXED.replace(
  `    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");`,
  `    pub fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {
        msg!("Hello, {}!", name);`
)

const CLIENT_START = "// Client code..."

const CLIENT_CALL = `// Call the hello instruction
const txHash = await pg.program.methods.hello().rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`

export const INITIAL_FILES: Record<string, string> = {
  "src/lib.rs": LIB_START,
  "client/client.ts": CLIENT_START,
}

const BUILD_OK = ["$ anchor build", "Compiling hello_anchor v0.1.0", "Finished release [optimized] target(s) in 2.41s"]

export const PROGRAM_ID = "9hJqVkRZ3t2nX8cPfLwA5mYbE7sGdT4uK1oNjQzWxCvB"

export const STEPS: Step[] = [
  {
    id: "write-program",
    title: "Program",
    objective: "Define the hello instruction and log a message",
    checkedBy: "the build shows a hello instruction",
    learned: "Declaring a program and its instructions",
    page:
      "Every Anchor program imports anchor_lang::prelude, declares its id and keeps its instructions inside a #[program] module. Each instruction gets a Context with the accounts it needs.",
    file: "src/lib.rs",
    focus: [1],
    cta: "Write this step with the assistant",
    patch: {
      file: "src/lib.rs",
      before: LIB_START,
      after: LIB_BROKEN,
      summary:
        "I'll import Anchor, declare the program id and add a hello instruction that logs “Hello, World!”.",
      result: {
        ok: false,
        log: [
          "$ anchor build",
          "Compiling hello_anchor v0.1.0",
          "error[E0412]: cannot find type `Hello` in this scope",
          " --> src/lib.rs:9:30",
          "Build failed",
        ],
        line: 9,
        reason: "Line 9 uses Context<Hello>, but there is no Hello struct in the file yet.",
      },
    },
    fix: {
      file: "src/lib.rs",
      before: LIB_BROKEN,
      after: LIB_FIXED,
      summary: "Add an empty Hello accounts struct.",
      result: {
        ok: true,
        log: [...BUILD_OK, "IDL: 1 instruction · hello", "Build successful"],
        note: "The build passed and the interface shows a hello instruction.",
      },
    },
    explainStep:
      "This step writes the smallest Anchor program there is: one instruction, hello, that writes a line to the program log. I'll propose the code as a patch. You read it and apply it, then the build checks it.",
    explainError:
      "In Anchor every instruction receives its accounts through a struct marked #[derive(Accounts)]. Line 9 asks for Context<Hello>, but Hello is never declared. hello reads no accounts, so an empty struct is enough.",
    chips: [
      {
        label: "Why is this needed",
        answer:
          "Without #[derive(Accounts)] Anchor can't tell which accounts an instruction expects, so it can't generate the code that checks them. An instruction that reads no accounts still needs the struct. It's just empty.",
      },
      {
        label: "Show in docs",
        answer: "The Anchor docs cover it in Program Structure, in the section on #[derive(Accounts)]: anchor-lang.com/docs/basics/program-structure",
      },
    ],
  },
  {
    id: "deploy",
    title: "Build & Deploy",
    objective: "Deploy the program to devnet",
    checkedBy: "the program is live on devnet",
    learned: "Deploying through Kora with 0 SOL",
    page:
      "Kora pays the rent on devnet, so you deploy without a wallet or SOL. A program nobody calls for 7 days is closed, and you can deploy it again at any time.",
    file: "src/lib.rs",
    focus: [],
    cta: "Deploy to devnet",
    deploy: {
      stages: ["Writing buffer", "Deploying", "Confirming"],
      result: {
        ok: true,
        log: [
          "$ deploy --network devnet",
          "Writing buffer... 100%",
          "Deploying through Kora · 0 SOL",
          `Program Id: ${PROGRAM_ID}`,
          "Deploy successful",
        ],
        note: "Live on devnet. It closes after 7 days without calls.",
      },
    },
    explainStep:
      "Deploying puts your built program on devnet, Solana's public test network. Kora covers the cost, so this works without a wallet. Press Deploy to devnet and wait for the program id.",
    chips: [
      {
        label: "Why 7 days",
        answer:
          "Kora pays the rent for programs on devnet. To keep that free for everyone, a program nobody calls for 7 days is closed. Deploy again and you get it back.",
      },
      {
        label: "What is devnet",
        answer: "Devnet is Solana's public network for testing. It behaves like mainnet, but its SOL has no value.",
      },
    ],
  },
  {
    id: "call-client",
    title: "Client",
    objective: "Call the instruction from the TypeScript client",
    checkedBy: "the client gets a transaction back",
    learned: "Calling a program from TypeScript",
    page:
      "Playground puts your program, wallet and connection in the pg namespace, so the client can call hello in one line. Outside Playground you would create them yourself.",
    file: "client/client.ts",
    focus: [1],
    cta: "Write this step with the assistant",
    patch: {
      file: "client/client.ts",
      before: CLIENT_START,
      after: CLIENT_CALL,
      summary: "I'll call hello from the client and print the transaction, so you can find its logs.",
      result: {
        ok: true,
        log: [
          "$ run client/client.ts",
          "Running client...",
          "Use 'solana confirm -v 4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn' to see the logs",
          "Client finished",
        ],
        note: "The client called hello and got a transaction back.",
      },
    },
    explainStep:
      "A client is code outside the program that sends it transactions. Here it's a short TypeScript file. I'll write the call to hello as a patch, then run it.",
    chips: [
      {
        label: "What is pg",
        answer: "pg is Playground's global with your program, wallet and connection already set up. pg.program knows hello from the IDL the build produced.",
      },
    ],
  },
  {
    id: "greet-by-name",
    title: "Test UI",
    objective: "Give hello a name argument and log it",
    checkedBy: "the build shows hello taking a name",
    learned: "Passing arguments to an instruction",
    page:
      "Instruction arguments come after the Context. Anchor serializes them for you, so a String works as is, and the Test UI shows a field for it.",
    file: "src/lib.rs",
    focus: [9, 10],
    cta: "Write this step with the assistant",
    patch: {
      file: "src/lib.rs",
      before: LIB_FIXED,
      after: LIB_NAMED,
      summary: "I'll add a name: String argument to hello and put it in the log line.",
      result: {
        ok: true,
        log: [...BUILD_OK, "IDL: 1 instruction · hello(name: string)", "Build successful"],
        note: "The build passed and hello now takes a name.",
      },
    },
    explainStep:
      "Instructions can take arguments after their Context. This step adds a name to hello and logs it, so the Test UI asks you for one.",
    chips: [
      {
        label: "Which types work",
        answer: "Any type Anchor can serialize: numbers, bool, String, Pubkey, Vec and your own structs with AnchorSerialize.",
      },
    ],
  },
]

export const NEXT_TUTORIAL = TUTORIALS.find((t) => t.slug === "counter-pda-tutorial")!
```

- [ ] **Step 3: Проверка типов**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: без вывода.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/tutorial/data.ts src/prototype/tutorial/diff.ts
git commit -m "Сценарий Hello Anchor и дифф для прототипа"
```

---

### Task 3: Состояние флоу

**Files:**
- Create: `.../store.tsx`

- [ ] **Step 1: Reducer, провайдер, сохранение**

`.../store.tsx`:

```tsx
import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { INITIAL_FILES, STEPS, type BuildResult } from "./data"

export type Screen = "gallery" | "overview" | "step" | "finish"
export type Phase = "idle" | "patch" | "building" | "deploying" | "passed" | "failed" | "explain"

export type State = {
  screen: Screen
  step: number
  files: Record<string, string>
  passed: boolean[]
  firstTry: boolean[]
  phase: Phase
  /** Whether the sheet for the current phase is up */
  sheet: boolean
  /** Which patch was applied last on this step */
  applied: "patch" | "fix" | null
  /** Files as they were when the current step started, for Undo */
  undo: { step: number; files: Record<string, string> } | null
  log: string[]
  error: { line: number; reason: string } | null
  explain: "step" | "error"
  deployStage: number
  startedAt: number | null
  finishedAt: number | null
}

export type Action =
  | { type: "open"; screen: Screen }
  | { type: "start" }
  | { type: "restart" }
  | { type: "goto"; step: number }
  | { type: "askPatch" }
  | { type: "explain"; mode: "step" | "error" }
  | { type: "close" }
  | { type: "apply" }
  | { type: "built" }
  | { type: "retry" }
  | { type: "deploy" }
  | { type: "deployStage" }
  | { type: "undo" }
  | { type: "next" }

const KEY = "pg-proto-tutorial-v1"

export const initial = (): State => ({
  screen: "gallery",
  step: 0,
  files: { ...INITIAL_FILES },
  passed: STEPS.map(() => false),
  firstTry: STEPS.map(() => true),
  phase: "idle",
  sheet: false,
  applied: null,
  undo: null,
  log: [],
  error: null,
  explain: "step",
  deployStage: 0,
  startedAt: null,
  finishedAt: null,
})

const setAt = (xs: boolean[], i: number, v: boolean) => xs.map((x, k) => (k === i ? v : x))

/** The phase a step rests in once nothing is running and no sheet is up */
const resting = (s: State): Phase => (s.error ? "failed" : s.passed[s.step] ? "passed" : "idle")

export function lastResult(s: State): BuildResult | null {
  const step = STEPS[s.step]
  if (step.deploy) return step.deploy.result
  const p = s.applied === "fix" ? step.fix : step.patch
  return p?.result ?? null
}

function reducer(s: State, a: Action): State {
  const step = STEPS[s.step]
  switch (a.type) {
    case "open":
      return { ...s, screen: a.screen, sheet: false, phase: resting(s) }
    case "start": {
      const first = s.passed.findIndex((p) => !p)
      const at = first === -1 ? 0 : first
      const same = at === s.step
      return {
        ...s,
        screen: "step",
        step: at,
        phase: same ? resting(s) : "idle",
        error: same ? s.error : null,
        sheet: false,
        startedAt: s.startedAt ?? Date.now(),
      }
    }
    case "restart":
      return { ...initial(), screen: "step", startedAt: Date.now() }
    case "goto":
      return { ...s, step: a.step, phase: s.passed[a.step] ? "passed" : "idle", sheet: false, error: null, undo: null, log: [], applied: null }
    case "askPatch":
      return { ...s, phase: "patch", sheet: true }
    case "explain":
      return { ...s, phase: "explain", explain: a.mode, sheet: true }
    case "close":
      if (s.phase === "patch" || s.phase === "explain") return { ...s, phase: resting(s), sheet: false }
      return { ...s, sheet: false }
    case "apply": {
      const fromExplain = s.phase === "explain" && s.explain === "error"
      const p = fromExplain ? step.fix : step.patch
      if (!p) return s
      return {
        ...s,
        undo: s.undo && s.undo.step === s.step ? s.undo : { step: s.step, files: s.files },
        files: { ...s.files, [p.file]: p.after },
        applied: fromExplain ? "fix" : "patch",
        phase: "building",
        sheet: false,
        error: null,
        log: [],
      }
    }
    case "built": {
      const r = lastResult(s)
      if (!r) return s
      if (r.ok) return { ...s, phase: "passed", sheet: true, log: r.log, error: null, passed: setAt(s.passed, s.step, true) }
      return {
        ...s,
        phase: "failed",
        sheet: true,
        log: r.log,
        error: { line: r.line, reason: r.reason },
        firstTry: setAt(s.firstTry, s.step, false),
      }
    }
    case "retry":
      return { ...s, phase: "building", sheet: false, error: null, log: [] }
    case "deploy":
      return { ...s, phase: "deploying", deployStage: 0, sheet: false, log: [] }
    case "deployStage": {
      const d = step.deploy
      if (!d) return s
      if (s.deployStage + 1 < d.stages.length) return { ...s, deployStage: s.deployStage + 1 }
      return { ...s, phase: "passed", sheet: true, log: d.result.log, passed: setAt(s.passed, s.step, true) }
    }
    case "undo":
      if (!s.undo) return s
      return {
        ...s,
        files: s.undo.files,
        undo: null,
        applied: null,
        phase: "idle",
        sheet: false,
        error: null,
        log: [],
        passed: setAt(s.passed, s.step, false),
      }
    case "next":
      if (s.step === STEPS.length - 1)
        return { ...s, screen: "finish", phase: "idle", sheet: false, finishedAt: s.finishedAt ?? Date.now() }
      return { ...s, step: s.step + 1, phase: "idle", sheet: false, error: null, undo: null, log: [], applied: null }
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = { ...initial(), ...(JSON.parse(raw) as Partial<State>) }
      // Timers and sheets don't survive a reload: land on the step at rest
      return { ...saved, phase: resting(saved), sheet: false }
    }
  } catch {
    // Storage blocked or broken: start fresh
  }
  return initial()
}

export function resetStorage() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored, nothing to clear
  }
}

const Ctx = createContext<{ s: State; dispatch: Dispatch<Action> } | null>(null)

export function Store({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      // Private mode: progress lives only in memory
    }
  }, [s])
  return <Ctx.Provider value={{ s, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore must be used inside <Store>")
  return v
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: без вывода.

- [ ] **Step 3: Commit**

```bash
git add src/prototype/tutorial/store.tsx
git commit -m "Состояние флоу туториала с сохранением прогресса"
```

---

### Task 4: Общие части интерфейса

**Files:**
- Create: `.../ui/TopBar.tsx`, `.../ui/CodeView.tsx`, `.../ui/BuildLog.tsx`, `.../ui/PatchDiff.tsx`, `.../ui/Typed.tsx`, `.../ui/AssistantHead.tsx`, `.../ui/StepProgress.tsx`

- [ ] **Step 1: TopBar**

`.../ui/TopBar.tsx`:

```tsx
import type { ReactNode } from "react"

export function TopBar({ left, title, right }: { left?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <header className="flex h-phone-head shrink-0 items-center gap-1 border-b border-border px-1.5">
      <div className="flex size-11 shrink-0 items-center justify-center">{left}</div>
      <h1 className="min-w-0 flex-1 truncate font-heading text-title">{title}</h1>
      <div className="flex size-11 shrink-0 items-center justify-center">{right}</div>
    </header>
  )
}
```

- [ ] **Step 2: CodeView с подсветкой**

`.../ui/CodeView.tsx`:

```tsx
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|`[^`]*`|'[^']*')|(\b[a-z_]+!)|(#\[[^\]]*\])|\b(use|mod|pub|fn|let|struct|const|await|mut|impl|return|super|self)\b|\b([A-Z][A-Za-z0-9]*)\b|\b(\d+)\b/g

const CLASS = [
  "",
  "text-syntax-comment",
  "text-syntax-string",
  "text-syntax-function",
  "text-syntax-type",
  "text-syntax-keyword",
  "text-syntax-type",
  "text-syntax-number",
]

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    const at = m.index ?? 0
    if (at > last) out.push(line.slice(last, at))
    const group = m.findIndex((g, k) => k > 0 && g !== undefined)
    out.push(
      <span key={at} className={CLASS[group]}>
        {m[0]}
      </span>
    )
    last = at + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

export function CodeView({ code, focus = [], error = null }: { code: string; focus?: number[]; error?: number | null }) {
  return (
    <pre aria-label="Code, read only" className="min-h-0 flex-1 overflow-y-auto py-2 font-mono text-code">
      {code.split("\n").map((line, i) => {
        const n = i + 1
        return (
          <div
            key={n}
            className={cn(
              "flex border-l-2 border-transparent pr-3",
              focus.includes(n) && "border-primary bg-primary/10",
              error === n && "border-error bg-error/10"
            )}
          >
            <span className="w-10 shrink-0 pr-3 text-right text-subtle select-none">{n}</span>
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-words text-syntax-plain">{highlight(line)}</code>
          </div>
        )
      })}
    </pre>
  )
}
```

- [ ] **Step 3: BuildLog**

`.../ui/BuildLog.tsx`:

```tsx
import { cn } from "@/lib/utils"

export function BuildLog({ log }: { log: string[] }) {
  if (log.length === 0)
    return <p className="flex-1 px-4 py-6 text-caption text-muted-foreground">Nothing built yet. The build runs after you apply a patch.</p>
  return (
    <pre className="min-h-0 flex-1 overflow-y-auto bg-surface-well px-4 py-3 font-mono text-code whitespace-pre-wrap break-words">
      {log.map((line, i) => (
        <div
          key={i}
          className={cn(
            "text-muted-foreground",
            line.startsWith("$") && "text-subtle",
            line.startsWith("error") && "text-error",
            /successful|finished$/i.test(line) && "text-success"
          )}
        >
          {line}
        </div>
      ))}
    </pre>
  )
}
```

- [ ] **Step 4: PatchDiff**

`.../ui/PatchDiff.tsx`:

```tsx
import { Diff, DiffContent, DiffHeader, DiffLine, DiffStat, DiffTitle } from "@/components/ui/diff"

import type { Patch } from "../data"
import { countRows, diffLines, trimContext } from "../diff"

export function PatchDiff({ patch, className }: { patch: Patch; className?: string }) {
  const rows = diffLines(patch.before, patch.after)
  const { added, removed } = countRows(rows)
  return (
    <Diff className={className}>
      <DiffHeader>
        <DiffTitle>{patch.file}</DiffTitle>
        <DiffStat added={added} removed={removed} />
      </DiffHeader>
      <DiffContent className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
        {trimContext(rows).map((r, i) => (
          <DiffLine key={i} variant={r.kind}>
            {r.text || " "}
          </DiffLine>
        ))}
      </DiffContent>
    </Diff>
  )
}
```

- [ ] **Step 5: Typed**

`.../ui/Typed.tsx`:

```tsx
import { useEffect, useRef, useState } from "react"

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The assistant's reply as it streams in. Give it a key per text */
export function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(reduce ? text.length : 0)
  const done = useRef(false)
  useEffect(() => {
    if (n >= text.length) {
      if (!done.current) {
        done.current = true
        onDone?.()
      }
      return
    }
    const t = window.setTimeout(() => setN((v) => Math.min(text.length, v + 3)), 16)
    return () => window.clearTimeout(t)
  }, [n, text.length, onDone])
  return <span aria-live="polite">{text.slice(0, n)}</span>
}
```

- [ ] **Step 6: AssistantHead**

`.../ui/AssistantHead.tsx`:

```tsx
import { BrandButtonIcon } from "@/components/ui/brand-button"

export function AssistantHead() {
  return (
    <div className="flex items-center gap-2 text-caption">
      <BrandButtonIcon className="size-4 text-brand-purple" />
      <span className="font-label text-foreground">Assistant</span>
      <span className="text-subtle">· Opus 5.5</span>
    </div>
  )
}
```

- [ ] **Step 7: StepProgress**

`.../ui/StepProgress.tsx`:

```tsx
import { cn } from "@/lib/utils"

import { STEPS } from "../data"

export function StepProgress({ current, passed, onPick }: { current: number; passed: boolean[]; onPick: (i: number) => void }) {
  return (
    <nav aria-label="Steps" className="flex gap-1 px-4 pt-2">
      {STEPS.map((step, i) => {
        const open = i === 0 || passed[i - 1] || i <= current
        return (
          <button
            key={step.id}
            type="button"
            disabled={!open}
            onClick={() => onPick(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Step ${i + 1}, ${step.title}${passed[i] ? ", passed" : ""}`}
            className="flex h-6 flex-1 items-center disabled:cursor-default"
          >
            <span
              className={cn(
                "h-1 w-full rounded-full bg-border-strong transition-colors duration-200",
                passed[i] && "bg-success",
                i === current && !passed[i] && "bg-primary"
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 8: Проверка типов**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: без вывода.

- [ ] **Step 9: Commit**

```bash
git add src/prototype/tutorial/ui
git commit -m "Общие части прототипа: код, дифф, прогресс, шапка"
```

---

### Task 5: Галерея, обзор, рамка телефона

**Files:**
- Create: `.../screens/Gallery.tsx`, `.../screens/Overview.tsx`, `.../App.tsx`, `.../DeviceFrame.tsx`
- Modify: `.../main.tsx` (полная замена)

- [ ] **Step 1: Gallery**

`.../screens/Gallery.tsx`:

```tsx
import { useState } from "react"
import { ChevronRight, Search, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { TopBar } from "../ui/TopBar"

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
  const done = s.passed.filter(Boolean).length
  const started = s.startedAt !== null && s.finishedAt === null
  const list = TUTORIALS.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))

  const open = (slug: string) =>
    slug === "hello-anchor" ? dispatch({ type: "open", screen: "overview" }) : toast("Only Hello Anchor is in this prototype")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="What do you want to build?"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            <X />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {started && (
          <section aria-label="Continue" className="mt-4 rounded-card border border-brand-violet/60 bg-surface-panel p-4">
            <p className="text-caption text-subtle">Continue</p>
            <div className="mt-2 flex items-center gap-3">
              <img src={thumb("hello-anchor", "jpg")} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-title">Hello Anchor</p>
                <p className="text-caption text-muted-foreground">
                  Step {s.step + 1} of {STEPS.length} · {STEPS[s.step].title}
                </p>
                <Progress value={(done / STEPS.length) * 100} className="mt-2" />
              </div>
            </div>
            <BrandButton variant="accent" className="mt-3 h-11 w-full" onClick={() => dispatch({ type: "start" })}>
              Continue
            </BrandButton>
          </section>
        )}

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-control bg-surface-panel p-1 text-control">
          <span className="flex h-10 items-center justify-center gap-2 rounded-md bg-surface-raised">
            Tutorials <span className="text-caption text-subtle">16</span>
          </span>
          <button
            type="button"
            className="flex h-10 items-center justify-center gap-2 rounded-md text-muted-foreground"
            onClick={() => toast("Programs are not in this prototype")}
          >
            Programs <span className="text-caption text-subtle">34</span>
          </button>
        </div>

        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tutorials" className="h-11 pl-9" />
        </label>

        <ul className="mt-3 flex flex-col gap-2">
          {list.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => open(t.slug)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left",
                  t.slug !== "hello-anchor" && "opacity-80"
                )}
              >
                <img src={thumb(t.slug, t.ext)} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block text-caption text-subtle">
                    {t.level} · {t.framework}
                    {t.slug === "hello-anchor" && ` · ${STEPS.length} steps`}
                  </span>
                  <span className="block text-title">{t.name}</span>
                  {t.slug === "hello-anchor" && (
                    <span className="block text-caption text-muted-foreground">Hello world program with the Anchor framework.</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Overview**

`.../screens/Overview.tsx`:

```tsx
import { Check, ChevronLeft } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { TopBar } from "../ui/TopBar"

export function Overview() {
  const { s, dispatch } = useStore()
  const first = s.passed.findIndex((p) => !p)
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const label = finished ? "Start over" : started ? `Continue from step ${first + 1}` : "Start"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Back to tutorials" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <ChevronLeft />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <p className="text-caption text-subtle">Beginner · Anchor · about 10 min</p>
        <h2 className="mt-1 font-heading text-display">Hello Anchor</h2>
        <p className="mt-1 text-caption text-muted-foreground">by acheron</p>
        <p className="mt-3 text-body text-muted-foreground">Write an Anchor program, deploy it to devnet and call it from a client.</p>

        <ol className="mt-6">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = !finished && i === (first === -1 ? 0 : first) && started
            return (
              <li key={step.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-caption text-muted-foreground",
                    done && "border-success bg-success text-success-foreground",
                    current && "border-primary text-foreground"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-control">{step.title}</span>
                  <span className="block text-caption text-muted-foreground">{step.objective}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <BrandButton
          variant="accent"
          className="h-11 w-full"
          onClick={() => dispatch({ type: finished ? "restart" : "start" })}
        >
          {label}
        </BrandButton>
        {started && (
          <Button variant="ghost" className="mt-1 h-11 w-full text-muted-foreground" onClick={() => dispatch({ type: "restart" })}>
            Start over
          </Button>
        )}
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: App с заглушками для экранов следующих задач**

`.../App.tsx`:

```tsx
import { Toaster } from "@/components/ui/sonner"

import { Gallery } from "./screens/Gallery"
import { Overview } from "./screens/Overview"
import { useStore } from "./store"

export function App() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
      {s.screen === "gallery" && <Gallery />}
      {s.screen === "overview" && <Overview />}
      {s.screen === "step" && <p className="p-4 text-body">Step screen comes in Task 6</p>}
      {s.screen === "finish" && <p className="p-4 text-body">Finish screen comes in Task 8</p>}
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
```

- [ ] **Step 4: DeviceFrame**

`.../DeviceFrame.tsx`:

```tsx
import { useRef } from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

import { resetStorage } from "./store"

/** On a wide screen the prototype runs in an iframe shaped like a phone, so
 * fixed sheets and the viewport behave as they do on a real one */
export function DeviceFrame() {
  const ref = useRef<HTMLIFrameElement>(null)
  const reset = () => {
    resetStorage()
    ref.current?.contentWindow?.location.reload()
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-well p-6 text-foreground">
      <div className="aspect-[390/844] h-[min(844px,calc(100dvh-96px))] overflow-hidden rounded-[52px] border-[10px] border-surface-raised shadow-modal">
        <iframe ref={ref} title="Tutorial flow prototype" src={`${location.pathname}?embed`} className="size-full border-0 bg-surface-base" />
      </div>
      <div className="flex items-center gap-3 text-caption text-muted-foreground">
        <span>Solana Playground · tutorial flow on a phone · prototype</span>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: main.tsx целиком**

`.../main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"

import { App } from "./App"
import { DeviceFrame } from "./DeviceFrame"
import { Store } from "./store"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wide && !embedded ? (
      <DeviceFrame />
    ) : (
      <Store>
        <App />
      </Store>
    )}
  </StrictMode>
)
```

- [ ] **Step 6: Проверка типов и браузер**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: без вывода.

В браузере `http://localhost:5173/prototype/tutorial/`:
1. На десктопе видна рамка телефона, внутри галерея с 16 обложками.
2. При ширине вкладки 390 рамки нет, галерея во весь экран.
3. Тап по Hello Seahorse показывает тост «Only Hello Anchor is in this prototype».
4. Тап по Hello Anchor открывает обзор с 4 шагами и кнопкой Start.
5. Поиск «tiny» оставляет 2 карточки.

- [ ] **Step 7: Commit**

```bash
git add src/prototype/tutorial
git commit -m "Галерея, обзор туториала и рамка телефона"
```

---

### Task 6: Экран шага и нижняя панель

**Files:**
- Create: `.../screens/StepScreen.tsx`
- Modify: `.../App.tsx` (полная замена)

- [ ] **Step 1: StepScreen**

`.../screens/StepScreen.tsx`. Шторки из Task 7 уже импортируются, поэтому эта задача проверяется вместе с Task 7.

```tsx
import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, CircleHelp, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { PatchSheet } from "../sheets/PatchSheet"
import { ResultSheet } from "../sheets/ResultSheet"
import { useStore } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { CodeView } from "../ui/CodeView"
import { StepProgress } from "../ui/StepProgress"
import { TopBar } from "../ui/TopBar"

export function StepScreen() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [tab, setTab] = useState<"code" | "build">("code")
  const [more, setMore] = useState(false)
  const busy = s.phase === "building" || s.phase === "deploying"
  const last = s.step === STEPS.length - 1

  useEffect(() => {
    setTab("code")
    setMore(false)
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

  const undo = () => {
    dispatch({ type: "undo" })
    toast("Patch undone", { duration: 4000 })
  }

  const focus = s.phase === "idle" && !s.passed[s.step] && !s.undo ? step.focus : []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Tutorial overview" onClick={() => dispatch({ type: "open", screen: "overview" })}>
            <ChevronLeft />
          </Button>
        }
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X />
          </Button>
        }
      />

      <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />

      <section className="border-b border-border px-4 pt-2 pb-3">
        <p className="text-caption tracking-wide text-subtle uppercase">
          Step {s.step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 line-clamp-3 text-title">{step.objective}</h2>
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
          className="mt-1.5 flex min-h-8 w-full items-start gap-1 text-left text-caption text-muted-foreground"
        >
          <span className="flex-1">Checked when {step.checkedBy}</span>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 transition-transform", more && "rotate-180")} />
        </button>
        {more && <p className="mt-2 text-caption text-muted-foreground">{step.page}</p>}
      </section>

      <div role="tablist" aria-label="Views" className="flex gap-1 px-4 py-2 text-caption">
        {(["code", "build"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("flex h-8 items-center gap-1.5 rounded-control px-3 text-muted-foreground", tab === t && "bg-surface-raised text-foreground")}
          >
            {t === "code" ? step.file.split("/").pop() : "Build"}
            {t === "build" && s.log.length > 0 && (
              <span className={cn("size-1.5 rounded-full", s.error ? "bg-error" : "bg-success")} />
            )}
          </button>
        ))}
      </div>

      {tab === "code" ? (
        <CodeView code={s.files[step.file]} focus={focus} error={s.error?.line ?? null} />
      ) : (
        <BuildLog log={s.log} />
      )}

      <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-surface-panel px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        {busy ? (
          <p role="status" className="flex h-11 flex-1 items-center justify-center gap-2 text-control text-muted-foreground">
            <Spinner className="size-4" />
            {s.phase === "building"
              ? step.id === "call-client"
                ? "Running client..."
                : "Building..."
              : `${step.deploy?.stages[s.deployStage]}... (${s.deployStage + 1}/${step.deploy?.stages.length})`}
          </p>
        ) : s.phase === "failed" ? (
          <>
            <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "retry" })}>
              Try again
            </Button>
            <BrandButton variant="accent" className="h-11 flex-1" onClick={() => dispatch({ type: "explain", mode: "error" })}>
              Explain
            </BrandButton>
          </>
        ) : s.phase === "passed" ? (
          <>
            {s.undo && (
              <Button variant="ghost" className="h-11 text-muted-foreground" onClick={undo}>
                Undo
              </Button>
            )}
            <BrandButton variant="accent" className="h-11 flex-1" onClick={() => dispatch({ type: "next" })}>
              {last ? "Finish tutorial" : `Step ${s.step + 2}: ${STEPS[s.step + 1].title}`}
            </BrandButton>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="size-11"
              aria-label="Explain this step"
              onClick={() => dispatch({ type: "explain", mode: "step" })}
            >
              <CircleHelp />
            </Button>
            <BrandButton
              variant="accent"
              className="h-11 flex-1"
              onClick={() => dispatch(step.deploy ? { type: "deploy" } : { type: "askPatch" })}
            >
              {step.cta}
            </BrandButton>
          </>
        )}
      </footer>

      <PatchSheet />
      <ResultSheet onUndo={undo} />
      <ExplainSheet />
    </div>
  )
}
```

- [ ] **Step 2: App целиком**

`.../App.tsx`:

```tsx
import { Toaster } from "@/components/ui/sonner"

import { Finish } from "./screens/Finish"
import { Gallery } from "./screens/Gallery"
import { Overview } from "./screens/Overview"
import { StepScreen } from "./screens/StepScreen"
import { useStore } from "./store"

export function App() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
      {s.screen === "gallery" && <Gallery />}
      {s.screen === "overview" && <Overview />}
      {s.screen === "step" && <StepScreen />}
      {s.screen === "finish" && <Finish />}
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
```

`Finish` появляется в Task 8. Проверка типов этой задачи проходит после Task 7 и Task 8, коммит общий в конце Task 8.

---

### Task 7: Шторки патча, результата и Explain

**Files:**
- Create: `.../sheets/PatchSheet.tsx`, `.../sheets/ResultSheet.tsx`, `.../sheets/ExplainSheet.tsx`

- [ ] **Step 1: PatchSheet**

`.../sheets/PatchSheet.tsx`:

```tsx
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS, type Patch } from "../data"
import { useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { PatchDiff } from "../ui/PatchDiff"
import { Typed } from "../ui/Typed"

function Body({ patch }: { patch: Patch }) {
  const { dispatch } = useStore()
  const [ready, setReady] = useState(false)
  return (
    <>
      <div className="min-h-0 overflow-y-auto px-4">
        <p className="text-body">
          <Typed key={patch.summary} text={patch.summary} onDone={() => setReady(true)} />
        </p>
        {ready && <PatchDiff patch={patch} className="mt-3" />}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
          Discard
        </Button>
        <Button className="h-11 flex-1" disabled={!ready} onClick={() => dispatch({ type: "apply" })}>
          Apply
        </Button>
      </DrawerFooter>
    </>
  )
}

export function PatchSheet() {
  const { s, dispatch } = useStore()
  const patch = STEPS[s.step].patch
  const open = s.phase === "patch" && s.sheet && !!patch
  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent className="max-h-[72dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Patch for this step</DrawerTitle>
          <AssistantHead />
        </DrawerHeader>
        {patch && open && <Body patch={patch} />}
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 2: ResultSheet**

`.../sheets/ResultSheet.tsx`:

```tsx
import { CircleAlert, CircleCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { PROGRAM_ID, STEPS } from "../data"
import { lastResult, useStore } from "../store"

export function ResultSheet({ onUndo }: { onUndo: () => void }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const r = lastResult(s)
  const open = s.sheet && (s.phase === "passed" || s.phase === "failed") && r !== null
  const last = s.step === STEPS.length - 1

  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent>
        {r?.ok ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2 text-title text-success">
                <CircleCheck className="size-5" />
                Step passed
              </DrawerTitle>
              <DrawerDescription className="text-body text-muted-foreground">{r.note}</DrawerDescription>
            </DrawerHeader>
            {step.deploy && (
              <div className="mx-4 rounded-control bg-surface-raised p-3 text-caption">
                <p className="text-subtle">Program id</p>
                <p className="mt-0.5 font-mono break-all text-foreground">{PROGRAM_ID}</p>
                <p className="mt-2 text-primary underline underline-offset-2">View on Explorer (devnet)</p>
              </div>
            )}
            <DrawerFooter className="pb-[max(env(safe-area-inset-bottom),16px)]">
              {s.undo && (
                <p className="text-center text-caption text-subtle">
                  Applied ·{" "}
                  <button type="button" className="underline underline-offset-2" onClick={onUndo}>
                    Undo
                  </button>
                </p>
              )}
              <Button className="h-11" onClick={() => dispatch({ type: "next" })}>
                {last ? "Finish tutorial" : `Step ${s.step + 2}: ${STEPS[s.step + 1].title}`}
              </Button>
            </DrawerFooter>
          </>
        ) : r ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2 text-title text-error">
                <CircleAlert className="size-5" />
                Not yet
              </DrawerTitle>
              <DrawerDescription className="text-body text-muted-foreground">{s.error?.reason}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pb-[max(env(safe-area-inset-bottom),16px)]">
              <div className="flex gap-2">
                <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "retry" })}>
                  Try again
                </Button>
                <Button className="h-11 flex-1" onClick={() => dispatch({ type: "explain", mode: "error" })}>
                  Explain
                </Button>
              </div>
              <Button variant="ghost" className="h-11 text-muted-foreground" onClick={onUndo}>
                Undo patch
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 3: ExplainSheet**

`.../sheets/ExplainSheet.tsx`:

```tsx
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

import { STEPS, type Chip } from "../data"
import { useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { PatchDiff } from "../ui/PatchDiff"
import { Typed } from "../ui/Typed"

function Body({ mode }: { mode: "step" | "error" }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const withFix = mode === "error" && !!step.fix
  const [ready, setReady] = useState(false)
  const [asked, setAsked] = useState<Chip[]>([])
  const [free, setFree] = useState(false)
  const text = withFix ? step.explainError ?? "" : step.explainStep
  const left = step.chips.filter((c) => !asked.includes(c))

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <p className="text-body">
          <Typed key={text} text={text} onDone={() => setReady(true)} />
        </p>
        {ready && withFix && step.fix && <PatchDiff patch={step.fix} className="mt-3" />}
        {asked.map((c) => (
          <div key={c.label} className="mt-4">
            <p className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">{c.label}</p>
            <p className="mt-2 text-body">
              <Typed key={c.answer} text={c.answer} />
            </p>
          </div>
        ))}
        {ready && (
          <div className="mt-4 flex flex-wrap gap-2 pb-2">
            {left.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setAsked((a) => [...a, c])}
                className="h-9 rounded-full border border-border-strong px-3 text-caption text-muted-foreground"
              >
                {c.label}
              </button>
            ))}
            {!free && (
              <button
                type="button"
                onClick={() => setFree(true)}
                className="h-9 rounded-full border border-border-strong px-3 text-caption text-muted-foreground"
              >
                Ask something else
              </button>
            )}
          </div>
        )}
        {free && (
          <div className="pb-2">
            <Input autoFocus placeholder="Ask about this step..." className="h-11" />
            <p className="mt-1.5 text-caption text-subtle">Free chat is off in this prototype.</p>
          </div>
        )}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(env(safe-area-inset-bottom),16px)]">
        {withFix ? (
          <>
            <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
              Discard
            </Button>
            <Button className="h-11 flex-1" disabled={!ready} onClick={() => dispatch({ type: "apply" })}>
              Apply and build
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
            Got it
          </Button>
        )}
      </DrawerFooter>
    </>
  )
}

export function ExplainSheet() {
  const { s, dispatch } = useStore()
  const open = s.phase === "explain" && s.sheet
  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent className="h-[82dvh] max-h-[82dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Assistant explains</DrawerTitle>
          <AssistantHead />
        </DrawerHeader>
        {open && <Body key={`${s.step}-${s.explain}`} mode={s.explain} />}
      </DrawerContent>
    </Drawer>
  )
}
```

---

### Task 8: Финиш и первый полный проход

**Files:**
- Create: `.../screens/Finish.tsx`

- [ ] **Step 1: Finish**

`.../screens/Finish.tsx`:

```tsx
import { Anchor, Check, X } from "lucide-react"
import { toast } from "sonner"

import { Achievement, AchievementLabel, AchievementMedia } from "@/components/ui/achievement"
import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"

import { NEXT_TUTORIAL, STEPS, thumb } from "../data"
import { useStore } from "../store"
import { TopBar } from "../ui/TopBar"

export function Finish() {
  const { s, dispatch } = useStore()
  const passed = s.passed.filter(Boolean).length
  const firstTry = s.firstTry.filter(Boolean).length
  const minutes = s.startedAt && s.finishedAt ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) : 1

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-6">
        <Achievement className="mx-auto w-auto">
          <AchievementMedia className="size-20">
            <Anchor />
          </AchievementMedia>
          <AchievementLabel>First Anchor program</AchievementLabel>
        </Achievement>
        <h2 className="mt-4 text-center font-heading text-display">Tutorial complete</h2>
        <p className="mt-1 text-center text-body text-muted-foreground">Your first Anchor program is live on devnet.</p>

        <dl className="mt-6 grid grid-cols-3 gap-2">
          {[
            { v: `${passed}/${STEPS.length}`, l: "steps" },
            { v: String(firstTry), l: "first try" },
            { v: `${minutes} min`, l: "time" },
          ].map((t) => (
            <div key={t.l} className="rounded-panel bg-surface-panel p-3 text-center">
              <dt className="sr-only">{t.l}</dt>
              <dd className="font-heading text-title">{t.v}</dd>
              <dd className="text-caption text-subtle">{t.l}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-caption text-subtle">What you learned</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {STEPS.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-body">
              <Check className="mt-1 size-4 shrink-0 text-success" />
              {step.learned}
            </li>
          ))}
        </ul>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-center gap-3">
          <img src={thumb(NEXT_TUTORIAL.slug, NEXT_TUTORIAL.ext)} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-caption text-subtle">
              Up next · {NEXT_TUTORIAL.level} · {NEXT_TUTORIAL.framework}
            </p>
            <p className="truncate text-control">{NEXT_TUTORIAL.name}</p>
          </div>
        </div>
        <BrandButton variant="accent" className="mt-3 h-11 w-full" onClick={() => toast("Only Hello Anchor is in this prototype")}>
          Start {NEXT_TUTORIAL.name}
        </BrandButton>
        <Button variant="ghost" className="mt-1 h-11 w-full text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          Back to tutorials
        </Button>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: без вывода. Если ругается на `Spinner` без `className` или на пропсы Drawer, сверить с `src/components/ui/spinner.tsx` и `drawer.tsx`.

- [ ] **Step 3: Полный проход в браузере на 390 px**

`http://localhost:5173/prototype/tutorial/?embed`, вкладка 390×844:
1. Галерея → Hello Anchor → Start. Экран шага 1, строка 1 подсвечена фиолетовым.
2. «?» открывает Explain по шагу, чипы «Why is this needed», «Show in docs», «Ask something else». «Got it» закрывает.
3. «Write this step with the assistant»: текст печатается, потом появляется дифф `src/lib.rs +13 −1`, Apply активен только после печати.
4. Apply → «Building...» 2,4 с → шторка «Not yet», строка 9 красная, во вкладке Build ошибка E0412.
5. Explain → объяснение, дифф `+3`, «Apply and build» → «Step passed», внизу «Applied · Undo».
6. Undo → тост «Patch undone», код снова `// Import anchor`, сегмент шага серый.
7. Пройти шаг 1 заново, шаг 2 «Deploy to devnet» (3 этапа, program id), шаг 3 (вкладка `client.ts`), шаг 4.
8. «Finish tutorial» → финиш: 4/4, first try 3, время, 4 пункта «What you learned», Counter PDA.
9. Перезагрузить посреди шага 3: галерея показывает «Continue · Step 3 of 4 · Client», обзор отмечает шаги 1 и 2.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/tutorial
git commit -m "Экран шага, шторки патча, проверки и Explain, финиш"
```

---

### Task 9: Проверка на 320, 390, 430 и десктопе

**Files:**
- Modify: любые файлы из `.../` по итогам проверки

- [ ] **Step 1: Ширины**

Повторить проход из Task 8 Step 3 на 320×568, 390×844 и 430×932, затем на десктопе в рамке.
Проверить на каждой ширине:
1. Нет горизонтального скролла ни на одном экране (`document.documentElement.scrollWidth === innerWidth` в консоли).
2. Задание шага помещается в 3 строки, «Checked when» не обрезано.
3. Кнопка нижней панели на шаге 2 («Step 3: Client» и Undo) не переносится. Если переносится на 320, сократить подпись до «Next: Client».
4. Шторки не выше 82% экрана, задание шага видно над шторкой патча.
5. Все кнопки не меньше 44 px по высоте.

- [ ] **Step 2: Контраст**

Через DevTools (Inspect, Contrast) проверить пары `text-subtle` на `bg-surface-panel` и `text-muted-foreground` на `bg-popover`. Если ниже 4.5:1 для текста 13 px, заменить `text-subtle` на `text-muted-foreground` в этом месте.

- [ ] **Step 3: Сборка прототипа**

Run: `npm run build:prototype`
Expected: `dist-prototype/prototype/tutorial/index.html` и `dist-prototype/prototype/thumbs/` созданы, ошибок нет.

- [ ] **Step 4: Commit**

```bash
git add -A src/prototype/tutorial
git commit -m "Прототип проверен на 320, 390, 430 и в рамке"
```

---

### Task 10: Ссылка для Кэт (только после ок Алмаза)

Не начинать, пока Алмаз в чате явно не скажет деплоить. Деплой публикует прототип наружу.

**Files:**
- Create: `/Users/almaz.zaripov/Documents/Claude Code/Playground/pg-prototype-deploy/middleware.ts`
- Create: `/Users/almaz.zaripov/Documents/Claude Code/Playground/pg-prototype-deploy/vercel.json`
- Create: `/Users/almaz.zaripov/Documents/Claude Code/Playground/pg-prototype-deploy/package.json`

Папка деплоя лежит вне репозитория: в `design-system` уже есть своя привязка к Vercel для сайта ДС, её не трогаем.

- [ ] **Step 1: Обёртка деплоя**

`pg-prototype-deploy/package.json`:

```json
{
  "name": "pg-tutorial-prototype",
  "private": true,
  "scripts": { "build": "echo prebuilt" }
}
```

`pg-prototype-deploy/vercel.json`:

```json
{
  "outputDirectory": "public",
  "redirects": [{ "source": "/", "destination": "/prototype/tutorial/", "permanent": false }],
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }]
}
```

`pg-prototype-deploy/middleware.ts`:

```ts
// Basic auth in front of every path. Credentials live in the project's env vars
export const config = { matcher: "/:path*" }

export default function middleware(request: Request) {
  const user = process.env.PROTO_USER
  const pass = process.env.PROTO_PASS
  const given = request.headers.get("authorization") ?? ""
  if (user && pass && given === `Basic ${btoa(`${user}:${pass}`)}`) return
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Playground prototype"', "X-Robots-Tag": "noindex, nofollow" },
  })
}
```

- [ ] **Step 2: Собрать и положить в обёртку**

```bash
npm run build:prototype
rm -rf "../../pg-prototype-deploy/public" && cp -R dist-prototype "../../pg-prototype-deploy/public"
```

- [ ] **Step 3: Проект в Vercel в аккаунте hoodies**

Из папки `pg-prototype-deploy`: `vercel link` (scope hoodies, новый проект `pg-tutorial-prototype`), затем завести `PROTO_USER` и `PROTO_PASS` через `vercel env add` для Production и Preview. Пароль генерирует Алмаз или Claude и кладёт только в env, в чат и в файлы не пишет. Затем `vercel deploy --prod`.

- [ ] **Step 4: Измерить барьер**

Анонимно, без пароля:

```bash
for p in / /prototype/tutorial/ /prototype/thumbs/hello-anchor.jpg /nope; do curl -s -o /dev/null -D - "https://<домен>$p" | grep -iE "^HTTP|x-robots-tag"; done
```

Expected: на всех четырёх `401` и `x-robots-tag: noindex, nofollow`. Любой `200` без пароля значит, что барьер не работает. Тогда ссылку не отдавать и чинить.

- [ ] **Step 5: Отдать ссылку Алмазу**

Ссылку дать в чате. Пароль Алмаз передаёт Кэт сам.
