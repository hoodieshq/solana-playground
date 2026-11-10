import { holds, lineOf } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import { SYSTEM_CPI, inUse, noSystemProgram, sentSoFar, signatureOf } from "./records"
import type { Lesson, Rec, RecSend, Sent, SpecialCheck, Step, Tx } from "./types"

// Tiny Adventure: one level every player shares, an account at the PDA "level1" holding where the
// character stands, 0 to 3. Step 1 picks the seeds (the planned failure: the payer isn't `mut`), step 2
// meets rent when the level starts on devnet, step 3 moves the character and keeps it in bounds. After
// Jonas Hahn's Tiny Adventure. The first lesson to draw the game card, in its `world` view

const PROGRAM_ID = "7qWjjjsmTuR5H35buf7dsMfXqffmbPZyhmhKuPj3Hn2K"
const IDL_ACCOUNT = "wfu5VZdMR9Hy79Ksyd3hB37d9RZbwmHuwBBTDMP9h5Zy"
/** The level's address: the PDA from "level1" alone, the same for every player */
export const LEVEL_PDA = "9pWq3xdXmhZPuqRFK3qF3MMoZZqZDVBsjd77wTbFh7Kd"
const START_SIGNATURE = "MXwuZHhjdbR57DsjHVDhhwDZVb7MZBTFX37KHqjMZMmM3DHdwVTwq7PBmKM9FhMdKdo5jB3ZHbyMbZjMR3H7bKX5"

/** The level's rent: 9 bytes, (128 + 9) × 6,960 lamports */
const RENT = 0.00095352

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const END = `/// The last tile of the level
const END: u8 = 3;`

const INIT_FN = `    pub fn init_level(_ctx: Context<InitLevel>) -> Result<()> {
        msg!("A journey begins!");
        msg!("o.......");
        Ok(())
    }`

const LEFT_FN = `    pub fn move_left(ctx: Context<Move>) -> Result<()> {
        let level = &mut ctx.accounts.level;
        if level.position > 0 {
            level.position -= 1;
        }
        draw(level.position);
        Ok(())
    }`

const RIGHT_FN = `    pub fn move_right(ctx: Context<Move>) -> Result<()> {
        let level = &mut ctx.accounts.level;
        if level.position < END {
            level.position += 1;
        }
        draw(level.position);
        Ok(())
    }`

const DRAW = `/// The level as one log line, the character on its tile
fn draw(position: u8) {
    match position {
        0 => msg!("o......."),
        1 => msg!("..o....."),
        2 => msg!("....o..."),
        _ => msg!("......\\\\o/ You reached the end!"),
    }
}`

const MUT = `    #[account(mut)]`

const initAccounts = (mut: boolean) => `#[derive(Accounts)]
pub struct InitLevel<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + GameData::INIT_SPACE,
        seeds = [b"level1"],
        bump,
    )]
    pub level: Account<'info, GameData>,${mut ? `\n${MUT}` : ""}
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const MOVE = `#[derive(Accounts)]
pub struct Move<'info> {
    #[account(mut, seeds = [b"level1"], bump)]
    pub level: Account<'info, GameData>,
}`

const GAME_DATA = `#[account]
#[derive(InitSpace)]
pub struct GameData {
    pub position: u8,
}`

type Parts = { data?: boolean; init?: "broken" | "fixed"; module?: boolean; right?: boolean; left?: boolean }

/** lib.rs with the pieces written so far, each in its place. Step 3's `move_right` comes with `END`,
 * `draw` and `Move`, which sit apart in the file, so each write is placed by the file right after it */
function lib(p: Parts) {
  const fns = [INIT_FN, ...(p.left ? [LEFT_FN] : []), ...(p.right ? [RIGHT_FN] : [])]
  const module = `#[program]\nmod tiny_adventure {\n    use super::*;\n\n${fns.join("\n\n")}\n}`
  return [BOIL, p.right && END, p.module && module, p.right && DRAW, p.init && initAccounts(p.init === "fixed"), p.right && MOVE, p.data && GAME_DATA].filter(Boolean).join("\n\n")
}

const S1 = { data: true, init: "fixed", module: true } as const
const LIB_BROKEN = lib({ ...S1, init: "broken" })
const LIB_S1 = lib(S1)
const LIB_RIGHT = lib({ ...S1, right: true })
const LIB_S3 = lib({ ...S1, right: true, left: true })

/** The init field the planned failure points at, as Anchor 1.x does, and the payer under it */
const LEVEL_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "pub level: Account<'info, GameData>,") + 1

const EXPLAIN_ERROR = `\`payer = signer\` takes the new account's deposit out of your wallet, so your wallet's balance changes. Anchor needs every account that changes marked \`mut\`, and \`signer\` on line ${LEVEL_LINE + 1} isn't. The error points at \`level\`, the account being paid for; the fix goes on its payer.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID, 4).replace("…", "…⁠")} in place · from your wallet`

const PDA_CHIP = {
  label: "What is a PDA?",
  match: /\bpdas?\b|program derived/i,
  answer:
    "A Program Derived Address: an address made from seeds and the program id instead of a key pair. Nobody holds a private key for it, so only your program can sign for it, and anyone can find it again from the same seeds.",
}

const STEPS: Step[] = [
  {
    id: "world",
    title: "A shared world",
    short: "World",
    objective: "Keep the level in one account every player shares",
    learned: "A world everyone shares is one account at a PDA whose seeds hold no wallet",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as Hello Anchor: the import and the program's id. They're routine, so I've written them.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "The whole game state is one number: where the character stands, 0 to 3. A program keeps nothing between calls, so the number lives in an account. `#[account]` marks `GameData` as its data, and `InitSpace` counts its bytes: 1.",
        writes: { file: LIB, block: GAME_DATA, ref: lib({ data: true }) },
      },
      {
        kind: "say",
        id: "s1.shared",
        text: "In this game there is one level, and everyone who plays moves the same character. `init` creates the account at an address worked out from seeds, so the seeds decide who shares it.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "Everyone should walk the same character. What should the level's address come from?",
        options: ['`"level1"` and the signer\'s wallet', "A new key pair, made when the level starts", 'Only `"level1"`, and the program id'],
        code: false,
        answer: 2,
        right: 'Yes. No wallet in the seeds means one address for everyone: any client works it out from `"level1"` and your program id. I\'ve written `InitLevel` with those seeds.',
        why: [
          "With the wallet in the seeds every player gets a level of their own, and walks alone.",
          "Then the address is random, and every player would have to be told it. Seeds let anyone find the level again.",
          null,
        ],
        hint: "What should the address depend on, if it's the same for every player?",
        writes: { file: LIB, block: initAccounts(false), ref: lib({ data: true, init: "broken" }) },
        key: 'seeds = [b"level1"],',
        typed: 'That\'s the line: `"level1"` and nothing else, so everyone gets the same address. I\'ve written the rest of `InitLevel` around it.',
      },
      {
        kind: "write",
        id: "s1.init",
        text: "And `init_level`, which creates the level. A new account starts zeroed, so the character is already on tile 0; it only logs the start.",
        writes: { file: LIB, block: `#[program]\nmod tiny_adventure {\n    use super::*;\n\n${INIT_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's the level. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who pays for their first account meets this error, so let's meet it now.",
    plannedShort: "`signer` pays for `level`, and an account whose balance changes has to be `mut`.",
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: LEVEL_LINE, mark: "level", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `signer` need?",
        options: ["`#[account(mut)]` on the line above `pub signer`", "`mut` on `level`, where the error points", "More SOL in your wallet"],
        code: false,
        answer: 0,
        right: "Exactly. With `mut`, your wallet goes into the transaction as writable, and `init` can take the deposit from it. I've put it above `signer`.",
        why: [
          null,
          "`init` already makes `level` writable. The error points at the account being created; what's missing is on the account that pays for it.",
          "Your wallet gets its SOL at the deploy, and this error comes from the build, before anything is sent.",
        ],
        hint: "Which account's balance changes when the level is created?",
        writes: { file: LIB, block: MUT, ref: LIB_S1 },
        key: "#[account(mut)]",
        typed: "That's the line. Now your wallet can pay the deposit.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, the payer marked `mut`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your level has an address",
      line: "The build wrote the IDL: one instruction, `init_level`, and `GameData` at 9 bytes, 8 for the discriminator and 1 for the position.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the level's account and `init_level`, which creates it at a PDA every player shares. You pick the seeds. The first build fails on purpose: the wallet that pays for the account has to be `mut`.",
    chips: [
      PDA_CHIP,
      {
        label: "What is the discriminator?",
        match: /\bdiscriminator\b/i,
        answer: "8 bytes Anchor puts at the start of every account it creates, so it can tell a `GameData` from any other account your program owns.",
      },
    ],
    errorChips: [
      {
        label: "What does mut do?",
        match: /\bmut\b/i,
        answer: "It tells Anchor the instruction changes the account, so it goes into the transaction as writable and is saved after. A payer's balance changes, so it needs it.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints), under `init` and `payer`.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "start",
    title: "Start the level",
    short: "Start",
    objective: "Deploy, and create the level on devnet",
    learned: "An account costs a deposit for its bytes, rent, paid by whoever creates it",
    file: LIB,
    start: LIB_S1,
    target: LIB_S1,
    goal: "send",
    beats: [
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Your program is built, but it isn't on devnet yet. Deploy it, and anyone can call it.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "say",
        id: "s2.rent",
        text: "Now the level itself. Creating an account isn't free: the network keeps its bytes on every validator, so whoever creates it puts down a deposit.",
      },
      {
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "Your level is 9 bytes. What does creating it cost?",
        options: ["Nothing. Accounts on Solana are free", "A deposit for its 9 bytes, about 0.00095 SOL, which comes back if the account is closed", "A small fee every time someone moves"],
        code: false,
        answer: 1,
        right: "Yes. It's called rent: a deposit sized by the account's bytes, taken from the payer, here your wallet. Close the account and it comes back.",
        why: [
          "Every account holds a deposit for its bytes. Without one, the network would fill up with accounts nobody needs.",
          null,
          "Each move pays a transaction fee, 0.000005 SOL, but that's for the transaction. Keeping the account is the deposit.",
        ],
        hint: "Think about who keeps those 9 bytes, and for how long.",
        skipped: "No problem. It's rent: a deposit for the account's 9 bytes, about 0.00095 SOL, from your wallet. Let's see it.",
      },
      {
        kind: "act",
        id: "s2.start",
        act: "send",
        ix: "init_level",
        say: "Start the level. Your wallet pays the deposit and the fee.",
        title: "Start the level",
        context: "Sends `init_level` · rent and fee from your wallet",
        button: "Start",
        record: "Started the level",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your level is on devnet",
      line: "That's the account, read back from devnet: the character on tile 0. The deposit, 0.00095 SOL, sits in it for as long as the level exists.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "Rent 0.00095 SOL" },
        { icon: "braces", text: "9 bytes" },
      ],
      extra: "openTest",
    },
    testWin: "You called `init_level` from the Call panel. Its address came from the seeds, so you didn't type it.",
    explainStep: "This step puts the program on devnet and starts the level: `init_level` creates its account, and your wallet pays the deposit for its bytes.",
    chips: [
      {
        label: "What is rent?",
        match: /\brent\b/i,
        answer: "Every account holds a deposit of SOL for the bytes it takes, about 0.00095 SOL for these 9. It isn't spent: close the account and it comes back.",
      },
      {
        label: "Can anyone else start it?",
        match: /\b(anyone|someone|else|other)\b/i,
        answer: "Not twice: `init` refuses an account that already exists, so a second `init_level` fails with `already in use`. Anyone with your program id can move the character, as you'll see.",
      },
    ],
  },
  {
    id: "move",
    title: "Move",
    short: "Move",
    objective: "Move the character, and keep it inside the level",
    learned: "An instruction changes the account, and keeps its numbers in bounds",
    file: LIB,
    start: LIB_S1,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.what",
        text: "The character stands on tile 0, and nothing moves it yet. Two instructions will, `move_right` and `move_left`, each changing `position` by one.",
      },
      {
        kind: "write",
        id: "s3.right",
        text: "`move_right` first. It stops at the last tile, `END`, and draws the level in the program log, so every move leaves a picture of where you are.",
        writes: { file: LIB, block: LIB_RIGHT, ref: LIB_RIGHT },
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "What should `move_left` do at position 0?",
        options: ["level.position -= 1;", "level.position = level.position.wrapping_sub(1);", "if level.position > 0 { level.position -= 1; }"],
        code: true,
        answer: 2,
        right: "Right. At 0 it stays put and draws the level as it is. A `u8` can't go below zero, so the check has to come first. I've written `move_left` around it.",
        why: [
          "At 0 that goes below zero. A `u8` can't, and Playground builds with overflow checks, so the move fails with `attempt to subtract with overflow`.",
          "That doesn't fail, it wraps: 0 minus 1 becomes 255, and the character lands 252 tiles past the end.",
          null,
        ],
        hint: "`position` is a `u8`: 0 to 255, never negative.",
        writes: { file: LIB, block: LEFT_FN, ref: LIB_S3 },
        key: "if level.position > 0 {",
        typed: "That's the check. I've written the rest of `move_left` around it.",
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Devnet still runs the program without moves. Build and deploy: it keeps its address, and the level keeps its account.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.move",
        act: "move",
        say: "Now walk. Anyone with your program id moves this same character: the level is one account for everyone.",
        title: "Walk the level",
        context: "Sends `move_right` or `move_left` · fee from your wallet",
        button: "Move right",
        moves: [
          { ix: "move_right", button: "Move right" },
          { ix: "move_left", button: "Move left" },
        ],
        record: "Walked the level",
      },
    ],
    win: {
      id: "s3.win",
      headline: "You walked to the end of the level",
      line: "{n} moves, {n} transactions, one account: `......\\o/` came back in the program log. Any wallet could have made them.",
      stats: [
        { icon: "zap", text: "{n} moves" },
        { icon: "cpu", text: "1,384 CU a move" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You walked to the end from the Call panel. `move_right` needed no address: Anchor found the level from its seeds.",
    explainStep: "This step adds `move_right` and `move_left`, which keep the character between tile 0 and tile 3, then walks the level on devnet from the card.",
    chips: [
      {
        label: "Who can move my character?",
        match: /\bwho\b.*\bmove\b|\bmy character\b/i,
        answer: "Anyone. `Move` asks for no signer, so whoever pays the fee can move it. Add a `Signer` and a check to make it yours.",
      },
      {
        label: "Why does a stuck move still cost a fee?",
        match: /\b(stuck|fee|cost)\b/i,
        answer: "The transaction still runs: it checks the bound, changes nothing and logs the level. Fees pay for running, not for changing.",
      },
    ],
  },
]

/** A payer that isn't `mut`, as Anchor 1.x reports it: the error points at the account `init` creates,
 * the planned failure. Any other `init` struct with a payer that isn't writable meets the same */
const payerNotMut: SpecialCheck = ({ code, bare, file, head, failed }) => {
  for (const m of bare.matchAll(/#\[account\(([\s\S]*?)\)\]\s*\n\s*pub\s+(\w+)/g)) {
    const payer = m[1].match(/\binit\b[\s\S]*?payer\s*=\s*(\w+)/)?.[1]
    if (!payer || new RegExp(`#\\[account\\(\\s*mut\\s*\\)\\]\\s*pub\\s+${payer}\\b`).test(bare)) continue
    const field = m[2]
    const line = lineOf(code, `pub ${field}:`)
    const row = code.split("\n")[line - 1] ?? ""
    const column = row.indexOf(field) + 1
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: field.length,
      log: [
        ...head,
        "error: the payer specified for an init constraint must be mutable.",
        ` --> ${file}:${line}:${column}`,
        "   |",
        `${line} | ${row.trimEnd()}`,
        `   | ${" ".repeat(column - 1)}${"^".repeat(field.length)}`,
        "Build failed",
      ],
      reason: `${failed}: \`${payer}\` pays for \`${field}\`, so it has to be \`mut\`.`,
      explain: EXPLAIN_ERROR,
    }
  }
  return null
}

const CHECKS: SpecialCheck[] = [payerNotMut, noSystemProgram]

// ---- The level: what the program does with it, worked out the way it would

const levelOf = (s: State) => s.records?.find((r) => r.id === "level") ?? null

/** The level as one log line, as `draw` writes it */
export const drawn = (position: number) => ["o.......", "..o.....", "....o...", "......\\o/ You reached the end!"][Math.min(position, 3)]

/** Whether the program on devnet has `ix` yet */
const has = (s: State, ix: string) => s.deployedLib !== null && holds(s.deployedLib, `pub fn ${ix}(ctx: Context<Move>) -> Result<()> {`)

/** One send, from a card or the Call panel. A second `init_level` is sent, not stopped: devnet refuses
 * it, as the chip says */
function send(s: State, ix: string): RecSend | { note: string } {
  const level = levelOf(s)
  const records = s.records ?? []
  const signature = records.length ? signatureOf(sentSoFar(s) + 21) : START_SIGNATURE
  if (ix === "init_level") {
    if (level) return { tx: inUse("init_level", LEVEL_PDA, signature), records, refused: "Already in use · the level stayed as it was" }
    const created: Rec = { id: "level", kind: "Level", pda: LEVEL_PDA, values: { position: 0 }, rent: RENT }
    const tx: Tx = { instruction: "init_level", said: drawn(0), signature, compute: 5712, inner: [...SYSTEM_CPI, "Program log: A journey begins!"] }
    return { tx, records: [created] }
  }
  if (ix === "move_right" || ix === "move_left") {
    if (!level) return { note: "Start the level first, with `init_level`." }
    if (!has(s, ix)) return { note: "Devnet still runs the program without moves. Build and deploy it first." }
    const at = Number(level.values.position)
    const position = ix === "move_right" ? Math.min(at + 1, 3) : Math.max(at - 1, 0)
    const tx: Tx = { instruction: ix, said: drawn(position), signature, compute: 1384 }
    return { tx, records: records.map((r) => (r.id === "level" ? { ...r, values: { ...r.values, position } } : r)) }
  }
  return { note: "That call has no card here." }
}

/** A move as the card lists it: where it went, and the level as the program drew it */
export function movedLine(x: Sent) {
  if (x.ix !== "move_right" && x.ix !== "move_left") return null
  const before = Number(x.snap.before.find((r) => r.id === "level")?.values.position ?? 0)
  const after = Number(x.snap.after.find((r) => r.id === "level")?.values.position ?? 0)
  const arrow = x.ix === "move_right" ? "→" : "←"
  return `${arrow} ${before === after ? "stays on" : ""} tile ${after} · ${drawn(after).replace(" You reached the end!", "")}`.replace("  ", " ")
}

/** Step 2 passes when the level starts, step 3 on a move that lands on the last tile */
const passes = (s: State, i: number, ix: string, tx: Tx) =>
  i === 1 ? ix === "init_level" && !tx.error : i === 2 ? ix === "move_right" && !tx.error && Number(levelOf(s)?.values.position) === 3 : false

/** Moves made from the card and the Call panel */
const movesOf = (s: State) =>
  s.thread.reduce(
    (n, t) => n + (t.kind === "act" ? (t.sends ?? []).filter((x) => x.ok && !x.via && x.ix.startsWith("move_")).length : t.kind === "result" && t.from === "test" && !!t.tx?.instruction.startsWith("move_") ? 1 : 0),
    0
  )

export const TINY_ADVENTURE: Lesson = {
  card: { slug: "tiny-adventure", name: "Tiny Adventure", level: "Beginner", framework: "Anchor", ext: "jpg" },
  minutes: 8,
  by: "Jonas Hahn",
  program: "tiny_adventure",
  line: "Build a tiny world on chain that every player shares",
  intro: "You'll build a game world every player shares: one level account at an address anyone can work out, a deposit to keep it on devnet, and moves that walk the character to the end.",
  proof: "Program log: ......\\o/ You reached the end!",
  badge: "Shared world",
  headline: "You built a world everyone shares",
  proofLine: () => "Your character stands at the end of `level1` on devnet, in one account any wallet can move.",
  // The next Beginner one in Anchor: the same level, with a chest of SOL at the end
  next: "tiny-adventure-two",
  nextLine: "Tiny Adventure Two is a good next one: your level gets a chest with 0.1 SOL in it, and the program pays it to whoever reaches the end.",
  steps: STEPS,
  // No client.ts: every move goes from the card, or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: START_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "init_level", said: drawn(0), signature: START_SIGNATURE, compute: 5712, inner: [...SYSTEM_CPI, "Program log: A journey begins!"] }),
  records: {
    title: "Level",
    one: "level",
    empty: "No level yet. Start sends `init_level`.",
    show: (r) => ({ label: "Level", seeds: '"level1"', fields: [["position", String(r.values.position)]] }),
    send: (s, ix) => send(s, ix),
    passes,
    args: () => ({}),
    check: () => null,
    view: "world",
    sentLine: (_s, x) => movedLine(x),
  },
  winVars: (s) => ({ n: String(Math.max(movesOf(s), 3)) }),
}
