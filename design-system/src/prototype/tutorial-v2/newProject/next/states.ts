import type { OpenProject } from "../../programs/project"
import type { NextStateId } from "../design"
import { SAMPLE_LINK, SAMPLE_PROGRAMS, SAMPLE_REPO } from "./data"
import { INITIAL, type FirstLightState } from "./model"

/* What each forced state of the bar seeds (CONSENSUS.md, section 7). The dialog opens there and runs
   live from it. The landing states open no dialog: they land in the shell instead */

/** Where focus lands when the dialog opens */
export type Focus = "card" | "search" | "url" | "box" | "retry"

export type Seed = { patch?: Partial<FirstLightState>; focus?: Focus; express?: boolean }

const VOTE = "A vote with yes and no, where each wallet can vote once."
const FAILED = { state: "failed", error: "Error: Already exists", details: false } as const
const example = (patch: Partial<FirstLightState["examples"]>) => ({ source: "example" as const, examples: { ...INITIAL.examples, programs: "ready" as const, ...patch } })
const importing = (i: FirstLightState["import"]) => ({ source: "import" as const, import: i })
const failedAt = (url: string, kind: "not-found" | "not-found-signed-in" | "private" | "no-program" | "rate-limited" | "too-large" | "broke", at: 0 | 1 | 2, loaded?: number) =>
  importing({ state: "failed", url, kind, at, loaded, details: false })

export const SEEDS: Record<Exclude<NextStateId, `landing-${string}`>, Seed> = {
  live: { focus: "card" },
  idle: { focus: "card" },
  "starter-native": { patch: { framework: "native" }, focus: "card" },
  "starter-seahorse": { patch: { framework: "seahorse" }, focus: "card" },
  "starter-client": { patch: { framework: "ts-client" }, focus: "card" },
  creating: { patch: { run: { state: "creating" } }, focus: "card" },
  "create-failed": { patch: { run: FAILED }, focus: "retry" },
  "create-failed-details": { patch: { run: { ...FAILED, details: true } }, focus: "retry" },
  "express-failed": { patch: { run: FAILED }, focus: "retry", express: true },
  "example-ready": { patch: example({}), focus: "search" },
  "example-picked": { patch: example({ picked: "counter" }), focus: "card" },
  "example-downloading": { patch: { ...example({ picked: "spl-memo" }), run: { state: "creating", copy: { step: 1, loaded: 12 } } } },
  "examples-loading": { patch: example({ programs: "loading" }), focus: "search" },
  "examples-failed": { patch: example({ programs: "failed" }), focus: "search" },
  "examples-no-match": { patch: example({ query: "token swap" }), focus: "search" },
  "import-empty": { patch: importing({ state: "empty" }), focus: "url" },
  "import-not-github": { patch: importing({ state: "typed", url: "gitlab.com/acme/escrow" }), focus: "url" },
  "import-typed": { patch: importing({ state: "typed", url: SAMPLE_LINK }), focus: "url" },
  "import-fetching": { patch: importing({ state: "fetching", url: SAMPLE_LINK, step: 2, loaded: 14, total: 24, found: 1, program: SAMPLE_PROGRAMS[0] }) },
  "import-choose": { patch: importing({ state: "choose", url: SAMPLE_REPO, programs: SAMPLE_PROGRAMS }), focus: "card" },
  "import-not-found": { patch: failedAt("https://github.com/acme/escrow-suite", "not-found", 0), focus: "retry" },
  "import-not-found-signed-in": { patch: failedAt("https://github.com/acme/escrow-suite", "not-found-signed-in", 0), focus: "retry" },
  "import-private": { patch: failedAt("https://github.com/acme/private-vault", "private", 0), focus: "retry" },
  "import-no-program": { patch: failedAt("https://github.com/acme/website", "no-program", 1), focus: "retry" },
  "import-rate-limited": { patch: failedAt(SAMPLE_LINK, "rate-limited", 0), focus: "url" },
  "import-too-large": { patch: failedAt("https://github.com/solana-labs/solana-program-library", "too-large", 1), focus: "retry" },
  "import-failed": { patch: failedAt(SAMPLE_LINK, "broke", 2, 9), focus: "retry" },
  "import-offline": { patch: importing({ state: "empty" }), focus: "retry" },
  "describe-empty": { patch: { source: "describe" }, focus: "box" },
  "describe-typed": { patch: { source: "describe", describe: { text: VOTE } }, focus: "box" },
  "describe-sending": { patch: { source: "describe", describe: { text: VOTE }, run: { state: "creating" } } },
  "describe-off": { patch: { source: "describe" }, focus: "retry" },
  "describe-limit": { patch: { source: "describe" }, focus: "retry" },
  offline: { focus: "card" },
  "signed-in": { focus: "card" },
  "session-ended": { focus: "card" },
  "into-empty": { patch: { into: "my-project" }, focus: "card" },
}

/** The landing states: what each passes to the shell, and which hint it shows */
export const LANDINGS: Record<Extract<NextStateId, `landing-${string}`>, OpenProject> = {
  "landing-hint": { name: "anchor-project-2", framework: "anchor", source: "starter", openFile: "src/lib.rs" },
  "landing-express": { name: "anchor-project-2", framework: "anchor", source: "starter", openFile: "src/lib.rs", firstRun: true, build: true },
  "landing-import": { name: "counter-2", framework: "anchor", source: "import", openFile: "README.md" },
  "landing-describe": { name: "anchor-project-2", framework: "anchor", source: "describe", prompt: VOTE },
}

export const isLanding = (id: NextStateId): id is keyof typeof LANDINGS => id in LANDINGS
