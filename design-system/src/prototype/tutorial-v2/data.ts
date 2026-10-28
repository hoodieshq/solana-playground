import { AIRDROP, CLIENT, DEPLOY_COST, LIB, NO_ID, UPGRADE_COST, WALLET, shortKey } from "./lessons/common"
import { LESSONS } from "./lessons"
import type { Act, ActBeat, Beat, Lesson, Step, TutorialCard, Tx } from "./lessons/types"

// The lesson that's open, for the store and the screens. Each lesson lives in `lessons/`; this file
// holds the catalog and hands out the open one. The names below are live bindings: `openLesson`
// sets them before the store mounts, and every module that imported them reads the new lesson

export * from "./lessons/types"
export { AIRDROP, CLIENT, DEPLOY_COST, FAUCET_URL, LIB, NAME_MAX, NO_ID, TX_CONFIRMED, TX_FEE, UPGRADE_COST, WALLET, shortKey } from "./lessons/common"

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

const cardOf = (slug: string) => TUTORIALS.find((t) => t.slug === slug) ?? TUTORIALS[0]

/** Prototype switches for a review, each lasting for the browser tab: `?demo=files` opens a lesson
 * with the files a full Anchor workspace has besides the lesson's two (the tab overflow on a desktop,
 * Recent in the phone's file sheet); `?demo=faucet` makes the first deploy meet the devnet faucet's
 * limit (Not enough devnet SOL). `?demo=off` ends both */
function demoSwitch(name: string) {
  try {
    const q = new URLSearchParams(window.location.search).getAll("demo")
    const key = `pg-proto-demo-${name}`
    if (q.includes(name)) sessionStorage.setItem(key, "1")
    if (q.includes("off")) sessionStorage.removeItem(key)
    return sessionStorage.getItem(key) === "1"
  } catch {
    return false
  }
}
export const DEMO_FILES = demoSwitch("files")
export const DEMO_FAUCET = demoSwitch("faucet")

const EXTRA_FILES: Record<string, string> = {
  "tests/game.test.ts": `describe("game", () => {\n  it("creates a player", async () => {\n    // Filled in by the lesson's later steps\n  });\n});`,
  "migrations/deploy.ts": `// Runs after anchor deploy\nmodule.exports = async function (provider) {\n  anchor.setProvider(provider);\n};`,
  "app/game.ts": `// The game's front end talks to the program from here\nexport const RPC = "https://api.devnet.solana.com";`,
  "app/ui.ts": `// Draws the player's energy and wood\nexport function render() {}`,
  "Anchor.toml": `[provider]\ncluster = "devnet"\nwallet = "~/.config/solana/id.json"`,
  "Cargo.toml": `[workspace]\nmembers = ["programs/*"]\nresolver = "2"`,
  "package.json": `{\n  "name": "game",\n  "private": true\n}`,
  "tsconfig.json": `{\n  "compilerOptions": { "strict": true }\n}`,
  "README.md": `# Game\n\nBuilt in Solana Playground.`,
}

const filesOf = (l: Lesson) => (DEMO_FILES ? { ...l.files, ...EXTRA_FILES } : l.files)

export let LESSON: Lesson = LESSONS["hello-anchor"]
export let STEPS: Step[] = LESSON.steps
/** Every beat of the tutorial by id, the planned failure's too */
export let BEATS: Record<string, Beat> = beatsOf(LESSON)
export let INITIAL_FILES: Record<string, string> = filesOf(LESSON)
export let PROGRAM_ID = LESSON.programId
/** The account the deploy writes the IDL to, at an address derived from the program id, so Explorer
 * and any client find the interface from the program alone */
export let IDL_ACCOUNT = LESSON.idlAccount
export let TX_SIGNATURE = LESSON.txSignature
/** The tutorial the finish points to: the next one of the lesson's level, if there is one */
export let NEXT_TUTORIAL: TutorialCard | null = LESSON.next ? cardOf(LESSON.next) : null

function beatsOf(l: Lesson): Record<string, Beat> {
  return Object.fromEntries(l.steps.flatMap((s) => [...s.beats, ...(s.onFail ?? [])]).map((b) => [b.id, b]))
}

/** Every beat id of a lesson, open or not, its steps' wins too, which the win turns name: a save that
 * names one it no longer has is from an older script */
export const beatIdsOf = (slug: string) => {
  const l = LESSONS[slug] ?? LESSONS["hello-anchor"]
  return new Set([...Object.keys(beatsOf(l)), ...l.steps.map((s) => s.win.id)])
}

/** Makes `slug` the open lesson. Called before the store for it mounts, never while one is mounted */
export function openLesson(slug: string) {
  const l = LESSONS[slug] ?? LESSONS["hello-anchor"]
  LESSON = l
  STEPS = l.steps
  BEATS = beatsOf(l)
  INITIAL_FILES = filesOf(l)
  PROGRAM_ID = l.programId
  IDL_ACCOUNT = l.idlAccount
  TX_SIGNATURE = l.txSignature
  NEXT_TUTORIAL = l.next ? cardOf(l.next) : null
}

/** The step a beat belongs to */
export const stepOfBeat = (id: string) => STEPS.findIndex((s) => [...s.beats, ...(s.onFail ?? [])].some((b) => b.id === id))

/** The first act of a kind in the script: the card a nudge puts up again */
export const firstAct = (...acts: Act[]) => STEPS.flatMap((s) => s.beats).find((b): b is ActBeat => b.kind === "act" && acts.includes(b.act))

export const buildOk = () => ["$ anchor build", `Compiling ${LESSON.program} v0.1.0`, "Finished release [optimized] target(s) in 2.41s"]

const units = (n: number) => n.toLocaleString("en-US")

/** An instruction's name as the program logs it: `chop_tree` is ChopTree */
const pascal = (name: string) => name.replace(/\(.*$/, "").replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())

/** The program's lines in a transaction's logs, as `solana confirm -v` prints them. A custom error
 * ends them the way Anchor does: the error's code, number and message, then the failure */
export const programLog = (tx: Tx) => [
  `Program ${shortKey(PROGRAM_ID)} invoke [1]`,
  `Program log: Instruction: ${pascal(tx.instruction)}`,
  ...(tx.inner ?? []),
  ...(tx.said ? [`Program log: ${tx.said}`] : []),
  ...(tx.error
    ? (tx.error.log ?? [`Program log: AnchorError thrown in src/lib.rs:${tx.error.line}. Error Code: ${tx.error.name}. Error Number: ${tx.error.number}. Error Message: ${tx.error.message}.`])
    : []),
  `Program ${shortKey(PROGRAM_ID)} consumed ${units(tx.compute)} of 200,000 compute units`,
  tx.error
    ? `Program ${shortKey(PROGRAM_ID)} failed: ${tx.error.failed ?? `custom program error: 0x${tx.error.number.toString(16)}`}`
    : `Program ${shortKey(PROGRAM_ID)} success`,
]

/** Running the client prints what its last line logs, then the prototype runs that command for you,
 * so the transaction's logs follow the line that names them. `out` is what the client printed after */
export const clientLog = (tx: Tx, out: string[] = []) => [
  `$ run ${CLIENT}`,
  "Running client...",
  `Use 'solana confirm -v ${tx.signature}' to see the logs`,
  ...out,
  "Client finished",
  `$ solana confirm -v ${tx.signature}`,
  ...programLog(tx),
]

/** Calling hello with a name from the chat, written the way step 3's client calls it */
export const callLog = (tx: Tx, name: string) => [
  `$ pg.program.methods.hello(${JSON.stringify(name)}).rpc()`,
  "Sending transaction...",
  ...programLog(tx),
]

/** A call from the Call panel, printed like any other call: the command, then the logs. Nothing is
 * tested here, so the terminal doesn't say so */
export const panelLog = (tx: Tx, name: string | null) => [
  name === null ? `$ call ${tx.instruction.replace(/\(.*$/, "")}` : `$ call hello --name ${JSON.stringify(name)}`,
  "Sending transaction...",
  ...programLog(tx),
]

/** A wallet short of SOL is topped up from the faucet before the deploy, as Playground does */
export const fundLog = () => [`$ solana airdrop ${AIRDROP.replace(" SOL", "")} ${shortKey(WALLET)}`, "Requesting airdrop...", `Airdrop confirmed · balance ${AIRDROP}`]

/** The faucet said no: its limit for this address, for now */
export const faucetLog = () => [`$ solana airdrop ${AIRDROP.replace(" SOL", "")} ${shortKey(WALLET)}`, "Requesting airdrop...", "Error: airdrop request failed. This can happen when the rate limit is reached.", "Balance: 0 SOL"]

export const deployLog = (funded = false) => [
  ...(funded ? fundLog() : []),
  "$ deploy --network devnet",
  "Writing buffer... 100%",
  `Deploying from ${shortKey(WALLET)} · ${DEPLOY_COST}`,
  `Program Id: ${PROGRAM_ID}`,
  "Uploading IDL... 100%",
  `IDL account: ${IDL_ACCOUNT}`,
  "Deploy successful",
]

export const upgradeLog = () => [
  "$ deploy --network devnet",
  "Writing buffer... 100%",
  `Upgrading ${shortKey(PROGRAM_ID)} from ${shortKey(WALLET)} · ${UPGRADE_COST}`,
  `Program Id: ${PROGRAM_ID}`,
  "Upgrading IDL... 100%",
  `IDL account: ${IDL_ACCOUNT}`,
  "Upgrade successful",
]

/** The lib.rs a step builds, for the step's own file or the last lib.rs before it */
export const libOf = (i: number) => [...STEPS.slice(0, i + 1)].reverse().map(libTargetOf).find(Boolean) ?? ""

/** The client.ts a step runs: the last one the script writes up to it */
export const clientOf = (i: number) => [...STEPS.slice(0, i + 1)].reverse().map((s) => (s.file === CLIENT ? s.target : s.client)).find(Boolean) ?? ""

/** The lib.rs a step ends with: its target when lib.rs is its file, or the one it names besides */
export const libTargetOf = (s: Step) => (s.file === LIB ? s.target : s.lib)

export { NO_ID as PLACEHOLDER_ID }
